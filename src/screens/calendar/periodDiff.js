import {
  derivePeriods, normalizePeriodDays, addDays, diffDays, MAX_GAP_TO_MERGE, DEFAULT_PERIOD_LENGTH,
} from '../../utils/cycleEngine'

const fill = (from, to) => {
  const out = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

/**
 * Smart tap on the Edit period screen. `days` is the draft (any order).
 *  - empty day away from any period → new period of `periodLength` days
 *    (stops short of the next period so the two never merge)
 *  - empty day next to a period (or inside its gap) → extends that period
 *  - first day of a period → removes the whole period (removed: true, for Undo)
 *  - later day of a period → the period ends the day before
 * → { days: sorted 'YYYY-MM-DD'[], removed: boolean }
 */
export const applyDayTap = (days, date, periodLength = DEFAULT_PERIOD_LENGTH) => {
  const cur = normalizePeriodDays(days)
  const runs = derivePeriods(cur)
  const reach = MAX_GAP_TO_MERGE + 1 // a run absorbs days this close to its edge

  if (cur.includes(date)) {
    const run = runs.find((p) => date >= p.start && date <= p.end)
    if (run && date === run.start) {
      return { days: cur.filter((d) => d < run.start || d > run.end), removed: true }
    }
    return { days: cur.filter((d) => !(run && d >= date && d <= run.end)), removed: false }
  }

  const inside = runs.find((p) => date > p.start && date < p.end)
  if (inside) return { days: normalizePeriodDays([...cur, date]), removed: false }

  const prev = runs.filter((p) => p.end < date).pop()
  const next = runs.find((p) => p.start > date)
  if (prev && diffDays(prev.end, date) <= reach) {
    return { days: normalizePeriodDays([...cur, ...fill(addDays(prev.end, 1), date)]), removed: false }
  }
  if (next && diffDays(date, next.start) <= reach) {
    return { days: normalizePeriodDays([...cur, ...fill(date, addDays(next.start, -1))]), removed: false }
  }

  const len = Math.max(1, Math.round(Number(periodLength)) || DEFAULT_PERIOD_LENGTH)
  let end = addDays(date, len - 1)
  if (next) {
    const limit = addDays(next.start, -(reach + 1))
    if (end > limit) end = limit < date ? date : limit
  }
  return { days: normalizePeriodDays([...cur, ...fill(date, end)]), removed: false }
}

/**
 * Work out which period days change when the Edit period screen saves.
 * The draft starts as a full copy of the stored days, so it is the complete
 * new state (including expected future days of a period in progress).
 * → { added: [], removed: [], next: [] }
 */
export const computePeriodEdits = (current, draft) => {
  const cur = normalizePeriodDays(current || [])
  const next = normalizePeriodDays(draft instanceof Set ? [...draft] : (draft || []))
  const curSet = new Set(cur)
  const nextSet = new Set(next)
  return {
    added: next.filter((d) => !curSet.has(d)),
    removed: cur.filter((d) => !nextSet.has(d)),
    next,
  }
}
