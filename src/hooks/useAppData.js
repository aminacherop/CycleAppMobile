import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import {
  saveOnboarded, loadOnboarded,
  saveProfile, loadProfile,
  saveCycleSettings, loadCycleSettings,
  saveDailyLog, loadDailyLog, loadAllLogs,
  saveCalendarEdits, loadCalendarEdits,
  clearAllData,
  saveData,
  loadData,
} from '../utils/storage'

const useAppData = () => {
  const [loading, setLoading] = useState(true)
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [userProfile, setUserProfile] = useState({
    name: '',
    dob: '',
    condition: 'none',
    email: '',
    phone: '',
  })
  const [cycleSettings, setCycleSettings] = useState({
    cycleLength: 28,
    periodLength: 5,
    lastPeriodStart: dayjs().subtract(14, 'day').format('YYYY-MM-DD'),
  })
  const [dailyLogs, setDailyLogs] = useState({})
  const [calendarEdits, setCalendarEdits] = useState({})
  const [installDate, setInstallDate] = useState(null)

  // ── LOAD ALL DATA ON MOUNT ──────────────────────
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [onboarded, profile, cycle, logs, edits, savedInstallDate] = await Promise.all([
          loadOnboarded(),
          loadProfile(),
          loadCycleSettings(),
          loadAllLogs(),
          loadCalendarEdits(),
          loadData('install_date', null),
        ])
        setIsOnboarded(onboarded)
        if (profile?.name) setUserProfile(profile)
        if (cycle?.lastPeriodStart) setCycleSettings(cycle)
        setDailyLogs(logs || {})
        setCalendarEdits(edits || {})

        if (savedInstallDate) {
          setInstallDate(savedInstallDate)
        } else {
          const today = dayjs().format('YYYY-MM-DD')
          await saveData('install_date', today)
          setInstallDate(today)
        }
      } catch (err) {
        console.error('Error loading app data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  // ── ONBOARDING ──────────────────────────────────
  const completeOnboarding = useCallback(async ({ profile, cycleSettings: cycle }) => {
    const fullProfile = { ...userProfile, ...profile }
    setUserProfile(fullProfile)
    setCycleSettings(cycle)
    setIsOnboarded(true)
    await Promise.all([
      saveOnboarded(true),
      saveProfile(fullProfile),
      saveCycleSettings(cycle),
    ])
  }, [userProfile])

  // ── PROFILE ─────────────────────────────────────
  const updateProfile = useCallback(async (updater) => {
    setUserProfile(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveProfile(next)
      return next
    })
  }, [])

  // ── CYCLE SETTINGS ───────────────────────────────
  const updateCycleSettings = useCallback(async (updater) => {
    setCycleSettings(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveCycleSettings(next)
      return next
    })
  }, [])

  // ── DAILY LOGS ───────────────────────────────────
  const saveLog = useCallback(async (date, log) => {
    const updated = {
      ...dailyLogs,
      [date]: { ...dailyLogs[date], ...log, date }
    }
    setDailyLogs(updated)
    await saveDailyLog(date, log)
  }, [dailyLogs])

  const getLog = useCallback((date) => {
    return dailyLogs[date] || null
  }, [dailyLogs])

  const getTodayLog = useCallback(() => {
    return dailyLogs[dayjs().format('YYYY-MM-DD')] || null
  }, [dailyLogs])

  // ── CALENDAR EDITS ───────────────────────────────
  const updateCalendarEdits = useCallback(async (updater) => {
    setCalendarEdits(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveCalendarEdits(next)
      return next
    })
  }, [])

  // ── RESET ALL DATA ───────────────────────────────
  const resetAllData = useCallback(async () => {
    await clearAllData()
    setIsOnboarded(false)
    setUserProfile({ name: '', dob: '', condition: 'none', email: '', phone: '' })
    setCycleSettings({
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStart: dayjs().subtract(14, 'day').format('YYYY-MM-DD'),
    })
    setDailyLogs({})
    setCalendarEdits({})
  }, [])

  return {
    loading,
    isOnboarded,
    userProfile,
    cycleSettings,
    dailyLogs,
    calendarEdits,
    installDate,
    completeOnboarding,
    updateProfile,
    updateCycleSettings,
    saveLog,
    getLog,
    getTodayLog,
    updateCalendarEdits,
    resetAllData,
  }
}

export default useAppData