// Symptom taxonomy. Labels live in locale files under keys:
//   category -> symptom_cat_<id>,  item -> symptom_<id>
export const SYMPTOM_CATEGORIES = [
  {
    id: 'head',
    labelKey: 'symptom_cat_head',
    emoji: '🤕',
    items: [
      { id: 'headache', labelKey: 'symptom_headache', emoji: '🔨' },
      { id: 'migraines', labelKey: 'symptom_migraines', emoji: '🧠' },
      { id: 'dizziness', labelKey: 'symptom_dizziness', emoji: '🌀' },
      { id: 'acne', labelKey: 'symptom_acne', emoji: '🍓' },
      { id: 'hectic_fever', labelKey: 'symptom_hectic_fever', emoji: '🌡️' },
    ],
  },
  {
    id: 'body',
    labelKey: 'symptom_cat_body',
    emoji: '💪',
    items: [
      { id: 'neck_aches', labelKey: 'symptom_neck_aches', emoji: '🦴' },
      { id: 'shoulder_aches', labelKey: 'symptom_shoulder_aches', emoji: '💪' },
      { id: 'tender_breast', labelKey: 'symptom_tender_breast', emoji: '🎯' },
      { id: 'breast_sensitivity', labelKey: 'symptom_breast_sensitivity', emoji: '➕' },
      { id: 'backaches', labelKey: 'symptom_backaches', emoji: '🦴' },
      { id: 'low_back_pain', labelKey: 'symptom_low_back_pain', emoji: '⚡' },
      { id: 'body_aches', labelKey: 'symptom_body_aches', emoji: '🤕' },
      { id: 'muscle_pain', labelKey: 'symptom_muscle_pain', emoji: '💪' },
      { id: 'influenza', labelKey: 'symptom_influenza', emoji: '🤧' },
      { id: 'illness', labelKey: 'symptom_illness', emoji: '🤒' },
      { id: 'cramps', labelKey: 'symptom_cramps', emoji: '⚡' },
      { id: 'chills', labelKey: 'symptom_chills', emoji: '🥶' },
      { id: 'itchiness', labelKey: 'symptom_itchiness', emoji: '🫳' },
      { id: 'rashes', labelKey: 'symptom_rashes', emoji: '🔴' },
      { id: 'night_sweats', labelKey: 'symptom_night_sweats', emoji: '💦' },
      { id: 'hot_flashes', labelKey: 'symptom_hot_flashes', emoji: '🔥' },
      { id: 'weight_gain', labelKey: 'symptom_weight_gain', emoji: '⚖️' },
      { id: 'pms', labelKey: 'symptom_pms', emoji: '😣' },
    ],
  },
  {
    id: 'cervix',
    labelKey: 'symptom_cat_cervix',
    emoji: '🌸',
    items: [
      { id: 'pelvic_pain', labelKey: 'symptom_pelvic_pain', emoji: '⚡' },
      { id: 'cervical_firmness', labelKey: 'symptom_cervical_firmness', emoji: '🔘' },
      { id: 'cervical_opening', labelKey: 'symptom_cervical_opening', emoji: '⭕' },
      { id: 'cervical_mucus', labelKey: 'symptom_cervical_mucus', emoji: '💧' },
      { id: 'flow', labelKey: 'symptom_flow', emoji: '🩸' },
      { id: 'spotting', labelKey: 'symptom_spotting', emoji: '🔴' },
      { id: 'irritation', labelKey: 'symptom_irritation', emoji: '😖' },
    ],
  },
  {
    id: 'fluid',
    labelKey: 'symptom_cat_fluid',
    emoji: '💧',
    items: [
      { id: 'dry', labelKey: 'symptom_dry', emoji: '🏜️' },
      { id: 'sticky', labelKey: 'symptom_sticky', emoji: '🍯' },
      { id: 'creamy', labelKey: 'symptom_creamy', emoji: '🥛' },
      { id: 'watery', labelKey: 'symptom_watery', emoji: '💧' },
      { id: 'egg_white', labelKey: 'symptom_egg_white', emoji: '🥚' },
      { id: 'cottage_cheese', labelKey: 'symptom_cottage_cheese', emoji: '🧀' },
      { id: 'green', labelKey: 'symptom_green', emoji: '🟢' },
      { id: 'blood_foul', labelKey: 'symptom_blood_foul', emoji: '⚠️' },
    ],
  },
  {
    id: 'abdomen',
    labelKey: 'symptom_cat_abdomen',
    emoji: '🫃',
    items: [
      { id: 'bloating', labelKey: 'symptom_bloating', emoji: '🫧' },
      { id: 'constipation', labelKey: 'symptom_constipation', emoji: '🚫' },
      { id: 'diarrhea', labelKey: 'symptom_diarrhea', emoji: '💨' },
      { id: 'nausea', labelKey: 'symptom_nausea', emoji: '🤢' },
      { id: 'abdominal_cramps', labelKey: 'symptom_abdominal_cramps', emoji: '⚡' },
      { id: 'gas', labelKey: 'symptom_gas', emoji: '💨' },
      { id: 'hunger', labelKey: 'symptom_hunger', emoji: '🍽️' },
      { id: 'cravings', labelKey: 'symptom_cravings', emoji: '🍫' },
      { id: 'ovulation_pain', labelKey: 'symptom_ovulation_pain', emoji: '✨' },
    ],
  },
  {
    id: 'mental',
    labelKey: 'symptom_cat_mental',
    emoji: '🧠',
    items: [
      { id: 'anxiety', labelKey: 'symptom_anxiety', emoji: '😰' },
      { id: 'insomnia', labelKey: 'symptom_insomnia', emoji: '🌙' },
      { id: 'stress', labelKey: 'symptom_stress', emoji: '😫' },
      { id: 'moodiness', labelKey: 'symptom_moodiness', emoji: '🌊' },
      { id: 'tension', labelKey: 'symptom_tension', emoji: '😬' },
      { id: 'irritability', labelKey: 'symptom_irritability', emoji: '😤' },
      { id: 'unable_concentrate', labelKey: 'symptom_unable_concentrate', emoji: '😵' },
      { id: 'fatigue', labelKey: 'symptom_fatigue', emoji: '😴' },
      { id: 'confusion', labelKey: 'symptom_confusion', emoji: '😕' },
    ],
  },
]

import { t } from './translations'

export const getSymptomLabel = (item, lang = 'en') => {
  if (!item) return ''
  if (item.labelKey) return t(lang, item.labelKey)
  if (typeof item.label === 'string') return item.label
  return item.label?.[lang] || item.label?.en || ''
}

export const getCategoryLabel = (category, lang = 'en') => {
  if (!category) return ''
  if (category.labelKey) return t(lang, category.labelKey)
  if (typeof category.label === 'string') return category.label
  return category.label?.[lang] || category.label?.en || ''
}
