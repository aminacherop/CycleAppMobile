import dayjs from 'dayjs'
import { detectPeriodStartsFromLogs, calculateHistoricalCycleLengths, calculateCycleRegularity } from './cyclePrediction'

/**
 * Analyzes dailyLogs to find symptom correlations by cycle phase.
 * Returns top insights sorted by frequency/confidence.
 */
export const getSymptomCorrelations = (dailyLogs, cycleSettings) => {
  if (!dailyLogs || Object.keys(dailyLogs).length < 14) return []

  const cycleLength = cycleSettings?.cycleLength || 28
  const periodLength = cycleSettings?.periodLength || 5
  const lastPeriodStart = cycleSettings?.lastPeriodStart
  const lutealLength = cycleSettings?.lutealLength || 14
  const ovulationDay = cycleLength - lutealLength

  if (!lastPeriodStart) return []

  const lpsDate = dayjs(lastPeriodStart)

  // Classify each logged day by phase
  const phaseLogs = { Menstrual: [], Follicular: [], Ovulation: [], Luteal: [] }
  const symptomByPhase = {}

  Object.entries(dailyLogs).forEach(([date, log]) => {
    const dayObj = dayjs(date)
    const cycleDay = Math.max(1, dayObj.diff(lpsDate, 'day') % cycleLength + 1)

    const phase =
      cycleDay <= periodLength ? 'Menstrual' :
      cycleDay <= ovulationDay - 2 ? 'Follicular' :
      cycleDay <= ovulationDay + 2 ? 'Ovulation' : 'Luteal'

    phaseLogs[phase].push(log)

    // Collect all symptoms for this day
    const symptoms = [
      ...(log.symptoms || []),
      ...(log.symptomsDetailed || []),
    ]

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
 * Returns a cycle regularity summary for display.
 */
export const getCycleRegularitySummary = (dailyLogs, cycleSettings) => {
  const periodStarts = detectPeriodStartsFromLogs(dailyLogs)
  const lengths = calculateHistoricalCycleLengths(periodStarts)
  const score = calculateCycleRegularity(lengths)

  if (lengths.length < 2) return null

  const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
  const min = Math.min(...lengths)
  const max = Math.max(...lengths)

  const label =
    score >= 80 ? 'Very Regular' :
    score >= 60 ? 'Mostly Regular' :
    score >= 40 ? 'Somewhat Irregular' : 'Irregular'

  const color =
    score >= 80 ? '#10B981' :
    score >= 60 ? '#F59E0B' :
    score >= 40 ? '#F97316' : '#EF4444'

  return { score, label, avg, min, max, cyclesAnalyzed: lengths.length, color }
}
