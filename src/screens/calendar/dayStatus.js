import { diffDays, findPeriodContaining } from '../../utils/cycleEngine'
import { FLOWS, MOODS } from '../../constants/logOptions'

// Plain-language helpers shared by the Calendar day card and the DaySheet.

/** One-line status for a day → { text, tone } (tone = theme colour token). */
export const dayStatus = (info, { hasData, periodDays }, t) => {
  if (!info) return { text: '', tone: 'textMuted' }
  if (info.isPeriod) {
    let n = 1
    try {
      const run = findPeriodContaining(periodDays || [], info.date)
      if (run) n = diffDays(run.start, info.date) + 1
    } catch { /* keep 1 */ }
    return { text: t('cal_status_period_day', { n }), tone: 'period' }
  }
  if (info.isPredictedPeriod) return { text: t('cal_status_expected'), tone: 'period' }
  if (info.isOvulation) return { text: t('cal_status_ovulation'), tone: 'ovulation' }
  if (info.isFertile) return { text: t('cal_status_fertile'), tone: 'fertile' }
  if (info.isLateWindow || info.phase === 'late') return { text: t('cal_status_late'), tone: 'warning' }
  if (info.phase === 'follicular') return { text: t('cal_status_before_ov'), tone: 'textMuted' }
  if (info.phase === 'luteal') return { text: t('cal_status_after_ov'), tone: 'textMuted' }
  if (!hasData) return { text: t('cal_status_no_data'), tone: 'textMuted' }
  return { text: t('cal_status_none'), tone: 'textMuted' }
}

// getConceptionChance level → 1..5 meter + colour token.
export const CHANCE = {
  Peak: { score: 5, tone: 'ovulation' },
  High: { score: 4, tone: 'fertile' },
  Medium: { score: 3, tone: 'fertile' },
  Low: { score: 2, tone: 'textMuted' },
  Minimal: { score: 1, tone: 'textFaint' },
}

/** Short "what was logged" line for a daily log, or '' when empty. */
export const logSummary = (log, t) => {
  if (!log || typeof log !== 'object') return ''
  const parts = []
  const flow = FLOWS.find((f) => f.id === log.flow)
  if (flow) parts.push(t(flow.labelKey))
  const moods = Array.isArray(log.moods) ? log.moods : []
  moods.forEach((m) => {
    const opt = MOODS.find((o) => o.id === m)
    if (opt) parts.push(t(opt.labelKey))
  })
  const symptoms = Array.isArray(log.symptomsDetailed) ? log.symptomsDetailed : []
  symptoms.slice(0, 4).forEach((s) => { if (typeof s === 'string') parts.push(t(`symptom_${s}`)) })
  if (symptoms.length > 4) parts.push(`+${symptoms.length - 4}`)
  return parts.join(' · ')
}

/** true when a log has anything worth flagging with a dot on the calendar. */
export const hasLogContent = (log) => !!(log && typeof log === 'object' && (
  (Array.isArray(log.moods) && log.moods.length) ||
  (Array.isArray(log.symptomsDetailed) && log.symptomsDetailed.length) ||
  (typeof log.notes === 'string' && log.notes.trim()) ||
  log.flow === 'spotting' || log.intimacy || log.pregnancyTest || log.mucus
))
