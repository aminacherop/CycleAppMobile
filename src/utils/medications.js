import { saveData, loadData, enqueueWrite } from './storage'
import dayjs from 'dayjs'
import { cancelMedicationReminder, scheduleMedicationReminders } from './notifications'

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

export const addMedication = (medication) => enqueueWrite(async () => {
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
})

export const updateMedication = async (id, updates) => {
  const updated = await enqueueWrite(async () => {
    const meds = await loadMedications()
    const next = meds.map(m => m.id === id ? { ...m, ...updates } : m)
    await saveMedications(next)
    return next
  })
  // Pausing cancels the reminder; resuming / changing the time re-arms it.
  const med = updated.find(m => m.id === id)
  if (!med || !med.active) await cancelMedicationReminder(id)
  else if ('active' in updates || 'reminderTime' in updates || 'name' in updates) {
    await scheduleMedicationReminders(updated)
  }
  return updated
}

export const deleteMedication = async (id) => {
  const updated = await enqueueWrite(async () => {
    const meds = await loadMedications()
    const next = meds.filter(m => m.id !== id)
    await saveMedications(next)
    return next
  })
  await cancelMedicationReminder(id)
  return updated
}

/**
 * Re-sync all 'med-*' notifications with the stored list (cancels orphans of
 * deleted/paused meds, converts old one-shot future-start reminders to daily).
 * Pass the UI translate fn `t` to localize the text.
 */
export const syncMedicationReminders = async (t) => {
  const meds = await loadMedications()
  await scheduleMedicationReminders(Array.isArray(meds) ? meds : [], t)
}

// ── DAILY LOGS — did they take it? ─────────────
export const loadMedicationLogs = () => loadData(MEDS_LOG_KEY, {})

export const logMedicationTaken = (medId, date, taken) => enqueueWrite(async () => {
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
})

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