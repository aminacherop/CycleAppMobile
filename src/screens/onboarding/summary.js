// Pure helpers for the onboarding summary (no React Native imports, so they
// can be checked from plain node).
import * as CE from '../../utils/cycleEngine'

/**
 * Predict the next period and the next upcoming fertile window from what the
 * user entered during onboarding. Never throws.
 * → { hasData, isLate, nextPeriodStart, nextPeriodEnd, fertileStart, fertileEnd } | { hasData: false }
 */
export const buildOnboardingSummary = ({ lastPeriodStart, cycleLength, periodLength, today }) => {
  try {
    const t = CE.toDateStr(today)
    const lps = CE.toDateStr(lastPeriodStart)
    if (!t || !lps || !CE.isValidDateStr(lps) || lps > t) return { hasData: false }
    const settings = CE.normalizeSettings({ cycleLength, periodLength })
    const days = CE.startPeriod([], lps, settings.periodLength)
    const state = CE.getCycleState(days, settings, t)
    if (!state?.hasData) return { hasData: false }
    const upcoming = CE.getUpcomingCycles(state, 2) || []
    const win = upcoming.find((c) => c?.fertileEnd && c.fertileEnd >= t) || null
    return {
      hasData: true,
      isLate: !!state.isLate,
      nextPeriodStart: state.nextPeriodStart || null,
      nextPeriodEnd: state.nextPeriodEnd || null,
      fertileStart: win?.fertileStart || null,
      fertileEnd: win?.fertileEnd || null,
    }
  } catch (err) {
    console.warn('Onboarding summary failed', err)
    return { hasData: false }
  }
}
