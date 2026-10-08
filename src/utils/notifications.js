import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import dayjs from 'dayjs'
import { saveData, loadData } from './storage'
import { t as translate } from './translations'
import { PREFS_KEY, normalizePrefs, applyPrefsUpdate, prefsFromLegacyPayload } from './notificationPrefs'
import { getUpcomingCycles, addDays } from './cycleEngine'

/**
 * Notification identifiers
 *  - 'cycle-*'  period / fertile / ovulation / late / daily-log / water reminders,
 *               fully owned by rescheduleCycleReminders()
 *  - 'med-<id>' one DAILY reminder per medication, owned by scheduleMedicationReminders()
 * Nothing in the app cancels ALL notifications except a full data reset.
 */
export const CHANNEL_ID = 'reminders'
export const CYCLE_PREFIX = 'cycle-'
export const MED_PREFIX = 'med-'
// Identifiers used by app versions <= 1.1.0 — cancelled on every reschedule.
const LEGACY_IDS = new Set([
  'period-2days', 'period-1day', 'period-today', 'ovulation-tomorrow',
  'ovulation-today', 'fertile-start', 'daily-log', 'water-reminder',
])

const defaultT = (key, replacements) => translate('en', key, replacements)

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// ── channel & permission ─────────────────────────────────────────────────────
/** Android 8+ needs a channel; Android 13+ needs one BEFORE asking permission. */
export const ensureAndroidChannel = async (t = defaultT) => {
  if (Platform.OS !== 'android') return
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t('notif_channel_name'),
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C2527A',
    })
  } catch (err) {
    console.error('Notification channel error:', err)
  }
}

export const requestNotificationPermission = async () => {
  if (!Device.isDevice) return false
  await ensureAndroidChannel()
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// 'granted' | 'denied' | 'undetermined'. Android 13+ reports a permission that
// was never requested as 'denied' with canAskAgain=true; treat that as
// 'undetermined' so the UI offers the system prompt instead of "blocked".
export const getNotificationPermission = async () => {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync()
    if (status === 'denied' && canAskAgain !== false) return 'undetermined'
    return status
  } catch {
    return 'undetermined'
  }
}

// ── prefs (single store, see notificationPrefs.js) ───────────────────────────
const prefsListeners = new Set()
let prefsChain = Promise.resolve()

/** Subscribe to prefs changes made through this module. Returns unsubscribe. */
export const subscribeNotificationPrefs = (fn) => {
  prefsListeners.add(fn)
  return () => prefsListeners.delete(fn)
}

export const loadNotificationPrefs = async () => normalizePrefs(await loadData(PREFS_KEY, null))

const writePrefs = (compute) => {
  const run = prefsChain.then(async () => {
    const current = await loadNotificationPrefs()
    const next = compute(current)
    await saveData(PREFS_KEY, next)
    prefsListeners.forEach(fn => { try { fn(next) } catch (e) { console.error(e) } })
    return next
  })
  prefsChain = run.catch(() => {})
  return run
}

/** Merge a partial (or updater fn) into the stored prefs. Resolves to the new prefs. */
export const updateNotificationPrefs = (partialOrFn) =>
  writePrefs(current => applyPrefsUpdate(
    current,
    typeof partialOrFn === 'function' ? partialOrFn(current) : partialOrFn,
  ))

// ── low-level scheduling ─────────────────────────────────────────────────────
const MIN_LEAD_MS = 60 * 1000

const scheduleAt = async (identifier, title, body, date, data) => {
  if (!(date instanceof Date) || date.getTime() <= Date.now() + MIN_LEAD_MS) return false
  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body, sound: true, data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    })
    return true
  } catch (err) {
    console.error('Schedule error:', identifier, err)
    return false
  }
}

// Repeats every day at a LOCAL hour:minute (survives DST / timezone travel).
const scheduleDaily = async (identifier, title, body, hour, minute, data) => {
  const h = Math.max(0, Math.min(23, Math.floor(Number(hour) || 0)))
  const m = Math.max(0, Math.min(59, Math.floor(Number(minute) || 0)))
  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body, sound: true, data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m, channelId: CHANNEL_ID },
    })
    return true
  } catch (err) {
    console.error('Schedule error:', identifier, err)
    return false
  }
}

const cancelWhere = async (predicate) => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(scheduled
      .map(n => n.identifier)
      .filter(id => id && predicate(id))
      .map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})))
  } catch (err) {
    console.error('Cancel error:', err)
  }
}

/** Cancel cycle reminders (and pre-1.2 identifiers). Medication reminders are untouched. */
export const cancelCycleReminders = () =>
  cancelWhere(id => id.startsWith(CYCLE_PREFIX) || LEGACY_IDS.has(id))

/** Cancels EVERYTHING (cycle + medication). Only for "delete all data". */
export const cancelAllScheduledNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch (err) {
    console.error('Cancel all error:', err)
  }
}

// ── cycle reminders ──────────────────────────────────────────────────────────
const CYCLES_AHEAD = 3
let rescheduleChain = Promise.resolve()

const doRescheduleCycleReminders = async (state, rawPrefs, t) => {
  await cancelCycleReminders()
  const prefs = normalizePrefs(rawPrefs)
  if (!prefs.enabled) return 0
  if ((await getNotificationPermission()) !== 'granted') return 0
  await ensureAndroidChannel(t)

  const at = (dateStr, time = prefs.time) =>
    dayjs(dateStr).hour(time.hour).minute(time.minute).second(0).millisecond(0).toDate()
  const jobs = []
  const add = (id, titleKey, bodyKey, dateStr, data, vars) =>
    jobs.push(() => scheduleAt(id, t(titleKey, vars), t(bodyKey, vars), at(dateStr), data))
  const periodData = { screen: 'Calendar', type: 'period' }

  if (state?.hasData) {
    getUpcomingCycles(state, CYCLES_AHEAD).forEach((c, i) => {
      if (prefs.periodReminder) {
        const n = prefs.periodDaysBefore
        if (n >= 2) add(`cycle-period-before-${i}`, 'notif_period_soon_title', 'notif_period_soon_body', addDays(c.periodStart, -n), periodData, { days: n })
        if (n >= 1) add(`cycle-period-1day-${i}`, 'notif_period_tomorrow_title', 'notif_period_tomorrow_body', addDays(c.periodStart, -1), periodData)
        add(`cycle-period-day-${i}`, 'notif_period_today_title', 'notif_period_today_body', c.periodStart, periodData)
      }
      if (prefs.lateReminder) {
        add(`cycle-late-${i}`, 'notif_period_late_title', 'notif_period_late_body', addDays(c.periodStart, 2), periodData, { days: 2 })
      }
      if (prefs.periodEndReminder) {
        add(`cycle-period-end-${i}`, 'notif_period_end_title', 'notif_period_end_body', addDays(c.periodEnd, 1), periodData)
      }
      if (prefs.fertileReminder) {
        add(`cycle-fertile-${i}`, 'notif_fertile_title', 'notif_fertile_body', c.fertileStart, { screen: 'Calendar', type: 'fertile' })
      }
      if (prefs.ovulationReminder) {
        const data = { screen: 'Calendar', type: 'ovulation' }
        add(`cycle-ovulation-before-${i}`, 'notif_ovulation_tomorrow_title', 'notif_ovulation_tomorrow_body', addDays(c.ovulationDate, -1), data)
        add(`cycle-ovulation-day-${i}`, 'notif_ovulation_today_title', 'notif_ovulation_today_body', c.ovulationDate, data)
      }
    })

    // Already late: nudge today (if the time hasn't passed) or tomorrow, then +3 and +7 days.
    if (state.isLate && !state.isStale && prefs.lateReminder) {
      const todayStr = state.today || dayjs().format('YYYY-MM-DD')
      const first = at(todayStr).getTime() > Date.now() + MIN_LEAD_MS ? 0 : 1
      ;[first, first + 3, first + 7].forEach((offset, k) => {
        add(`cycle-late-now-${k}`, 'notif_period_late_title', 'notif_period_late_body',
          addDays(todayStr, offset), periodData, { days: state.daysLate + offset })
      })
    }
    if (state.isOnPeriod && prefs.periodEndReminder && state.expectedPeriodEnd) {
      add('cycle-period-end-now', 'notif_period_end_title', 'notif_period_end_body', addDays(state.expectedPeriodEnd, 1), periodData)
    }
  }

  if (prefs.dailyLogReminder) {
    jobs.push(() => scheduleDaily('cycle-daily-log', t('notif_daily_log_title'), t('notif_daily_log_body'),
      prefs.dailyLogTime.hour, prefs.dailyLogTime.minute, { screen: 'Log', type: 'daily_log' }))
  }
  if (prefs.waterReminder) {
    jobs.push(() => scheduleDaily('cycle-water', t('notif_water_title'), t('notif_water_body'),
      prefs.waterTime.hour, prefs.waterTime.minute, { screen: 'Log', type: 'water' }))
  }

  let count = 0
  for (const job of jobs) if (await job()) count++
  return count
}

/**
 * Cancel all 'cycle-*' notifications and schedule the next occurrences from
 * the current cycle state. Calls are serialized. Resolves to the number scheduled.
 * @param state  getCycleState() result
 * @param prefs  notification prefs (any shape; normalized)
 * @param t      translate fn (key, vars) => string
 */
export const rescheduleCycleReminders = (state, prefs, t = defaultT) => {
  const run = rescheduleChain.then(() => doRescheduleCycleReminders(state, prefs, t || defaultT))
  rescheduleChain = run.catch(err => console.error('Reschedule error:', err))
  return run.catch(() => 0)
}

// ── medication reminders ─────────────────────────────────────────────────────
const parseHHMM = (s) => {
  if (typeof s !== 'string' || !/^\d{1,2}:\d{1,2}$/.test(s)) return null
  const [hour, minute] = s.split(':').map(Number)
  return { hour, minute }
}

export const cancelMedicationReminder = async (medId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(`${MED_PREFIX}${medId}`)
  } catch (err) {
    console.error('Cancel medication reminder error:', err)
  }
}

/**
 * Sync 'med-*' notifications with the medication list: one DAILY reminder per
 * active medication with a reminderTime (a future start date simply starts
 * reminding early — acceptable), and cancels reminders of deleted/paused meds.
 */
export const scheduleMedicationReminders = async (medications, t = defaultT) => {
  if ((await getNotificationPermission()) !== 'granted') return
  await ensureAndroidChannel(t)
  const keep = new Set()
  for (const med of Array.isArray(medications) ? medications : []) {
    const time = parseHHMM(med?.reminderTime)
    if (!med?.active || !time) continue
    const id = `${MED_PREFIX}${med.id}`
    keep.add(id)
    await scheduleDaily(id,
      t('notif_med_title', { name: med.name }),
      t('notif_med_body', { name: med.name }),
      time.hour, time.minute,
      { screen: 'Medications', type: 'medication', medicationId: med.id })
  }
  await cancelWhere(id => id.startsWith(MED_PREFIX) && !keep.has(id))
}

// ── misc ─────────────────────────────────────────────────────────────────────
export const sendTestNotification = async (t = defaultT) => {
  await ensureAndroidChannel(t)
  await Notifications.scheduleNotificationAsync({
    content: { title: t('notif_test_title'), body: t('notif_test_body') },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, repeats: false, channelId: CHANNEL_ID },
  })
}

export const getUnreadNotificationCount = async () => {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync()
    return presented.length
  } catch (err) {
    console.error('Error getting presented notifications:', err)
    return 0
  }
}

export const clearUnreadNotifications = async () => {
  try {
    await Notifications.dismissAllNotificationsAsync()
  } catch (err) {
    console.error('Error clearing notifications:', err)
  }
}

// ── legacy shims (screens being redesigned still import these) ───────────────
/**
 * @deprecated Old screens call this after changing their own prefs object.
 * It now just maps that payload into the unified prefs; useAppData (subscribed
 * via subscribeNotificationPrefs) does the actual rescheduling from real cycle data.
 */
export const scheduleAllReminders = (_cycleSettings, legacyPayload) =>
  writePrefs(current => prefsFromLegacyPayload(legacyPayload, current))

/**
 * @deprecated Old screens call this when the master toggle is switched off.
 * Now: disables the unified prefs and cancels only cycle reminders (meds keep working).
 */
export const cancelAllNotifications = async () => {
  await updateNotificationPrefs({ enabled: false })
  await cancelCycleReminders()
}
