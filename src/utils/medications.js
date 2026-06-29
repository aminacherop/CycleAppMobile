import { saveData, loadData } from './storage'
import dayjs from 'dayjs'

const MEDS_KEY = 'medications'
const MEDS_LOG_KEY = 'medication_logs'

// Default medication types
export const MEDICATION_TYPES = [
  { id: 'birth_control', label: 'Birth control pill', emoji: '💊', color: '#C2527A' },
  { id: 'folic_acid', label: 'Folic acid', emoji: '🟡', color: '#F59E0B' },
  { id: 'iron', label: 'Iron supplement', emoji: '🔴', color: '#EF4444' },
  { id: 'vitamin_d', label: 'Vitamin D', emoji: '☀️', color: '#FBBF24' },
  { id: 'calcium', label: 'Calcium', emoji: '🦴', color: '#F1F5F9' },
  { id: 'magnesium', label: 'Magnesium', emoji: '🌙', color: '#7C3AED' },
  { id: 'painkiller', label: 'Pain relief', emoji: '⚡', color: '#10B981' },
  { id: 'prenatal', label: 'Prenatal vitamins', emoji: '🤰', color: '#EC4899' },
  { id: 'other', label: 'Other', emoji: '💉', color: '#6B7280' },
]

// ── MEDICATIONS LIST ───────────────────────────
export const saveMedications = (meds) => saveData(MEDS_KEY, meds)
export const loadMedications = () => loadData(MEDS_KEY, [])

export const addMedication = async (medication) => {
  const meds = await loadMedications()
  const newMed = {
    id: Date.now().toString(),
    ...medication,
    createdAt: new Date().toISOString(),
    active: true,
  }
  const updated = [...meds, newMed]
  await saveMedications(updated)
  return updated
}

export const updateMedication = async (id, updates) => {
  const meds = await loadMedications()
  const updated = meds.map(m => m.id === id ? { ...m, ...updates } : m)
  await saveMedications(updated)
  return updated
}

export const deleteMedication = async (id) => {
  const meds = await loadMedications()
  const updated = meds.filter(m => m.id !== id)
  await saveMedications(updated)
  return updated
}

// ── DAILY LOGS — did they take it? ─────────────
export const loadMedicationLogs = () => loadData(MEDS_LOG_KEY, {})

export const logMedicationTaken = async (medId, date, taken) => {
  const logs = await loadMedicationLogs()
  const key = `${medId}_${date}`
  const updated = {
    ...logs,
    [key]: {
      medId,
      date,
      taken,
      timestamp: new Date().toISOString(),
    }
  }
  await saveData(MEDS_LOG_KEY, updated)
  return updated
}

export const getMedicationLogForDate = async (medId, date) => {
  const logs = await loadMedicationLogs()
  return logs[`${medId}_${date}`] || null
}

// ── ADHERENCE CALCULATION ───────────────────────
export const calculateAdherence = async (medId, days = 30) => {
  const logs = await loadMedicationLogs()
  const today = dayjs()
  let taken = 0
  let total = 0

  for (let i = 0; i < days; i++) {
    const date = today.subtract(i, 'day').format('YYYY-MM-DD')
    const log = logs[`${medId}_${date}`]
    if (log) {
      total++
      if (log.taken) taken++
    }
  }

  return total > 0 ? Math.round((taken / total) * 100) : null
}

// ── STREAK CALCULATION ──────────────────────────
export const calculateStreak = async (medId) => {
  const logs = await loadMedicationLogs()
  const today = dayjs()
  let streak = 0

  for (let i = 0; i < 365; i++) {
    const date = today.subtract(i, 'day').format('YYYY-MM-DD')
    const log = logs[`${medId}_${date}`]
    if (log?.taken) {
      streak++
    } else if (i === 0) {
      // Today not logged yet, don't break streak
      continue
    } else {
      break
    }
  }

  return streak
}