import AsyncStorage from '@react-native-async-storage/async-storage'

export const saveData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error(`Error saving ${key}:`, err)
    return false
  }
}

export const loadData = async (key, defaultValue = null) => {
  try {
    const value = await AsyncStorage.getItem(key)
    return value !== null ? JSON.parse(value) : defaultValue
  } catch (err) {
    console.error(`Error loading ${key}:`, err)
    return defaultValue
  }
}

export const deleteData = async (key) => {
  try {
    await AsyncStorage.removeItem(key)
    return true
  } catch (err) {
    console.error(`Error deleting ${key}:`, err)
    return false
  }
}

export const clearAllData = async () => {
  try {
    await writeChain // don't let an in-flight write resurrect data after the clear
    await AsyncStorage.clear()
    return true
  } catch (err) {
    console.error('Error clearing data:', err)
    return false
  }
}

export const saveOnboarded = (value) => saveData('onboarded', value)
export const loadOnboarded = () => loadData('onboarded', false)
export const saveProfile = (profile) => saveData('profile', profile)
export const loadProfile = () => loadData('profile', {
  name: '', dob: '', condition: 'none', email: '', phone: '',
})
export const saveCycleSettings = (s) => saveData('cycle_settings', s)
export const loadCycleSettings = () => loadData('cycle_settings', {
  cycleLength: 28, periodLength: 5, lastPeriodStart: null,
})
// ── serialized writes ─────────────────────────────────────────────────────
// All queued writes run one after another, so read-modify-write sequences and
// whole-object saves can never interleave and lose data.
let writeChain = Promise.resolve()
const pendingKeys = new Set()

/** Run `task` after every previously queued write. Resolves with its result. */
export const enqueueWrite = (task) => {
  const run = writeChain.then(task)
  writeChain = run.catch(err => console.error('Queued write failed:', err))
  return run
}

/**
 * Persist the LATEST value of `key` (getValue is called when the write runs).
 * Multiple calls before the write starts are coalesced into one write.
 */
export const queueSave = (key, getValue) => {
  if (pendingKeys.has(key)) return writeChain
  pendingKeys.add(key)
  return enqueueWrite(() => {
    pendingKeys.delete(key)
    return saveData(key, getValue())
  })
}

/** Wait for all queued writes to finish. */
export const flushWrites = () => writeChain

export const saveDailyLog = (date, log) => enqueueWrite(async () => {
  const all = await loadAllLogs()
  all[date] = { ...all[date], ...log, date, updatedAt: new Date().toISOString() }
  return saveData('daily_logs', all)
})
export const loadAllLogs = () => loadData('daily_logs', {})
export const saveCalendarEdits = (e) => saveData('saved_edits', e)
export const loadCalendarEdits = () => loadData('saved_edits', {})
