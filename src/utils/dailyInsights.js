import dayjs from 'dayjs'

const GENERAL_TIPS = [
  { emoji: '💧', text: 'Staying hydrated can help reduce bloating and headaches throughout your cycle.' },
  { emoji: '🧘', text: 'Tracking your mood daily helps you and your doctor spot patterns over time.' },
  { emoji: '🥗', text: 'Iron-rich foods like leafy greens and beans help replenish what your body loses during your period.' },
  { emoji: '😴', text: 'Quality sleep helps regulate the hormones that control your cycle.' },
  { emoji: '🚶', text: 'Light exercise, even a short walk, can ease cramps for many people.' },
  { emoji: '📝', text: 'The more consistently you log, the more accurate your predictions become over time.' },
  { emoji: '🌡️', text: 'Tracking your basal body temperature can help confirm when ovulation has occurred.' },
  { emoji: '🧴', text: 'Hormonal shifts can affect your skin — many people notice breakouts before their period.' },
]

const PHASE_TIPS = {
  Menstrual: [
    { emoji: '🩸', text: 'Iron levels can dip during your period — consider iron-rich foods or a supplement if you feel fatigued.' },
    { emoji: '🛀', text: 'A warm bath or heating pad can help ease cramping by relaxing uterine muscles.' },
    { emoji: '💗', text: 'It\'s normal to want extra rest during this phase. Listen to your body.' },
  ],
  Follicular: [
    { emoji: '⚡', text: 'Rising estrogen often brings more energy — a great window for higher-intensity workouts.' },
    { emoji: '🧠', text: 'Many people report sharper focus and motivation during the follicular phase.' },
    { emoji: '🌱', text: 'This is typically when your body starts preparing an egg for release.' },
  ],
  Ovulation: [
    { emoji: '✨', text: 'This is typically your most fertile window if you\'re trying to conceive.' },
    { emoji: '🌡️', text: 'Cervical mucus often becomes clear and stretchy around ovulation — a natural fertility sign.' },
    { emoji: '💪', text: 'Energy and confidence often peak around ovulation due to rising estrogen.' },
  ],
  Luteal: [
    { emoji: '🍫', text: 'Cravings before your period are common — they\'re linked to hormonal shifts, not a lack of willpower.' },
    { emoji: '🧘', text: 'If you experience PMS symptoms, gentle movement and magnesium-rich foods may help.' },
    { emoji: '😴', text: 'Progesterone can make you feel more tired — extra rest during this phase is normal.' },
  ],
}

/**
 * Returns a tip based on the current date + a manual offset (for tap-to-cycle).
 * The base index is deterministic by date so it doesn't flicker on re-render,
 * but the offset lets the user cycle through the full pool manually.
 */
export const getDailyInsight = (currentPhase, offset = 0) => {
  const dayOfYear = dayjs().dayOfYear ? dayjs().dayOfYear() : dayjs().diff(dayjs().startOf('year'), 'day')

  const phaseTips = PHASE_TIPS[currentPhase] || []
  const pool = [...phaseTips, ...GENERAL_TIPS]

  if (pool.length === 0) return null

  const index = (dayOfYear + offset) % pool.length
  return { ...pool[index], total: pool.length }
}