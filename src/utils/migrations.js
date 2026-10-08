/**
 * Versioned, idempotent data migrations. Run once on app start BEFORE any
 * state is read (useAppData does this). Old keys are never deleted here, so a
 * rollback to an older app build still finds its data.
 *
 * Keys
 *   'data_version'        number, absent = legacy (v1)
 *   'period_days'         ['YYYY-MM-DD', ...] — source of truth for periods (v2+)
 *   'notification_prefs'  unified prefs (v2+, see notificationPrefs.js)
 */
import dayjs from 'dayjs'
import { loadData, saveData, enqueueWrite } from './storage'
import { buildPeriodDaysFromLegacy, normalizePeriodDays } from './cycleEngine'
import { mergeLegacyPrefs, PREFS_KEY } from './notificationPrefs'

export const DATA_VERSION_KEY = 'data_version'
export const PERIOD_DAYS_KEY = 'period_days'
export const CURRENT_DATA_VERSION = 2

// saveData() swallows errors; a migration must fail loudly so the version isn't bumped.
const mustSave = async (key, value) => {
  if (!(await saveData(key, value))) throw new Error(`Migration could not save ${key}`)
}

const MIGRATIONS = {
  // v1 → v2: real period history + unified notification prefs.
  2: async () => {
    const today = dayjs().format('YYYY-MM-DD')
    const [dailyLogs, cycleSettings, existingDays, notificationPrefs, analysisReminders] = await Promise.all([
      loadData('daily_logs', {}),
      loadData('cycle_settings', null),
      loadData(PERIOD_DAYS_KEY, []),
      loadData(PREFS_KEY, null),
      loadData('analysis_reminders', null),
    ])
    const periodDays = buildPeriodDaysFromLegacy(dailyLogs, cycleSettings, today, normalizePeriodDays(existingDays))
    await mustSave(PERIOD_DAYS_KEY, periodDays)
    await mustSave(PREFS_KEY, mergeLegacyPrefs(notificationPrefs, analysisReminders))
  },
}

/**
 * Runs every pending migration in order. Each step is idempotent and the
 * version is bumped only after the step succeeds, so a crash mid-way simply
 * re-runs that step next launch. Resolves to { from, to, ran: [versions] }.
 */
export const runMigrations = () => enqueueWrite(async () => {
  const stored = await loadData(DATA_VERSION_KEY, null)
  const from = Number.isFinite(Number(stored)) && stored != null ? Number(stored) : 1
  const ran = []
  for (let v = from + 1; v <= CURRENT_DATA_VERSION; v++) {
    const step = MIGRATIONS[v]
    if (step) {
      await step()
      ran.push(v)
    }
    await mustSave(DATA_VERSION_KEY, v)
  }
  return { from, to: Math.max(from, CURRENT_DATA_VERSION), ran }
})

/** Mark a freshly-reset install as current (nothing to migrate). */
export const markDataCurrent = () => saveData(DATA_VERSION_KEY, CURRENT_DATA_VERSION)
