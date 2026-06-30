export const SYMPTOM_CATEGORIES = [
  {
    id: 'head',
    label: { en: 'Head', sw: 'Kichwa' },
    emoji: '🤕',
    items: [
      { id: 'headache', label: { en: 'Headache', sw: 'Maumivu ya kichwa' }, emoji: '🔨' },
      { id: 'migraines', label: { en: 'Migraines', sw: 'Kipandauso' }, emoji: '🧠' },
      { id: 'dizziness', label: { en: 'Dizziness', sw: 'Kizunguzungu' }, emoji: '🌀' },
      { id: 'acne', label: { en: 'Acne', sw: 'Chunusi' }, emoji: '🍓' },
      { id: 'hectic_fever', label: { en: 'Hectic fever', sw: 'Homa kali' }, emoji: '🌡️' },
    ],
  },
  {
    id: 'body',
    label: { en: 'Body', sw: 'Mwili' },
    emoji: '💪',
    items: [
      { id: 'neck_aches', label: { en: 'Neck aches', sw: 'Maumivu ya shingo' }, emoji: '🦴' },
      { id: 'shoulder_aches', label: { en: 'Shoulder aches', sw: 'Maumivu ya bega' }, emoji: '💪' },
      { id: 'tender_breast', label: { en: 'Tender Breasts', sw: 'Maumivu ya matiti' }, emoji: '🎯' },
      { id: 'breast_sensitivity', label: { en: 'Breast sensitivity', sw: 'Unyeti wa matiti' }, emoji: '➕' },
      { id: 'backaches', label: { en: 'Backaches', sw: 'Maumivu ya mgongo' }, emoji: '🦴' },
      { id: 'low_back_pain', label: { en: 'Low back pain', sw: 'Maumivu ya mgongo wa chini' }, emoji: '⚡' },
      { id: 'body_aches', label: { en: 'Body aches', sw: 'Maumivu ya mwili' }, emoji: '🤕' },
      { id: 'muscle_pain', label: { en: 'Muscle pain', sw: 'Maumivu ya misuli' }, emoji: '💪' },
      { id: 'influenza', label: { en: 'Influenza', sw: 'Mafua makali' }, emoji: '🤧' },
      { id: 'illness', label: { en: 'Illness', sw: 'Ugonjwa' }, emoji: '🤒' },
      { id: 'cramps', label: { en: 'Cramps', sw: 'Maumivu ya tumbo' }, emoji: '⚡' },
      { id: 'chills', label: { en: 'Chills', sw: 'Baridi mwilini' }, emoji: '🥶' },
      { id: 'itchiness', label: { en: 'Itchiness', sw: 'Muwasho' }, emoji: '🫳' },
      { id: 'rashes', label: { en: 'Rashes', sw: 'Vipele' }, emoji: '🔴' },
      { id: 'night_sweats', label: { en: 'Night sweats', sw: 'Jasho la usiku' }, emoji: '💦' },
      { id: 'hot_flashes', label: { en: 'Hot flashes', sw: 'Joto la ghafla' }, emoji: '🔥' },
      { id: 'weight_gain', label: { en: 'Weight gain', sw: 'Kuongezeka uzito' }, emoji: '⚖️' },
      { id: 'pms', label: { en: 'PMS', sw: 'Dalili za kabla ya hedhi' }, emoji: '😣' },
    ],
  },
  {
    id: 'cervix',
    label: { en: 'Cervix', sw: 'Shingo ya kizazi' },
    emoji: '🌸',
    items: [
      { id: 'pelvic_pain', label: { en: 'Pelvic pain', sw: 'Maumivu ya nyonga' }, emoji: '⚡' },
      { id: 'cervical_firmness', label: { en: 'Cervical firmness', sw: 'Ugumu wa shingo ya kizazi' }, emoji: '🔘' },
      { id: 'cervical_opening', label: { en: 'Cervical opening', sw: 'Ufunguzi wa shingo ya kizazi' }, emoji: '⭕' },
      { id: 'cervical_mucus', label: { en: 'Cervical mucus', sw: 'Ute wa shingo ya kizazi' }, emoji: '💧' },
      { id: 'flow', label: { en: 'Flow', sw: 'Mtiririko' }, emoji: '🩸' },
      { id: 'spotting', label: { en: 'Spotting', sw: 'Madoa ya damu' }, emoji: '🔴' },
      { id: 'irritation', label: { en: 'Irritation', sw: 'Muwasho' }, emoji: '😖' },
    ],
  },
  {
    id: 'fluid',
    label: { en: 'Fluid', sw: 'Ute' },
    emoji: '💧',
    items: [
      { id: 'dry', label: { en: 'Dry', sw: 'Kavu' }, emoji: '🏜️' },
      { id: 'sticky', label: { en: 'Sticky', sw: 'Unata' }, emoji: '🍯' },
      { id: 'creamy', label: { en: 'Creamy', sw: 'Laini kama krimu' }, emoji: '🥛' },
      { id: 'watery', label: { en: 'Watery', sw: 'Kama maji' }, emoji: '💧' },
      { id: 'egg_white', label: { en: 'Egg white', sw: 'Kama ute wa yai' }, emoji: '🥚' },
      { id: 'cottage_cheese', label: { en: 'Cottage-cheese', sw: 'Kama jibini iliyovunjika' }, emoji: '🧀' },
      { id: 'green', label: { en: 'Green', sw: 'Kijani' }, emoji: '🟢' },
      { id: 'blood_foul', label: { en: 'With blood / foul-smelling', sw: 'Yenye damu / harufu mbaya' }, emoji: '⚠️' },
    ],
  },
  {
    id: 'abdomen',
    label: { en: 'Abdomen', sw: 'Tumbo' },
    emoji: '🫃',
    items: [
      { id: 'bloating', label: { en: 'Bloating', sw: 'Kuvimba tumbo' }, emoji: '🫧' },
      { id: 'constipation', label: { en: 'Constipation', sw: 'Choo kigumu' }, emoji: '🚫' },
      { id: 'diarrhea', label: { en: 'Diarrhea', sw: 'Kuhara' }, emoji: '💨' },
      { id: 'nausea', label: { en: 'Nausea', sw: 'Kichefuchefu' }, emoji: '🤢' },
      { id: 'abdominal_cramps', label: { en: 'Abdominal cramps', sw: 'Maumivu ya tumbo' }, emoji: '⚡' },
      { id: 'gas', label: { en: 'Gas', sw: 'Gesi tumboni' }, emoji: '💨' },
      { id: 'hunger', label: { en: 'Hunger', sw: 'Njaa' }, emoji: '🍽️' },
      { id: 'cravings', label: { en: 'Cravings', sw: 'Hamu kubwa ya chakula' }, emoji: '🍫' },
      { id: 'ovulation_pain', label: { en: 'Ovulation pain', sw: 'Maumivu ya ovulation' }, emoji: '✨' },
    ],
  },
  {
    id: 'mental',
    label: { en: 'Mental', sw: 'Akili' },
    emoji: '🧠',
    items: [
      { id: 'anxiety', label: { en: 'Anxiety', sw: 'Wasiwasi' }, emoji: '😰' },
      { id: 'insomnia', label: { en: 'Insomnia', sw: 'Kukosa usingizi' }, emoji: '🌙' },
      { id: 'stress', label: { en: 'Stress', sw: 'Msongo wa mawazo' }, emoji: '😫' },
      { id: 'moodiness', label: { en: 'Moodiness', sw: 'Mabadiliko ya hisia' }, emoji: '🌊' },
      { id: 'tension', label: { en: 'Tension', sw: 'Mvutano' }, emoji: '😬' },
      { id: 'irritability', label: { en: 'Irritability', sw: 'Hasira' }, emoji: '😤' },
      { id: 'unable_concentrate', label: { en: 'Unable to concentrate', sw: 'Kushindwa kuzingatia' }, emoji: '😵' },
      { id: 'fatigue', label: { en: 'Fatigue', sw: 'Uchovu' }, emoji: '😴' },
      { id: 'confusion', label: { en: 'Confusion', sw: 'Kuchanganyikiwa' }, emoji: '😕' },
    ],
  },
]

export const getSymptomLabel = (item, lang = 'en') => {
  if (!item) return ''
  if (typeof item.label === 'string') return item.label
  return item.label?.[lang] || item.label?.en || ''
}

export const getCategoryLabel = (category, lang = 'en') => {
  if (!category) return ''
  if (typeof category.label === 'string') return category.label
  return category.label?.[lang] || category.label?.en || ''
}