/**
 * notificationPrefs.js — the ONE notification preferences shape (pure, no RN imports).
 *
 * Stored under AsyncStorage key 'notification_prefs'. Replaces the two older,
 * diverging prefs objects ('notification_prefs' from NotificationSettings and
 * 'analysis_reminders' from Analysis). `dailyReminder` / `dailyReminderTime`
 * are written as mirrors so the legacy NotificationSettings screen keeps
 * displaying the right values until it is redesigned.
 */

export const PREFS_KEY = 'notification_prefs'
export const PREFS_VERSION = 2

export const DEFAULT_PREFS = {
  version: PREFS_VERSION,
  enabled: false,             // master switch (requires OS permission too)
  periodReminder: true,       // N days before + 1 day before + on the day
  periodDaysBefore: 2,        // 0-7
  periodEndReminder: false,   // "has your period ended?" after the expected last day
  lateReminder: true,         // "is your period late?" nudges after a missed start
  fertileReminder: true,      // first day of the fertile window
  ovulationReminder: true,    // day before + on ovulation day
  dailyLogReminder: true,     // every day at dailyLogTime
  waterReminder: false,       // every day at waterTime
  time: { hour: 8, minute: 0 },          // time of day for cycle reminders
  dailyLogTime: { hour: 20, minute: 0 },
  waterTime: { hour: 11, minute: 0 },
}

const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback)
const clampInt = (v, lo, hi, fallback) => {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback
}

/** Accepts {hour,minute}, 'HH:MM', or a bare hour number. */
export const parseTime = (v, fallback) => {
  if (v && typeof v === 'object') {
    return { hour: clampInt(v.hour, 0, 23, fallback.hour), minute: clampInt(v.minute, 0, 59, fallback.minute ?? 0) }
  }
  if (typeof v === 'string' && /^\d{1,2}:\d{1,2}$/.test(v)) {
    const [h, m] = v.split(':')
    return { hour: clampInt(h, 0, 23, fallback.hour), minute: clampInt(m, 0, 59, 0) }
  }
  if (typeof v === 'number' && Number.isFinite(v)) return { hour: clampInt(v, 0, 23, fallback.hour), minute: 0 }
  return { ...fallback }
}

const withMirrors = (p) => ({ ...p, dailyReminder: p.dailyLogReminder, dailyReminderTime: p.dailyLogTime.hour })

/** Coerce anything (stored new shape, partial, legacy NotificationSettings shape) into the canonical shape. */
export const normalizePrefs = (raw) => {
  const r = raw && typeof raw === 'object' ? raw : {}
  const d = DEFAULT_PREFS
  // Mirrors are always written equal to the canonical fields, so if they
  // differ, a legacy screen edited them directly and the mirror wins.
  let dailyLogReminder = bool(r.dailyLogReminder, bool(r.dailyReminder, d.dailyLogReminder))
  if (typeof r.dailyReminder === 'boolean' && r.dailyReminder !== dailyLogReminder) dailyLogReminder = r.dailyReminder
  let dailyLogTime = r.dailyLogTime != null
    ? parseTime(r.dailyLogTime, d.dailyLogTime)
    : parseTime(r.dailyReminderTime, d.dailyLogTime)
  if (r.dailyLogTime != null && typeof r.dailyReminderTime === 'number' && r.dailyReminderTime !== dailyLogTime.hour) {
    dailyLogTime = parseTime(r.dailyReminderTime, d.dailyLogTime)
  }
  return withMirrors({
    version: PREFS_VERSION,
    enabled: bool(r.enabled, d.enabled),
    periodReminder: bool(r.periodReminder, d.periodReminder),
    periodDaysBefore: clampInt(r.periodDaysBefore, 0, 7, d.periodDaysBefore),
    periodEndReminder: bool(r.periodEndReminder, d.periodEndReminder),
    lateReminder: bool(r.lateReminder, d.lateReminder),
    fertileReminder: bool(r.fertileReminder, d.fertileReminder),
    ovulationReminder: bool(r.ovulationReminder, d.ovulationReminder),
    dailyLogReminder,
    waterReminder: bool(r.waterReminder, d.waterReminder),
    time: parseTime(r.time, d.time),
    dailyLogTime,
    waterTime: parseTime(r.waterTime, d.waterTime),
  })
}

const stripMirrors = (p) => {
  const { dailyReminder, dailyReminderTime, ...rest } = p || {}
  return rest
}

/** Apply a partial update from the new API (canonical field names) to stored prefs. */
export const applyPrefsUpdate = (current, partial) =>
  normalizePrefs({ ...stripMirrors(normalizePrefs(current)), ...stripMirrors(partial) })

/** Old Analysis-screen shape ('analysis_reminders') → partial canonical prefs. */
const fromAnalysisShape = (ar) => {
  const out = {}
  if (typeof ar.enabled === 'boolean') out.enabled = ar.enabled
  if (typeof ar.periodStarts === 'boolean') out.periodReminder = ar.periodStarts
  if (typeof ar.periodEnds === 'boolean') out.periodEndReminder = ar.periodEnds
  if (typeof ar.periodInput === 'boolean') out.lateReminder = ar.periodInput
  if (typeof ar.fertility === 'boolean') out.fertileReminder = ar.fertility
  if (typeof ar.ovulation === 'boolean') out.ovulationReminder = ar.ovulation
  if (typeof ar.dailyLog === 'boolean') out.dailyLogReminder = ar.dailyLog
  if (typeof ar.water === 'boolean') out.waterReminder = ar.water
  if (ar.dailyLogTime) out.dailyLogTime = parseTime(ar.dailyLogTime, DEFAULT_PREFS.dailyLogTime)
  if (ar.waterReminderTime) out.waterTime = parseTime(ar.waterReminderTime, DEFAULT_PREFS.waterTime)
  return out
}

/** Old NotificationSettings shape → partial canonical prefs (only keys present). */
const fromSettingsShape = (np) => {
  const out = {}
  ;['enabled', 'periodReminder', 'ovulationReminder', 'fertileReminder', 'periodEndReminder', 'lateReminder', 'waterReminder']
    .forEach(k => { if (typeof np[k] === 'boolean') out[k] = np[k] })
  if (typeof np.dailyLogReminder === 'boolean') out.dailyLogReminder = np.dailyLogReminder
  else if (typeof np.dailyReminder === 'boolean') out.dailyLogReminder = np.dailyReminder
  if (np.dailyLogTime != null) out.dailyLogTime = parseTime(np.dailyLogTime, DEFAULT_PREFS.dailyLogTime)
  else if (np.dailyReminderTime != null) out.dailyLogTime = parseTime(np.dailyReminderTime, DEFAULT_PREFS.dailyLogTime)
  ;['time', 'waterTime', 'periodDaysBefore'].forEach(k => { if (np[k] != null) out[k] = np[k] })
  return out
}

/**
 * Merge the two legacy stores into one canonical prefs object.
 * Master switch = on if EITHER screen had it on. For overlapping toggles the
 * enabled source wins; if both (or neither) were enabled, NotificationSettings
 * wins and Analysis fills in the fields only it had (water, period end, late).
 */
export const mergeLegacyPrefs = (notificationPrefs, analysisReminders) => {
  const np = notificationPrefs && typeof notificationPrefs === 'object' ? notificationPrefs : null
  const ar = analysisReminders && typeof analysisReminders === 'object' ? analysisReminders : null
  if (np?.version >= PREFS_VERSION) return normalizePrefs(np) // already migrated
  const a = ar ? fromAnalysisShape(ar) : {}
  const n = np ? fromSettingsShape(np) : {}
  const analysisWins = !!(ar?.enabled && !np?.enabled)
  const merged = analysisWins ? { ...n, ...a } : { ...a, ...n }
  merged.enabled = !!(np?.enabled || ar?.enabled)
  return normalizePrefs(merged)
}

/**
 * Legacy screens still call scheduleAllReminders(cycleSettings, payload) with
 * their own payload shapes; map that payload onto the current prefs.
 *  - NotificationSettings passes its stored object (has `enabled`, `dailyReminder`, `dailyReminderTime`).
 *  - Analysis passes { periodReminder, ovulationReminder, fertileReminder, dailyReminder,
 *    dailyReminderHour/Minute, waterReminder, waterReminderHour/Minute } and only when enabled.
 * The legacy `dailyReminder*` fields WIN here because those screens only edit those.
 */
export const prefsFromLegacyPayload = (payload, current) => {
  const p = payload || {}
  const next = { ...stripMirrors(normalizePrefs(current)) }
  ;['periodReminder', 'ovulationReminder', 'fertileReminder', 'waterReminder', 'periodEndReminder', 'lateReminder']
    .forEach(k => { if (typeof p[k] === 'boolean') next[k] = p[k] })
  next.enabled = typeof p.enabled === 'boolean' ? p.enabled : true
  if (typeof p.dailyReminder === 'boolean') next.dailyLogReminder = p.dailyReminder
  if (p.dailyReminderHour != null) {
    next.dailyLogTime = parseTime({ hour: p.dailyReminderHour, minute: p.dailyReminderMinute || 0 }, next.dailyLogTime)
  } else if (typeof p.dailyReminderTime === 'number' && p.dailyReminderTime !== next.dailyLogTime.hour) {
    next.dailyLogTime = { hour: parseTime(p.dailyReminderTime, next.dailyLogTime).hour, minute: 0 }
  }
  if (p.waterReminderHour != null) {
    next.waterTime = parseTime({ hour: p.waterReminderHour, minute: p.waterReminderMinute || 0 }, next.waterTime)
  }
  return normalizePrefs(next)
}
