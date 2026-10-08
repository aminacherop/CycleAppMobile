import { derivePeriods, normalizePeriodDays } from '../../utils/cycleEngine'

/**
 * Work out which period days change when the Edit period screen saves.
 *  current:    periodDays now stored (sorted 'YYYY-MM-DD'[])
 *  draft:      Set of days the user ticked
 *  rangeStart: first editable day (inclusive); rangeEnd: last editable day (today)
 * Days outside [rangeStart, rangeEnd] are kept as they are, except the still-
 * future "expected" remainder of a period whose latest past day was unticked
 * (otherwise a dangling future period would be left behind).
 * → { added: [], removed: [], next: [] }
 */
export const computePeriodEdits = (current, draft, rangeStart, rangeEnd) => {
  const cur = normalizePeriodDays(current || [])
  const ticked = draft instanceof Set ? draft : new Set(draft || [])
  const editable = (d) => d >= rangeStart && d <= rangeEnd

  const final = new Set(cur.filter((d) => !editable(d) || ticked.has(d)))
  ticked.forEach((d) => { if (editable(d)) final.add(d) })

  derivePeriods(cur).forEach((run) => {
    if (!(run.start <= rangeEnd && run.end > rangeEnd)) return
    const pastDays = cur.filter((d) => d >= run.start && d <= rangeEnd)
    const pastEnd = pastDays[pastDays.length - 1]
    if (pastEnd && !final.has(pastEnd)) {
      cur.forEach((d) => { if (d > rangeEnd && d <= run.end) final.delete(d) })
    }
  })

  const curSet = new Set(cur)
  const next = normalizePeriodDays([...final])
  return {
    added: next.filter((d) => !curSet.has(d)),
    removed: cur.filter((d) => !final.has(d)),
    next,
  }
}
