import { notifyHappyMoment } from '../utils/ratingPrompt'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AppState } from 'react-native'
import dayjs from 'dayjs'
import {
  saveOnboarded, loadOnboarded,
  saveProfile, loadProfile,
  loadCycleSettings,
  loadAllLogs,
  saveCalendarEdits, loadCalendarEdits,
  clearAllData,
  saveData,
  loadData,
  queueSave,
} from '../utils/storage'
import { runMigrations, markDataCurrent, PERIOD_DAYS_KEY } from '../utils/migrations'
import * as CE from '../utils/cycleEngine'
import { normalizePrefs } from '../utils/notificationPrefs'
import {
  loadNotificationPrefs,
  updateNotificationPrefs as storeNotificationPrefs,
  subscribeNotificationPrefs,
  rescheduleCycleReminders,
  cancelAllScheduledNotifications,
} from '../utils/notifications'
import { syncMedicationReminders } from '../utils/medications'
import { useLanguage } from '../context/LanguageContext'

const todayStr = () => dayjs().format('YYYY-MM-DD')
const DEFAULT_PROFILE = { name: '', dob: '', condition: 'none', email: '', phone: '' }
// cycleLength / periodLength are the user's DEFAULTS (used until history is learned).
// lastPeriodStart is kept in sync with the latest logged period for older screens.
const DEFAULT_SETTINGS = { cycleLength: 28, periodLength: 5, lastPeriodStart: null }
const RESCHEDULE_DEBOUNCE_MS = 1500

const useAppData = () => {
  const { t, language } = useLanguage()
  const tRef = useRef(t)
  tRef.current = t

  const [loading, setLoading] = useState(true)
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [userProfile, setUserProfile] = useState(DEFAULT_PROFILE)
  const [cycleSettings, setCycleSettings] = useState(DEFAULT_SETTINGS)
  const [dailyLogs, setDailyLogs] = useState({})
  const [periodDays, setPeriodDays] = useState([])
  const [calendarEdits, setCalendarEdits] = useState({})
  const [installDate, setInstallDate] = useState(null)
  const [notificationPrefs, setNotificationPrefs] = useState(() => normalizePrefs(null))
  const [today, setToday] = useState(todayStr)
  const [foregroundTick, setForegroundTick] = useState(0)

  // Refs hold the latest committed values so actions never close over stale
  // state and concurrent calls compose instead of overwriting each other.
  const profileRef = useRef(DEFAULT_PROFILE)
  const settingsRef = useRef(DEFAULT_SETTINGS)
  const logsRef = useRef({})
  const periodDaysRef = useRef([])
  const todayRef = useRef(today)
  todayRef.current = today

  // ── LOAD (runs migrations first) ────────────────
  const loadAll = useCallback(async () => {
    try {
      try {
        await runMigrations()
      } catch (err) {
        console.error('Data migration failed (will retry next launch):', err)
      }
      const [onboarded, profile, cycle, logs, edits, savedInstallDate, storedDays, prefs] = await Promise.all([
        loadOnboarded(),
        loadProfile(),
        loadCycleSettings(),
        loadAllLogs(),
        loadCalendarEdits(),
        loadData('install_date', null),
        loadData(PERIOD_DAYS_KEY, null),
        loadNotificationPrefs(),
      ])
      const now = todayStr()
      const safeLogs = logs && typeof logs === 'object' ? logs : {}
      // If the migration couldn't run, derive history in memory so nothing looks lost.
      const days = Array.isArray(storedDays)
        ? CE.normalizePeriodDays(storedDays)
        : CE.buildPeriodDaysFromLegacy(safeLogs, cycle, now)
      const settings = { ...DEFAULT_SETTINGS, ...(cycle || {}) }

      profileRef.current = profile?.name ? profile : DEFAULT_PROFILE
      settingsRef.current = settings
      logsRef.current = safeLogs
      periodDaysRef.current = days

      setIsOnboarded(!!onboarded)
      setUserProfile(profileRef.current)
      setCycleSettings(settings)
      setDailyLogs(safeLogs)
      setPeriodDays(days)
      setCalendarEdits(edits || {})
      setNotificationPrefs(prefs)
      setToday(now)

      if (savedInstallDate) {
        setInstallDate(savedInstallDate)
      } else {
        await saveData('install_date', now)
        setInstallDate(now)
      }
    } catch (err) {
      console.error('Error loading app data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  /** Re-read everything from storage (e.g. after importing a backup). */
  // Re-read everything (e.g. after a backup restore) without flipping
  // `loading`, which would unmount navigation and re-run ad initialisation.
  const reload = useCallback(async () => {
    await loadAll()
  }, [loadAll])

  // ── TODAY stays fresh (midnight rollover + foreground) ──
  useEffect(() => {
    const id = setInterval(() => setToday(todayStr()), 60 * 1000)
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return
      setToday(todayStr())
      // Legacy screens may have written prefs directly to storage.
      loadNotificationPrefs().then(p => setNotificationPrefs(prev =>
        JSON.stringify(prev) === JSON.stringify(p) ? prev : p))
      setForegroundTick(x => x + 1)
    })
    return () => { clearInterval(id); sub.remove() }
  }, [])

  useEffect(() => subscribeNotificationPrefs(p => setNotificationPrefs(p)), [])

  // ── DERIVED CYCLE DATA ──────────────────────────
  const engineSettings = useMemo(() => CE.normalizeSettings(cycleSettings),
    [cycleSettings.cycleLength, cycleSettings.periodLength, cycleSettings.lutealLength])
  const cycleState = useMemo(() => CE.getCycleState(periodDays, engineSettings, today),
    [periodDays, engineSettings, today])
  const cycleContext = useMemo(() => CE.buildCycleContext(periodDays, engineSettings, today),
    [periodDays, engineSettings, today])
  const cycleHistory = cycleContext.history
  const upcomingCycles = useMemo(() => CE.getUpcomingCycles(cycleState, 3), [cycleState])

  const getDayInfo = useCallback((date) => CE.getDayInfo(date, null, null, null, cycleContext), [cycleContext])
  const getMonthGrid = useCallback((year, month, opts) =>
    CE.getMonthGrid(year, month, null, null, null, cycleContext, opts), [cycleContext])
  const getConceptionChance = useCallback((date) =>
    CE.getConceptionChance(date, null, null, null, cycleContext), [cycleContext])

  // ── PERSIST HELPERS ─────────────────────────────
  const commitSettings = useCallback((next) => {
    settingsRef.current = next
    setCycleSettings(next)
    return queueSave('cycle_settings', () => settingsRef.current)
  }, [])

  const commitLogs = useCallback((next) => {
    logsRef.current = next
    setDailyLogs(next)
    return queueSave('daily_logs', () => logsRef.current)
  }, [])

  /**
   * Apply a pure edit to periodDays. Days that get REMOVED also lose a
   * bleeding flow in their daily log, so logs and calendar never disagree.
   */
  const updatePeriodDays = useCallback((edit) => {
    const prev = periodDaysRef.current
    const next = CE.normalizePeriodDays(edit(prev))
    periodDaysRef.current = next
    setPeriodDays(next)
    const writes = [queueSave(PERIOD_DAYS_KEY, () => periodDaysRef.current)]

    const kept = new Set(next)
    const removed = prev.filter(d => !kept.has(d))
    const logs = logsRef.current
    const toClear = removed.filter(d => CE.isBleedingFlow(logs[d]?.flow))
    if (toClear.length) {
      const nextLogs = { ...logs }
      toClear.forEach(d => { nextLogs[d] = { ...logs[d], flow: null, updatedAt: new Date().toISOString() } })
      writes.push(commitLogs(nextLogs))
    }
    return Promise.all(writes).then(() => next)
  }, [commitLogs])

  const currentPeriodLength = () =>
    CE.getAverages(periodDaysRef.current, settingsRef.current, todayRef.current).periodLength

  // Keep cycleSettings.lastPeriodStart == latest real period start (back-compat).
  useEffect(() => {
    if (loading) return
    const latest = cycleState.lastPeriodStart || null
    if ((settingsRef.current.lastPeriodStart || null) !== latest) {
      commitSettings({ ...settingsRef.current, lastPeriodStart: latest })
    }
  }, [loading, cycleState.lastPeriodStart, commitSettings])

  // ── PERIOD ACTIONS (all return a Promise resolving to the new periodDays) ──
  const togglePeriodDay = useCallback((date) =>
    updatePeriodDays(days => CE.togglePeriodDay(days, date)), [updatePeriodDays])

  const startPeriod = useCallback(async (date = todayRef.current, length) => {
    const next = await updatePeriodDays(days => CE.startPeriod(days, date, length || currentPeriodLength()))
    notifyHappyMoment() // may show the rating prompt (see utils/ratingPrompt.js)
    return next
  }, [updatePeriodDays])

  const endPeriod = useCallback((date = todayRef.current) =>
    updatePeriodDays(days => CE.endPeriod(days, date)), [updatePeriodDays])

  const setPeriodRange = useCallback((start, end) =>
    updatePeriodDays(days => CE.setPeriodRange(days, start, end)), [updatePeriodDays])

  const removePeriod = useCallback((start) =>
    updatePeriodDays(days => CE.removePeriod(days, start)), [updatePeriodDays])

  /** Legacy: screens "set lastPeriodStart". Move a nearby period, or start a new one. */
  const movePeriodStart = useCallback((newStart) =>
    updatePeriodDays(days => {
      const t = todayRef.current
      const near = CE.derivePeriods(days).find(p => Math.abs(CE.diffDays(p.start, newStart)) <= 10)
      if (near) {
        const len = near.end >= t ? currentPeriodLength() : near.length
        return CE.startPeriod(CE.removePeriod(days, near.start), newStart, len)
      }
      return CE.startPeriod(days, newStart, currentPeriodLength())
    }), [updatePeriodDays])

  // ── ONBOARDING ──────────────────────────────────
  const completeOnboarding = useCallback(async ({ profile, cycleSettings: cycle }) => {
    const fullProfile = { ...profileRef.current, ...profile }
    profileRef.current = fullProfile
    setUserProfile(fullProfile)
    setIsOnboarded(true)
    const settings = { ...DEFAULT_SETTINGS, ...(cycle || {}) }
    const lps = CE.toDateStr(cycle?.lastPeriodStart)
    const writes = [saveOnboarded(true), saveProfile(fullProfile), markDataCurrent(), commitSettings(settings)]
    if (lps && lps <= todayRef.current) {
      writes.push(updatePeriodDays(days => CE.startPeriod(days, lps, CE.normalizeSettings(settings).periodLength)))
    }
    await Promise.all(writes)
  }, [commitSettings, updatePeriodDays])

  // ── PROFILE ─────────────────────────────────────
  const updateProfile = useCallback(async (updater) => {
    const next = typeof updater === 'function' ? updater(profileRef.current) : updater
    profileRef.current = next
    setUserProfile(next)
    await queueSave('profile', () => profileRef.current)
  }, [])

  // ── CYCLE SETTINGS (user defaults) ──────────────
  const updateCycleSettings = useCallback(async (updater) => {
    const prev = settingsRef.current
    const next = typeof updater === 'function' ? updater(prev) : updater
    const requestedStart = CE.toDateStr(next?.lastPeriodStart)
    // lastPeriodStart is derived from periodDays; never accept it directly.
    await commitSettings({ ...prev, ...(next || {}), lastPeriodStart: prev.lastPeriodStart })
    if (requestedStart && requestedStart !== prev.lastPeriodStart && requestedStart <= todayRef.current) {
      await movePeriodStart(requestedStart)
    }
  }, [commitSettings, movePeriodStart])

  // ── DAILY LOGS ───────────────────────────────────
  /**
   * Merge `partial` into the log for `date` (no defaults injected; undefined
   * values ignored). Bleeding flow adds the day to periodDays; an explicit
   * 'none' on a period day removes it. null only clears the amount (the day
   * stays a period day), and 'spotting' never changes periodDays.
   * Resolves to the saved entry once persisted.
   */
  const saveLog = useCallback(async (date, partial = {}) => {
    const d = CE.toDateStr(date) || todayRef.current
    const clean = {}
    Object.entries(partial || {}).forEach(([k, v]) => { if (v !== undefined) clean[k] = v })
    const prevLogs = logsRef.current
    const entry = { ...prevLogs[d], ...clean, date: d, updatedAt: new Date().toISOString() }
    const writes = [commitLogs({ ...prevLogs, [d]: entry })]

    if ('flow' in clean) {
      const isPeriodDay = periodDaysRef.current.includes(d)
      if (CE.isBleedingFlow(clean.flow)) {
        if (!isPeriodDay) writes.push(updatePeriodDays(days => CE.addPeriodDays(days, [d])))
      } else if (clean.flow === 'none' && isPeriodDay) {
        writes.push(updatePeriodDays(days => CE.clearPeriodDay(days, d, todayRef.current)))
      }
    }
    await Promise.all(writes)
    notifyHappyMoment()
    return entry
  }, [commitLogs, updatePeriodDays])

  const getLog = useCallback((date) => dailyLogs[date] || null, [dailyLogs])
  const getTodayLog = useCallback(() => dailyLogs[today] || null, [dailyLogs, today])

  // ── CALENDAR EDITS (legacy, unused) ──────────────
  const updateCalendarEdits = useCallback(async (updater) => {
    setCalendarEdits(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveCalendarEdits(next)
      return next
    })
  }, [])

  // ── NOTIFICATIONS ────────────────────────────────
  /** Merge partial prefs (canonical names, see notificationPrefs.js). Resolves to new prefs. */
  const updateNotificationPrefs = useCallback((partialOrFn) => storeNotificationPrefs(partialOrFn), [])

  // Reschedule cycle reminders whenever data/prefs/language change or the app returns to foreground.
  useEffect(() => {
    if (loading || !isOnboarded) return
    const id = setTimeout(() => {
      rescheduleCycleReminders(cycleState, notificationPrefs, tRef.current)
    }, RESCHEDULE_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [loading, isOnboarded, cycleState, notificationPrefs, language, foregroundTick])

  // Re-sync medication reminders once loaded (fixes old one-shot / orphaned ones) and on language change.
  useEffect(() => {
    if (loading) return
    syncMedicationReminders(tRef.current).catch(err => console.error('Medication sync error:', err))
  }, [loading, language])

  // ── PREGNANCY ────────────────────────────────────
  /**
   * Turn pregnancy mode on with gestation counted from the LMP (defaults to the
   * latest logged period start; clamped to [today-44w, today]). Resolves to progress.
   */
  const startPregnancyMode = useCallback(async (lmpDate) => {
    const t = todayRef.current
    const lmp = CE.clampLmpDate(lmpDate || cycleState.lastPeriodStart || t, t)
    await Promise.all([saveData('pregnancy_mode', true), saveData('gestation_start', lmp)])
    return CE.getPregnancyProgress(lmp, t)
  }, [cycleState.lastPeriodStart])

  // ── RESET ALL DATA ───────────────────────────────
  const resetAllData = useCallback(async () => {
    await cancelAllScheduledNotifications()
    profileRef.current = DEFAULT_PROFILE
    settingsRef.current = DEFAULT_SETTINGS
    logsRef.current = {}
    periodDaysRef.current = []
    await clearAllData() // waits for queued writes first
    await markDataCurrent()
    setIsOnboarded(false)
    setUserProfile(DEFAULT_PROFILE)
    setCycleSettings(DEFAULT_SETTINGS)
    setDailyLogs({})
    setPeriodDays([])
    setCalendarEdits({})
    setNotificationPrefs(normalizePrefs(null))
  }, [])

  return {
    loading,
    isOnboarded,
    userProfile,
    cycleSettings,
    dailyLogs,
    calendarEdits,
    installDate,
    today,
    // cycle data
    periodDays,
    cycleState,
    cycleHistory,
    upcomingCycles,
    getDayInfo,
    getMonthGrid,
    getConceptionChance,
    // actions
    completeOnboarding,
    updateProfile,
    updateCycleSettings,
    togglePeriodDay,
    startPeriod,
    endPeriod,
    setPeriodRange,
    removePeriod,
    saveLog,
    getLog,
    getTodayLog,
    updateCalendarEdits,
    notificationPrefs,
    updateNotificationPrefs,
    startPregnancyMode,
    reload,
    resetAllData,
  }
}

export default useAppData
