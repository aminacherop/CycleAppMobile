// Single source of truth for daily-log choices. Ids are what gets stored in
// daily_logs, so never rename an id — only labels (via locale keys).

export const FLOWS = [
  { id: 'spotting', labelKey: 'flow_spotting', drops: 0 },
  { id: 'light', labelKey: 'flow_light', drops: 1 },
  { id: 'medium', labelKey: 'flow_medium', drops: 2 },
  { id: 'heavy', labelKey: 'flow_heavy', drops: 3 },
]

export const MOODS = [
  { id: 'calm', labelKey: 'mood_calm' },
  { id: 'happy', labelKey: 'mood_happy' },
  { id: 'energetic', labelKey: 'mood_energetic' },
  { id: 'tired', labelKey: 'mood_tired' },
  { id: 'sad', labelKey: 'mood_sad' },
  { id: 'anxious', labelKey: 'mood_anxious' },
  { id: 'irritable', labelKey: 'mood_irritable' },
  { id: 'moody', labelKey: 'mood_moody' },
]

// Most-logged symptoms, shown as quick chips before "More".
export const QUICK_SYMPTOMS = ['cramps', 'headache', 'bloating', 'tender_breast', 'acne', 'backaches', 'fatigue', 'nausea']

export const MUCUS = [
  { id: 'dry', labelKey: 'mucus_dry' },
  { id: 'sticky', labelKey: 'mucus_sticky' },
  { id: 'creamy', labelKey: 'mucus_creamy' },
  { id: 'watery', labelKey: 'mucus_watery' },
  { id: 'eggwhite', labelKey: 'mucus_eggwhite' },
]

export const PREGNANCY_TEST = [
  { id: 'positive', labelKey: 'test_positive' },
  { id: 'negative', labelKey: 'test_negative' },
]

export const INTIMACY = [
  { id: 'protected', labelKey: 'intimacy_protected' },
  { id: 'unprotected', labelKey: 'intimacy_unprotected' },
]

export const WATER_GOAL = 8

export const GOALS = [
  { id: 'track_period', labelKey: 'goal_track_period', icon: 'drop' },
  { id: 'conceive', labelKey: 'goal_conceive', icon: 'heart' },
  { id: 'pregnancy', labelKey: 'goal_pregnancy', icon: 'baby' },
]
