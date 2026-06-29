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
export const saveDailyLog = async (date, log) => {
  const all = await loadAllLogs()
  all[date] = { ...all[date], ...log, date, updatedAt: new Date().toISOString() }
  return saveData('daily_logs', all)
}
export const loadAllLogs = () => loadData('daily_logs', {})
export const saveCalendarEdits = (e) => saveData('saved_edits', e)
export const loadCalendarEdits = () => loadData('saved_edits', {})
