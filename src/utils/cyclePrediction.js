/**
 * @deprecated Thin compatibility layer over cycleEngine.js for screens that
 * still pass (dailyLogs, cycleSettings). New code should use cycleEngine
 * directly (or useAppData().cycleState).
 */
import {
  buildPeriodDaysFromLegacy,
  derivePeriods,
  getAverages,
  MIN_VALID_CYCLE,
  MAX_VALID_CYCLE,
} from './cycleEngine'

/** Period start dates derived from logged bleeding days (spotting ignored). */
export const detectPeriodStartsFromLogs = (dailyLogs) =>
  derivePeriods(buildPeriodDaysFromLegacy(dailyLogs, null)).map(p => p.start)

/** Lengths between consecutive period starts (15–60 days only). */
export const calculateHistoricalCycleLengths = (periodStarts) => {
  const lengths = []
  for (let i = 1; i < (periodStarts || []).length; i++) {
    const a = Date.parse(periodStarts[i - 1])
    const b = Date.parse(periodStarts[i])
    const len = Math.round((b - a) / 86400000)
    if (len >= MIN_VALID_CYCLE && len <= MAX_VALID_CYCLE) lengths.push(len)
  }
  return lengths
}

/**
 * Returns {
 *   effectiveCycleLength, source: 'learned' | 'manual', historicalLengths,
 *   regularityScore, cyclesAnalyzed, detectedPeriodStarts,
 * }
 * Pass periodDays (3rd arg) when available; otherwise they're rebuilt from logs + settings.
 */
export const getSmartPredictions = (dailyLogs, cycleSettings, periodDays) => {
  const days = Array.isArray(periodDays) ? periodDays : buildPeriodDaysFromLegacy(dailyLogs, cycleSettings)
  const averages = getAverages(days, cycleSettings)
  return {
    effectiveCycleLength: averages.cycleLength,
    source: averages.source === 'learned' ? 'learned' : 'manual',
    historicalLengths: averages.cycleLengths,
    regularityScore: averages.regularity,
    cyclesAnalyzed: averages.cyclesUsed,
    detectedPeriodStarts: derivePeriods(days).map(p => p.start),
  }
}
