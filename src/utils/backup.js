/**
 * Backup / restore of all app data (every AsyncStorage key).
 *
 * File format:
 * {
 *   app: 'cycleappmobile', format: 1, exportedAt: ISO string, dataVersion,
 *   data: { [asyncStorageKey]: rawStoredString }
 * }
 * Raw strings are stored as-is so a restore is byte-identical.
 *
 * TODO(import UI): picking a file needs a document picker (expo-document-picker
 * is NOT installed — adding it is a native change that needs a new EAS build).
 * Until then the UI can pass pasted text (e.g. via expo-clipboard) to importBackup().
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import dayjs from 'dayjs'
import { enqueueWrite } from './storage'
import { normalizePeriodDays } from './cycleEngine'
import { DATA_VERSION_KEY } from './migrations'

export const BACKUP_APP_ID = 'cycleappmobile'
export const BACKUP_FORMAT = 1

/** Build the backup object (no file I/O). */
export const createBackupObject = async () => {
  const keys = await AsyncStorage.getAllKeys()
  const pairs = await AsyncStorage.multiGet(keys)
  const data = {}
  pairs.forEach(([k, v]) => { if (v != null) data[k] = v })
  let dataVersion = null
  try { dataVersion = data[DATA_VERSION_KEY] ? JSON.parse(data[DATA_VERSION_KEY]) : null } catch {}
  return { app: BACKUP_APP_ID, format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), dataVersion, data }
}

/**
 * Write a JSON backup to the cache dir and open the share sheet.
 * Resolves { success, uri?, keys?, error? }.
 */
export const exportBackup = async () => {
  try {
    const backup = await createBackupObject()
    const file = new File(Paths.cache, `my-cycle-backup-${dayjs().format('YYYY-MM-DD-HHmm')}.json`)
    if (file.exists) file.delete()
    file.create()
    file.write(JSON.stringify(backup))
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save your My Cycle backup',
        UTI: 'public.json',
      })
    }
    return { success: true, uri: file.uri, keys: Object.keys(backup.data).length }
  } catch (err) {
    console.error('Backup export error:', err)
    return { success: false, error: err?.message || String(err) }
  }
}

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v)

/** Validate a backup JSON string. Returns { ok, backup?, error? }. */
export const validateBackup = (jsonString) => {
  let backup
  try {
    backup = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
  } catch {
    return { ok: false, error: 'not_json' }
  }
  if (!isPlainObject(backup) || backup.app !== BACKUP_APP_ID) return { ok: false, error: 'not_a_backup' }
  if (typeof backup.format !== 'number' || backup.format > BACKUP_FORMAT) return { ok: false, error: 'unsupported_format' }
  if (!isPlainObject(backup.data)) return { ok: false, error: 'no_data' }
  const parsed = {}
  for (const [k, v] of Object.entries(backup.data)) {
    if (typeof v !== 'string') return { ok: false, error: `bad_value:${k}` }
    try { parsed[k] = JSON.parse(v) } catch { return { ok: false, error: `bad_value:${k}` } }
  }
  if ('daily_logs' in parsed && !isPlainObject(parsed.daily_logs)) return { ok: false, error: 'bad_value:daily_logs' }
  if ('cycle_settings' in parsed && parsed.cycle_settings !== null && !isPlainObject(parsed.cycle_settings)) {
    return { ok: false, error: 'bad_value:cycle_settings' }
  }
  if ('period_days' in parsed) {
    if (!Array.isArray(parsed.period_days)) return { ok: false, error: 'bad_value:period_days' }
    // Clean up silently rather than reject.
    backup.data.period_days = JSON.stringify(normalizePeriodDays(parsed.period_days))
  }
  if ('medications' in parsed && !Array.isArray(parsed.medications)) return { ok: false, error: 'bad_value:medications' }
  return { ok: true, backup }
}

/**
 * Restore a backup, REPLACING all current app data. Keys not in the backup are
 * removed. Older backups (no/old data_version) are migrated on the next load.
 * After success the caller should call useAppData().reload() — reminders are
 * rescheduled automatically by the hook after reload.
 * Resolves { success, keys?, error? }.
 */
export const importBackup = async (jsonString) => {
  const { ok, backup, error } = validateBackup(jsonString)
  if (!ok) return { success: false, error }
  try {
    await enqueueWrite(async () => {
      const entries = Object.entries(backup.data)
      const existing = await AsyncStorage.getAllKeys()
      await AsyncStorage.multiSet(entries)
      const keep = new Set(entries.map(([k]) => k))
      const stale = existing.filter(k => !keep.has(k))
      if (stale.length) await AsyncStorage.multiRemove(stale)
    })
    return { success: true, keys: Object.keys(backup.data).length }
  } catch (err) {
    console.error('Backup import error:', err)
    return { success: false, error: err?.message || String(err) }
  }
}
