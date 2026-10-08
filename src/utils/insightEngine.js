import {
  buildCycleContext,
  buildPeriodDaysFromLegacy,
  getAverages,
  getDayInfo,
  isValidDateStr,
} from './cycleEngine'

// When a screen doesn't pass periodDays (legacy callers), rebuild them from logs + settings.
const resolvePeriodDays = (dailyLogs, cycleSettings, periodDays) =>
  Array.isArray(periodDays) ? periodDays : buildPeriodDaysFromLegacy(dailyLogs, cycleSettings)

const PHASE_BUCKET = {
  period: 'Menstrual',
  follicular: 'Follicular',
  fertile: 'Ovulation',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
  late: 'Luteal',
}

/**
 * Analyzes dailyLogs to find symptom correlations by cycle phase.
 * Each log is classified by the phase it ACTUALLY fell in (real period history
 * from cycleEngine); logs outside any known cycle are skipped.
 * Returns top insights sorted by frequency/confidence.
 */
export const getSymptomCorrelations = (dailyLogs, cycleSettings, periodDays) => {
  if (!dailyLogs || Object.keys(dailyLogs).length < 14) return []

  const days = resolvePeriodDays(dailyLogs, cycleSettings, periodDays)
  if (!days.length) return []
  const ctx = buildCycleContext(days, cycleSettings)

  const phaseLogs = { Menstrual: [], Follicular: [], Ovulation: [], Luteal: [] }
  const symptomByPhase = {}

  Object.entries(dailyLogs).forEach(([date, log]) => {
    if (!log || typeof log !== 'object' || !isValidDateStr(date) || date > ctx.today) return
    const info = getDayInfo(date, null, null, null, ctx)
    const phase = PHASE_BUCKET[info.phase]
    if (!phase) return // before the first logged period

    phaseLogs[phase].push(log)

    const symptoms = [
      ...(Array.isArray(log.symptoms) ? log.symptoms : []),
      ...(Array.isArray(log.symptomsDetailed) ? log.symptomsDetailed : []),
    ].filter(s => typeof s === 'string')

    symptoms.forEach(symptom => {
      if (!symptomByPhase[symptom]) {
        symptomByPhase[symptom] = { Menstrual: 0, Follicular: 0, Ovulation: 0, Luteal: 0, total: 0 }
      }
      symptomByPhase[symptom][phase]++
      symptomByPhase[symptom].total++
    })
  })

  const insights = []

  Object.entries(symptomByPhase).forEach(([symptom, counts]) => {
    // Find the phase with highest occurrence
    const phases = ['Menstrual', 'Follicular', 'Ovulation', 'Luteal']
    const dominantPhase = phases.reduce((a, b) => counts[a] > counts[b] ? a : b)
    const phaseTotal = phaseLogs[dominantPhase].length

    if (phaseTotal < 3) return // not enough data for this phase

    const frequency = Math.round((counts[dominantPhase] / phaseTotal) * 100)

    if (frequency >= 40 && counts[dominantPhase] >= 2) {
      insights.push({
        symptom,
        phase: dominantPhase,
        frequency,
        count: counts[dominantPhase],
        total: phaseTotal,
      })
    }
  })

  // Sort by frequency descending, return top 5
  return insights.sort((a, b) => b.frequency - a.frequency).slice(0, 5)
}

/**
 * Returns a cycle regularity summary for display (null until 2+ valid cycles).
 */
export const getCycleRegularitySummary = (dailyLogs, cycleSettings, periodDays) => {
  const days = resolvePeriodDays(dailyLogs, cycleSettings, periodDays)
  const averages = getAverages(days, cycleSettings)
  const lengths = averages.cycleLengths
  const score = averages.regularity

  if (lengths.length < 2) return null

  const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
  const min = averages.minCycleLength
  const max = averages.maxCycleLength

  const label =
    score >= 80 ? 'Very Regular' :
    score >= 60 ? 'Mostly Regular' :
    score >= 40 ? 'Somewhat Irregular' : 'Irregular'

  const labelKey =
    score >= 80 ? 'reg_very_regular' :
    score >= 60 ? 'reg_mostly_regular' :
    score >= 40 ? 'reg_somewhat_irregular' : 'reg_irregular'

  const color =
    score >= 80 ? '#10B981' :
    score >= 60 ? '#F59E0B' :
    score >= 40 ? '#F97316' : '#EF4444'

  return { score, label, labelKey, avg, min, max, cyclesAnalyzed: lengths.length, color }
}
