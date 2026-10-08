/**
 * cycleEngine.js — the single source of truth for cycle maths.
 *
 * Pure functions only (dayjs is the only dependency, no React Native imports),
 * so this file can be exercised from plain node.
 *
 * Data model
 * ----------
 * periodDays: sorted, de-duplicated array of 'YYYY-MM-DD' strings — every day
 * the user bled (logged or marked on the calendar). A "period" is a run of
 * consecutive days; a single missing day inside a run is tolerated (merged).
 *
 * settings: the user's DEFAULTS { cycleLength, periodLength, lutealLength? }.
 * They are only used until enough real history exists to learn from.
 */
import dayjs from 'dayjs'

// ─── constants ──────────────────────────────────────────────────────────────
export const DEFAULT_CYCLE_LENGTH = 28
export const DEFAULT_PERIOD_LENGTH = 5
export const DEFAULT_LUTEAL_LENGTH = 14
export const MIN_VALID_CYCLE = 15
export const MAX_VALID_CYCLE = 60
export const MAX_GAP_TO_MERGE = 1 // missing days tolerated inside one period
export const FUTURE_CYCLES_TO_PREDICT = 6
export const MIN_OVULATION_CYCLE_DAY = 8
export const PREGNANCY_LENGTH_DAYS = 280

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86400000

// ─── date helpers (UTC day numbers → immune to DST/timezone drift) ─────────
const toDayNum = (s) => {
  const y = +s.slice(0, 4)
  const m = +s.slice(5, 7)
  const d = +s.slice(8, 10)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}
const fromDayNum = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10)

/** Normalise anything date-like (string, Date, dayjs) to 'YYYY-MM-DD' (local). */
export const toDateStr = (d) => {
  if (d == null || d === '') return null
  if (typeof d === 'string' && DATE_RE.test(d)) return d
  const parsed = dayjs(d)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null
}
export const isValidDateStr = (s) =>
  typeof s === 'string' && DATE_RE.test(s) && fromDayNum(toDayNum(s)) === s

export const addDays = (s, n) => fromDayNum(toDayNum(s) + n)
/** Whole days from a to b (b - a). */
export const diffDays = (a, b) => toDayNum(b) - toDayNum(a)
const todayStr = (today) => toDateStr(today) || dayjs().format('YYYY-MM-DD')
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// ─── settings ───────────────────────────────────────────────────────────────
export const normalizeSettings = (settings = {}) => {
  const c = Math.round(Number(settings?.cycleLength))
  const p = Math.round(Number(settings?.periodLength))
  const l = Math.round(Number(settings?.lutealLength))
  return {
    cycleLength: Number.isFinite(c) && c > 0 ? clamp(c, MIN_VALID_CYCLE, MAX_VALID_CYCLE) : DEFAULT_CYCLE_LENGTH,
    periodLength: Number.isFinite(p) && p > 0 ? clamp(p, 1, 15) : DEFAULT_PERIOD_LENGTH,
    lutealLength: Number.isFinite(l) && l > 0 ? clamp(l, 9, 18) : DEFAULT_LUTEAL_LENGTH,
  }
}

/** Days from period start to ovulation for a cycle of `cycleLength` days. */
export const ovulationOffset = (cycleLength, lutealLength = DEFAULT_LUTEAL_LENGTH) =>
  Math.max(MIN_OVULATION_CYCLE_DAY - 1, cycleLength - lutealLength)

const windowFromOvulation = (ov) => ({
  ovulationDate: ov,
  fertileStart: addDays(ov, -5),
  fertileEnd: addDays(ov, 1),
})

// ─── period days → periods ──────────────────────────────────────────────────
/** Sort, validate and de-duplicate a list of day strings. */
export const normalizePeriodDays = (days) => {
  if (!Array.isArray(days)) return []
  const set = new Set()
  for (const d of days) {
    const s = toDateStr(d)
    if (s && isValidDateStr(s)) set.add(s)
  }
  return [...set].sort()
}

/** periodDays → [{ start, end, length }] (runs of consecutive days, 1-day gaps merged). */
export const derivePeriods = (periodDays) => {
  const days = normalizePeriodDays(periodDays)
  const periods = []
  let cur = null
  for (const d of days) {
    if (cur && diffDays(cur.end, d) <= MAX_GAP_TO_MERGE + 1) {
      cur.end = d
    } else {
      if (cur) periods.push(cur)
      cur = { start: d, end: d }
    }
  }
  if (cur) periods.push(cur)
  return periods.map(p => ({ ...p, length: diffDays(p.start, p.end) + 1 }))
}

const startedPeriods = (periodDays, today) =>
  derivePeriods(periodDays).filter(p => p.start <= today)

// ─── history & averages ─────────────────────────────────────────────────────
/**
 * Returns {
 *   completed: [{ start, end, cycleLength, periodLength, nextStart, ovulationDate, fertileStart, fertileEnd }],
 *   current:   { start, end, periodLength, cycleDay } | null,
 * }
 * `end` is the period's last day. Periods that start after `today` are ignored.
 */
export const getCycleHistory = (periodDays, settings, today) => {
  const t = todayStr(today)
  const s = normalizeSettings(settings)
  const periods = startedPeriods(periodDays, t)
  const completed = []
  for (let i = 0; i < periods.length - 1; i++) {
    const p = periods[i]
    const next = periods[i + 1]
    const cycleLength = diffDays(p.start, next.start)
    completed.push({
      start: p.start,
      end: p.end,
      nextStart: next.start,
      cycleLength,
      periodLength: p.length,
      ...windowFromOvulation(addDays(p.start, ovulationOffset(cycleLength, s.lutealLength))),
    })
  }
  const last = periods[periods.length - 1]
  const current = last
    ? { start: last.start, end: last.end, periodLength: last.length, cycleDay: diffDays(last.start, t) + 1 }
    : null
  return { completed, current }
}

const weightedAverage = (values) => {
  const recent = values.slice(-6)
  let sum = 0
  let wsum = 0
  recent.forEach((v, i) => { sum += v * (i + 1); wsum += i + 1 })
  return wsum ? Math.round(sum / wsum) : null
}

const regularityScore = (lengths) => {
  if (lengths.length < 2) return null
  const recent = lengths.slice(-12)
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length
  const variance = recent.reduce((acc, v) => acc + (v - avg) ** 2, 0) / recent.length
  return clamp(Math.round(100 - (Math.sqrt(variance) / 8) * 100), 0, 100)
}

/**
 * Returns {
 *   cycleLength, periodLength, lutealLength,
 *   source: 'learned' | 'default',          // for cycleLength
 *   periodLengthSource: 'learned' | 'default',
 *   cyclesUsed,                             // valid completed cycles (15–60 days)
 *   regularity: 0-100 | null,
 *   cycleLengths: number[],                 // valid completed cycle lengths, oldest first
 *   minCycleLength, maxCycleLength,         // null when no valid cycles
 * }
 * Accepts either (periodDays, settings, today) or a precomputed history as first arg.
 */
export const getAverages = (periodDays, settings, today) => {
  const t = todayStr(today)
  const s = normalizeSettings(settings)
  const history = Array.isArray(periodDays) || periodDays == null
    ? getCycleHistory(periodDays || [], settings, t)
    : periodDays
  const valid = history.completed
    .map(c => c.cycleLength)
    .filter(l => l >= MIN_VALID_CYCLE && l <= MAX_VALID_CYCLE)

  const learnedCycle = valid.length >= 2
  // Period lengths: completed periods only (the current one may still be running).
  const periodLengths = history.completed.map(c => c.periodLength).filter(l => l >= 1 && l <= 15)
  if (history.current && history.current.end < t) periodLengths.push(history.current.periodLength)
  const learnedPeriod = periodLengths.length >= 2

  return {
    cycleLength: learnedCycle ? weightedAverage(valid) : s.cycleLength,
    periodLength: learnedPeriod ? weightedAverage(periodLengths) : s.periodLength,
    lutealLength: s.lutealLength,
    source: learnedCycle ? 'learned' : 'default',
    periodLengthSource: learnedPeriod ? 'learned' : 'default',
    cyclesUsed: valid.length,
    regularity: regularityScore(valid),
    cycleLengths: valid,
    minCycleLength: valid.length ? Math.min(...valid) : null,
    maxCycleLength: valid.length ? Math.max(...valid) : null,
  }
}

// ─── current state ──────────────────────────────────────────────────────────
const EMPTY_STATE = {
  hasData: false,
  today: null,
  cycleDay: null,
  phase: 'unknown',
  lastPeriodStart: null,
  lastPeriodEnd: null,
  nextPeriodStart: null,
  nextPeriodEnd: null,
  daysUntilNextPeriod: null,
  isLate: false,
  daysLate: 0,
  isStale: false,
  ovulationDate: null,
  fertileStart: null,
  fertileEnd: null,
  isOnPeriod: false,
  currentPeriodEnd: null,
  expectedPeriodEnd: null,
  cycleLength: null,
  periodLength: null,
}

/** Phase for a cycle day given the cycle's ovulation/fertile dates. */
const phaseFor = (date, { periodStart, periodEnd, ovulationDate, fertileStart, fertileEnd }) => {
  if (date >= periodStart && date <= periodEnd) return 'period'
  if (date === ovulationDate) return 'ovulation'
  if (date >= fertileStart && date <= fertileEnd) return 'fertile'
  if (date < fertileStart) return 'follicular'
  return 'luteal'
}

/**
 * The single "where am I in my cycle" answer. The next period is NEVER rolled
 * forward past today: once today is after the predicted start, isLate=true.
 *
 * Returns {
 *   hasData, today, cycleDay, phase: 'period'|'follicular'|'fertile'|'ovulation'|'luteal'|'late'|'unknown',
 *   lastPeriodStart, lastPeriodEnd, nextPeriodStart, nextPeriodEnd,
 *   daysUntilNextPeriod (0 when due today or late), isLate, daysLate,
 *   ovulationDate, fertileStart, fertileEnd,          // current cycle's estimate
 *   isOnPeriod, currentPeriodEnd (last logged day, when on period),
 *   expectedPeriodEnd (when on period: max(logged end, start+avgPeriodLength-1)),
 *   cycleLength, periodLength, averages,
 * }
 */
export const getCycleState = (periodDays, settings, today) => {
  const t = todayStr(today)
  const history = getCycleHistory(periodDays, settings, t)
  const averages = getAverages(history, settings, t)
  const cur = history.current
  if (!cur) return { ...EMPTY_STATE, today: t, averages }

  const L = averages.cycleLength
  const PL = averages.periodLength
  const cycleDay = diffDays(cur.start, t) + 1
  const nextPeriodStart = addDays(cur.start, L)
  const win = windowFromOvulation(addDays(cur.start, ovulationOffset(L, averages.lutealLength)))

  // On period only if today is inside the logged run. Logging a start already
  // fills in the expected days, and "period ended" trims them, so guessing
  // beyond the run would override the user's explicit end.
  const isOnPeriod = t >= cur.start && t <= cur.end
  const expectedPeriodEnd = isOnPeriod
    ? (cur.end > addDays(cur.start, PL - 1) ? cur.end : addDays(cur.start, PL - 1))
    : null

  const isLate = t > nextPeriodStart
  const daysLate = isLate ? diffDays(nextPeriodStart, t) : 0
  // Late by more than a whole extra cycle: the data is almost certainly just
  // out of date (user stopped logging), not a real late period.
  const isStale = isLate && daysLate > Math.max(30, L)

  let phase
  if (isOnPeriod) phase = 'period'
  else if (isLate) phase = 'late'
  else phase = phaseFor(t, { periodStart: cur.start, periodEnd: cur.end, ...win })

  return {
    hasData: true,
    today: t,
    cycleDay,
    phase,
    lastPeriodStart: cur.start,
    lastPeriodEnd: cur.end,
    nextPeriodStart,
    nextPeriodEnd: addDays(nextPeriodStart, PL - 1),
    daysUntilNextPeriod: isLate ? 0 : diffDays(t, nextPeriodStart),
    isLate,
    daysLate,
    isStale,
    ...win,
    isOnPeriod,
    currentPeriodEnd: isOnPeriod ? cur.end : null,
    expectedPeriodEnd,
    cycleLength: L,
    periodLength: PL,
    averages,
  }
}

/**
 * Upcoming predicted cycles (empty while late or without data).
 * Item i: the period starting at nextPeriodStart + i*L, together with the
 * ovulation / fertile window of the cycle that ENDS at that period
 * (so item 0 carries the current cycle's ovulation).
 * → [{ periodStart, periodEnd, ovulationDate, fertileStart, fertileEnd }]
 */
export const getUpcomingCycles = (state, count = 3) => {
  if (!state?.hasData || state.isLate) return []
  const L = state.cycleLength
  const PL = state.periodLength
  const off = ovulationOffset(L, state.averages?.lutealLength)
  const out = []
  for (let i = 0; i < count; i++) {
    const periodStart = addDays(state.nextPeriodStart, i * L)
    const cycleStart = addDays(periodStart, -L)
    out.push({
      periodStart,
      periodEnd: addDays(periodStart, PL - 1),
      ...windowFromOvulation(addDays(cycleStart, off)),
    })
  }
  return out
}

// ─── per-day info (calendar) ────────────────────────────────────────────────
/**
 * Precompute everything needed to answer many getDayInfo() calls cheaply.
 * Pass the result as the last arg of getDayInfo / getConceptionChance / getMonthGrid.
 */
export const buildCycleContext = (periodDays, settings, today) => {
  const t = todayStr(today)
  const days = normalizePeriodDays(periodDays)
  const state = getCycleState(days, settings, t)
  const history = getCycleHistory(days, settings, t)

  // Every cycle we know or predict: { start, periodEnd, ovulationDate, fertileStart, fertileEnd, end (last day of cycle) | null, kind }
  const cycles = history.completed.map(c => ({
    kind: 'actual',
    start: c.start,
    periodEnd: c.end,
    end: addDays(c.nextStart, -1),
    ovulationDate: c.ovulationDate,
    fertileStart: c.fertileStart,
    fertileEnd: c.fertileEnd,
  }))
  const predictedPeriodDays = new Set()
  if (state.hasData) {
    const L = state.cycleLength
    const PL = state.periodLength
    cycles.push({
      kind: 'current',
      start: state.lastPeriodStart,
      periodEnd: state.lastPeriodEnd,
      // While late the current cycle is open-ended.
      end: state.isLate ? null : addDays(state.nextPeriodStart, -1),
      // While late, the ovulation estimate is known to be wrong — don't show it.
      ovulationDate: state.isLate ? null : state.ovulationDate,
      fertileStart: state.isLate ? null : state.fertileStart,
      fertileEnd: state.isLate ? null : state.fertileEnd,
      // Original estimate, used only to label phases (e.g. for insights) while late.
      phaseWindow: { ovulationDate: state.ovulationDate, fertileStart: state.fertileStart, fertileEnd: state.fertileEnd },
    })
    // Remaining expected days of a period in progress.
    if (state.isOnPeriod) {
      for (let d = addDays(state.lastPeriodEnd, 1); d <= state.expectedPeriodEnd; d = addDays(d, 1)) {
        if (d >= t) predictedPeriodDays.add(d)
      }
    }
    if (!state.isLate) {
      const upcoming = getUpcomingCycles(state, FUTURE_CYCLES_TO_PREDICT + 1)
      upcoming.forEach((u, i) => {
        for (let d = u.periodStart; d <= u.periodEnd; d = addDays(d, 1)) predictedPeriodDays.add(d)
        const next = upcoming[i + 1]
        if (!next) return // only use as the end marker for the previous cycle
        cycles.push({
          kind: 'predicted',
          start: u.periodStart,
          periodEnd: u.periodEnd,
          end: addDays(u.periodStart, L - 1),
          ovulationDate: next.ovulationDate,
          fertileStart: next.fertileStart,
          fertileEnd: next.fertileEnd,
        })
      })
      // Drop the last predicted period block (beyond the horizon of cycles we describe).
      const lastPredicted = upcoming[upcoming.length - 1]
      if (lastPredicted) {
        for (let d = lastPredicted.periodStart; d <= lastPredicted.periodEnd; d = addDays(d, 1)) predictedPeriodDays.delete(d)
      }
    }
  }
  return {
    today: t,
    periodDaySet: new Set(days),
    state,
    history,
    cycles, // sorted by start
    predictedPeriodDays,
    ovulations: cycles.map(c => c.ovulationDate).filter(Boolean),
  }
}

const findCycle = (ctx, date) => {
  let found = null
  for (const c of ctx.cycles) {
    if (c.start > date) break
    found = c
  }
  if (!found) return null
  if (found.end && date > found.end) return null // beyond prediction horizon
  return found
}

/**
 * Returns {
 *   date, isPeriod (logged), isPredictedPeriod, isFertile, isOvulation,
 *   isToday, isFuture, isPast, cycleDay | null,
 *   phase: 'period'|'follicular'|'fertile'|'ovulation'|'luteal'|'late'|null,
 *   isLateWindow (today-or-earlier day after the missed predicted start),
 *   isPredicted (true when fertile/ovulation/phase come from a prediction, not history)
 * }
 * Past days are only ever marked as period from logged data.
 */
export const getDayInfo = (date, periodDays, settings, today, ctx) => {
  const c = ctx || buildCycleContext(periodDays, settings, today)
  const d = toDateStr(date)
  const t = c.today
  const isPeriod = c.periodDaySet.has(d)
  const isPredictedPeriod = !isPeriod && d >= t && c.predictedPeriodDays.has(d)
  let cycle = findCycle(c, d)
  // While late we don't know where future days fall — don't number them.
  if (cycle && cycle.kind === 'current' && c.state.isLate && d > t) cycle = null
  const cycleDay = cycle ? diffDays(cycle.start, d) + 1 : null

  let isFertile = false
  let isOvulation = false
  let phase = null
  if (cycle) {
    if (cycle.ovulationDate) {
      isOvulation = d === cycle.ovulationDate
      isFertile = d >= cycle.fertileStart && d <= cycle.fertileEnd
    }
    if (isPeriod || isPredictedPeriod || (d >= cycle.start && d <= cycle.periodEnd)) phase = 'period'
    else if (cycle.kind === 'current' && c.state.isLate && d > c.state.nextPeriodStart) phase = 'late'
    else if (cycle.ovulationDate) phase = phaseFor(d, { periodStart: cycle.start, periodEnd: cycle.periodEnd, ...cycle })
    else phase = phaseFor(d, { periodStart: cycle.start, periodEnd: cycle.periodEnd, ...cycle.phaseWindow })
  }
  const isLateWindow = !!(c.state.isLate && d <= t && d > c.state.nextPeriodStart)

  return {
    date: d,
    isPeriod,
    isPredictedPeriod,
    isFertile: isFertile && !isPeriod,
    isOvulation,
    isToday: d === t,
    isFuture: d > t,
    isPast: d < t,
    cycleDay,
    phase,
    isLateWindow,
    isPredicted: !!cycle && cycle.kind !== 'actual',
  }
}

/**
 * Calendar month helper. month is 1-12.
 * Returns { year, month, days: [dayInfo...], leadingBlanks (Sunday-first), weeks: [[dayInfo|null x7]...] }
 */
export const getMonthGrid = (year, month, periodDays, settings, today, ctx, { weekStartsOn = 0 } = {}) => {
  const c = ctx || buildCycleContext(periodDays, settings, today)
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const daysInMonth = dayjs(first).daysInMonth()
  const days = []
  for (let i = 0; i < daysInMonth; i++) days.push(getDayInfo(addDays(first, i), null, null, null, c))
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const leadingBlanks = (firstWeekday - weekStartsOn + 7) % 7
  const cells = [...Array(leadingBlanks).fill(null), ...days]
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return { year, month, days, leadingBlanks, weeks }
}

// ─── conception chance ──────────────────────────────────────────────────────
export const CONCEPTION_LEVELS = ['Peak', 'High', 'Medium', 'Low', 'Minimal']

/**
 * 'Peak' | 'High' | 'Medium' | 'Low' | 'Minimal' | null (no estimate).
 * Based on the distance to the nearest known/predicted ovulation, so it works
 * across month and cycle boundaries. Logged period days are always 'Minimal'.
 */
export const getConceptionChance = (date, periodDays, settings, today, ctx) => {
  const c = ctx || buildCycleContext(periodDays, settings, today)
  const d = toDateStr(date)
  if (c.periodDaySet.has(d)) return 'Minimal'
  if (!c.ovulations.length) return null
  let best = null
  for (const ov of c.ovulations) {
    const dist = diffDays(ov, d) // negative = before ovulation
    if (best === null || Math.abs(dist) < Math.abs(best)) best = dist
  }
  if (Math.abs(best) > 20) return null // too far from any estimate (e.g. late / no prediction)
  if (best === 0 || best === -1) return 'Peak'
  if (best === -2 || best === -3) return 'High'
  if (best === -4 || best === -5 || best === 1) return 'Medium'
  if (best === -6 || best === -7 || best === 2) return 'Low'
  return 'Minimal'
}

// ─── editing helpers (pure: return a NEW sorted array) ──────────────────────
const daysBetween = (start, end) => {
  const out = []
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
  return out
}

export const togglePeriodDay = (periodDays, date) => {
  const d = toDateStr(date)
  const days = normalizePeriodDays(periodDays)
  return days.includes(d) ? days.filter(x => x !== d) : normalizePeriodDays([...days, d])
}

export const addPeriodDays = (periodDays, dates) => normalizePeriodDays([...(periodDays || []), ...dates])
export const removePeriodDays = (periodDays, dates) => {
  const rm = new Set(dates.map(toDateStr))
  return normalizePeriodDays(periodDays).filter(d => !rm.has(d))
}

/** The period run containing `date` (with 1-day-gap merging), or null. */
export const findPeriodContaining = (periodDays, date) => {
  const d = toDateStr(date)
  return derivePeriods(periodDays).find(p => d >= p.start && d <= p.end) || null
}

/**
 * Make [start, end] exactly one period: removes any existing period that
 * overlaps or touches the range, then fills the range.
 */
export const setPeriodRange = (periodDays, start, end) => {
  let s = toDateStr(start)
  let e = toDateStr(end) || s
  if (e < s) [s, e] = [e, s]
  const days = normalizePeriodDays(periodDays)
  const lo = addDays(s, -1)
  const hi = addDays(e, 1)
  const overlapping = derivePeriods(days).filter(p => p.end >= lo && p.start <= hi)
  const rm = new Set(overlapping.flatMap(p => daysBetween(p.start, p.end)))
  return normalizePeriodDays([...days.filter(d => !rm.has(d)), ...daysBetween(s, e)])
}

/** Add date .. date+length-1 (future days included as the expected period). */
export const startPeriod = (periodDays, date, defaultLength = DEFAULT_PERIOD_LENGTH) => {
  const s = toDateStr(date)
  const len = clamp(Math.round(Number(defaultLength)) || DEFAULT_PERIOD_LENGTH, 1, 15)
  return addPeriodDays(periodDays, daysBetween(s, addDays(s, len - 1)))
}

/**
 * Period ended ON `date` (inclusive). If `date` is inside a period, days after
 * it in that run are removed. If `date` is shortly after a period's last day
 * (same cycle, < 15 days from its start), the gap is filled up to `date`.
 */
export const endPeriod = (periodDays, date) => {
  const d = toDateStr(date)
  const days = normalizePeriodDays(periodDays)
  const periods = derivePeriods(days)
  const containing = periods.find(p => d >= p.start && d <= p.end)
  if (containing) return days.filter(x => !(x > d && x <= containing.end))
  const before = periods.filter(p => p.start <= d).pop()
  if (before && diffDays(before.start, d) < 15) {
    return addPeriodDays(days, daysBetween(addDays(before.end, 1), d))
  }
  return days
}

/**
 * A day was logged as "no flow": remove it, plus any still-FUTURE days that
 * directly follow it in the same run (they were only the expected remainder).
 */
export const clearPeriodDay = (periodDays, date, today) => {
  const d = toDateStr(date)
  const t = todayStr(today)
  const days = normalizePeriodDays(periodDays)
  const run = findPeriodContaining(days, d)
  return days.filter(x => x !== d && !(run && x > d && x <= run.end && x > t))
}

/** Remove the whole period (run) that contains `start`. */
export const removePeriod = (periodDays, start) => {
  const p = findPeriodContaining(periodDays, start)
  if (!p) return normalizePeriodDays(periodDays)
  return normalizePeriodDays(periodDays).filter(d => d < p.start || d > p.end)
}

// ─── legacy data → periodDays (used by migration & legacy fallbacks) ───────
/** true for a flow value that means a period day (spotting/none don't count). */
export const isBleedingFlow = (flow) => {
  if (!flow || typeof flow !== 'string') return false
  const f = flow.toLowerCase()
  if (f === 'none' || f === 'spotting' || f === 'no' || f === 'null' || f === '') return false
  // light/medium/heavy plus any unknown non-empty value from older app versions.
  return true
}

/**
 * Build periodDays from the old storage shape:
 *  1. every daily_logs day with a bleeding flow,
 *  2. cycle_settings.lastPeriodStart + periodLength days (only days <= today)
 *     unless that period is already covered by logged days.
 * Merges into `existingDays` (idempotent).
 */
export const buildPeriodDaysFromLegacy = (dailyLogs, cycleSettings, today, existingDays = []) => {
  const t = todayStr(today)
  const days = new Set(normalizePeriodDays(existingDays))
  Object.entries(dailyLogs || {}).forEach(([date, log]) => {
    if (isValidDateStr(date) && date <= t && isBleedingFlow(log?.flow)) days.add(date)
  })
  const lps = toDateStr(cycleSettings?.lastPeriodStart)
  if (lps && isValidDateStr(lps) && lps <= t) {
    const pl = normalizeSettings(cycleSettings).periodLength
    // Covered = any marked day from 3 days before lps through the expected end.
    const lo = addDays(lps, -3)
    const hi = addDays(lps, pl - 1)
    const covered = [...days].some(d => d >= lo && d <= hi)
    if (!covered) daysBetween(lps, hi).filter(d => d <= t).forEach(d => days.add(d))
  }
  return normalizePeriodDays([...days])
}

// ─── pregnancy ──────────────────────────────────────────────────────────────
/**
 * Progress from the LAST MENSTRUAL PERIOD (LMP). LMP in the future is clamped
 * to today; anything older than 44 weeks is clamped too.
 * Returns {
 *   lmp, dueDate (LMP+280), daysPregnant, weeks, days, trimester (1|2|3),
 *   daysRemaining (>= 0), progress (0..1), isOverdue, wasClamped
 * } or null when lmpDate is missing/invalid.
 */
export const getPregnancyProgress = (lmpDate, today) => {
  const t = todayStr(today)
  let lmp = toDateStr(lmpDate)
  if (!lmp || !isValidDateStr(lmp)) return null
  let wasClamped = false
  if (lmp > t) { lmp = t; wasClamped = true }
  const maxDays = 44 * 7
  if (diffDays(lmp, t) > maxDays) { lmp = addDays(t, -maxDays); wasClamped = true }
  const daysPregnant = diffDays(lmp, t)
  const weeks = Math.floor(daysPregnant / 7)
  const dueDate = addDays(lmp, PREGNANCY_LENGTH_DAYS)
  return {
    lmp,
    dueDate,
    daysPregnant,
    weeks,
    days: daysPregnant % 7,
    trimester: weeks < 13 ? 1 : weeks < 27 ? 2 : 3,
    daysRemaining: Math.max(0, diffDays(t, dueDate)),
    progress: clamp(daysPregnant / PREGNANCY_LENGTH_DAYS, 0, 1),
    isOverdue: t > dueDate,
    wasClamped,
  }
}

/** Clamp a user-picked LMP into [today-44w, today]. */
export const clampLmpDate = (lmpDate, today) => getPregnancyProgress(lmpDate, today)?.lmp || null
