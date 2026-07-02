import dayjs from 'dayjs'

/**
 * Detects actual period start dates from logged daily flow data.
 * A "period start" is the first day of flow after at least 2 days
 * with no flow logged (or no log at all), avoiding false positives
 * from spotting between periods.
 */
export const detectPeriodStartsFromLogs = (dailyLogs) => {
  if (!dailyLogs || Object.keys(dailyLogs).length === 0) return []

  const sortedDates = Object.keys(dailyLogs).sort()
  const periodStarts = []
  let lastFlowDate = null

  for (const date of sortedDates) {
    const log = dailyLogs[date]
    const hasFlow = log?.flow && log.flow !== 'none'

    if (hasFlow) {
      const gapDays = lastFlowDate
        ? dayjs(date).diff(dayjs(lastFlowDate), 'day')
        : null

      // New period start: either the very first flow ever logged,
      // or flow resumed after a gap of 10+ days (avoids spotting noise)
      if (gapDays === null || gapDays >= 10) {
        periodStarts.push(date)
      }
      lastFlowDate = date
    }
  }

  return periodStarts
}

/**
 * Calculates the lengths (in days) between consecutive detected period starts.
 */
export const calculateHistoricalCycleLengths = (periodStarts) => {
  if (periodStarts.length < 2) return []
  const lengths = []
  for (let i = 1; i < periodStarts.length; i++) {
    const length = dayjs(periodStarts[i]).diff(dayjs(periodStarts[i - 1]), 'day')
    // Sanity filter: ignore wildly implausible cycle lengths (data entry errors)
    if (length >= 15 && length <= 60) {
      lengths.push(length)
    }
  }
  return lengths
}

/**
 * Computes a weighted average cycle length, giving more weight to recent cycles.
 * Returns null if there isn't enough data (falls back to manual setting).
 */
export const calculateSmartCycleLength = (historicalLengths) => {
  if (historicalLengths.length === 0) return null

  // Use up to the last 6 cycles, weighting recent ones more heavily
  const recent = historicalLengths.slice(-6)
  const weights = recent.map((_, i) => i + 1) // [1,2,3,4,5,6]
  const weightedSum = recent.reduce((sum, len, i) => sum + len * weights[i], 0)
  const weightTotal = weights.reduce((sum, w) => sum + w, 0)

  return Math.round(weightedSum / weightTotal)
}

/**
 * Calculates how regular the user's cycles have been, as a 0-100 score.
 * Based on the standard deviation of historical cycle lengths relative to their average.
 */
export const calculateCycleRegularity = (historicalLengths) => {
  if (historicalLengths.length < 2) return null

  const avg = historicalLengths.reduce((a, b) => a + b, 0) / historicalLengths.length
  const variance = historicalLengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / historicalLengths.length
  const stdDev = Math.sqrt(variance)

  // Lower stdDev = more regular. Map to a friendly 0-100 score.
  // stdDev of 0 days => 100, stdDev of 8+ days => near 0
  const score = Math.max(0, Math.min(100, Math.round(100 - (stdDev / 8) * 100)))
  return score
}

/**
 * Main entry point: returns smart predictions based on logged history,
 * gracefully falling back to manual cycleSettings when there isn't enough data.
 *
 * Returns: {
 *   effectiveCycleLength: number,       // what to actually use for predictions
 *   source: 'learned' | 'manual',       // where it came from
 *   historicalLengths: number[],        // raw data for display/debugging
 *   regularityScore: number | null,     // 0-100, null if not enough data
 *   cyclesAnalyzed: number,
 * }
 */
export const getSmartPredictions = (dailyLogs, cycleSettings) => {
  const periodStarts = detectPeriodStartsFromLogs(dailyLogs)
  const historicalLengths = calculateHistoricalCycleLengths(periodStarts)
  const learnedLength = calculateSmartCycleLength(historicalLengths)
  const regularityScore = calculateCycleRegularity(historicalLengths)

  // Require at least 2 complete cycles of real data before trusting it over the manual setting
  const hasEnoughData = historicalLengths.length >= 2

  return {
    effectiveCycleLength: hasEnoughData ? learnedLength : (cycleSettings?.cycleLength || 28),
    source: hasEnoughData ? 'learned' : 'manual',
    historicalLengths,
    regularityScore,
    cyclesAnalyzed: historicalLengths.length,
    detectedPeriodStarts: periodStarts,
  }
}
