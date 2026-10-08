import dayjs from 'dayjs'
import 'dayjs/locale/es'
import 'dayjs/locale/fr'
import 'dayjs/locale/pt-br'
import 'dayjs/locale/de'
import 'dayjs/locale/hi'
import 'dayjs/locale/ar'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/ru'
import 'dayjs/locale/id'
import 'dayjs/locale/sw'

// App language code → dayjs locale name.
const DAYJS_LOCALE = {
  en: 'en', es: 'es', fr: 'fr', pt: 'pt-br', de: 'de', hi: 'hi',
  ar: 'ar', zh: 'zh-cn', ru: 'ru', id: 'id', sw: 'sw',
}

export const ISO = 'YYYY-MM-DD'

export const toISO = (d) => dayjs(d).format(ISO)
export const todayISO = () => dayjs().format(ISO)

// Safe parse: returns null for anything that isn't a real date.
export const parseDate = (value) => {
  if (!value) return null
  const d = dayjs(value)
  return d.isValid() ? d : null
}

// Locale-aware formatting. Never throws; returns '' for invalid input.
//   formatDate('2026-10-08', 'ddd, MMM D', 'es') → "jue., oct. 8"
export const formatDate = (value, pattern = 'MMM D', lang = 'en') => {
  const d = parseDate(value)
  if (!d) return ''
  try {
    return d.locale(DAYJS_LOCALE[lang] || 'en').format(pattern)
  } catch {
    return d.format(pattern)
  }
}

// Short weekday initials for a calendar header, starting Sunday.
export const weekdayInitials = (lang = 'en') => {
  const base = dayjs('2026-10-04') // a Sunday
  return Array.from({ length: 7 }, (_, i) => formatDate(base.add(i, 'day'), 'dd', lang))
}

export const daysBetween = (a, b) => {
  const da = parseDate(a)
  const db = parseDate(b)
  if (!da || !db) return 0
  return db.startOf('day').diff(da.startOf('day'), 'day')
}
