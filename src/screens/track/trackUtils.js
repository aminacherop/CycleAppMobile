// Pure helpers for the Track tab (no React / RN imports, so they can be
// checked with plain node).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 'YYYY-MM-DD' string or null. Never returns a date after `today`. */
export const sanitizeDate = (value, today) => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return today
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return today
  if (today && value > today) return today
  return value
}

/** Shift a 'YYYY-MM-DD' by n days (local calendar, DST-safe). */
export const shiftDate = (value, n) => {
  const [y, m, d] = String(value).split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

/**
 * Parse user-typed decimal ("36,6", " 36.6 ", "60") → number, '' → null,
 * anything else → NaN. Range-checked when min/max are given.
 */
export const parseDecimal = (text, { min = -Infinity, max = Infinity } = {}) => {
  if (text == null) return null
  const s = String(text).trim().replace(',', '.')
  if (s === '') return null
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return NaN
  const n = parseFloat(s)
  if (!Number.isFinite(n) || n < min || n > max) return NaN
  return Math.round(n * 100) / 100
}

/** Stored number (or numeric string) → text for an input. */
export const numberToText = (v) => {
  if (v == null || v === '') return ''
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? String(n) : ''
}

export const asNumber = (v) => {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export const asList = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x) : [])

export const toggleInList = (list, id) => {
  const arr = asList(list)
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
}

/** Plural helper: picks `${base}_one` for 1, `${base}_other` otherwise. */
export const tp = (t, base, n, extra = {}) =>
  t(n === 1 ? `${base}_one` : `${base}_other`, { n, ...extra })

/** "cottage_cheese" → "Cottage cheese" (fallback label for unknown ids). */
export const humanize = (id) => {
  const s = String(id || '').replace(/_/g, ' ').trim()
  return s ? s[0].toUpperCase() + s.slice(1) : ''
}

/** Periods needed before regularity can be shown (2 valid cycles = 3 period starts). */
export const periodsNeededForRegularity = (periodCount) => Math.max(1, 3 - (periodCount || 0))
