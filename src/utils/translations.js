import en from './locales/en'
import es from './locales/es'
import fr from './locales/fr'
import pt from './locales/pt'
import de from './locales/de'
import hi from './locales/hi'
import ar from './locales/ar'
import zh from './locales/zh'
import ru from './locales/ru'
import id from './locales/id'
import sw from './locales/sw'

export const translations = { en, es, fr, pt, de, hi, ar, zh, ru, id, sw }

// Language registry — order defines how they appear in the picker.
// `rtl: true` triggers right-to-left layout (Arabic).
export const LANGUAGES = [
  { code: 'en', name: 'English',    nativeName: 'English',           flag: '🇬🇧', rtl: false },
  { code: 'es', name: 'Spanish',    nativeName: 'Español',           flag: '🇪🇸', rtl: false },
  { code: 'fr', name: 'French',     nativeName: 'Français',          flag: '🇫🇷', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português',         flag: '🇧🇷', rtl: false },
  { code: 'de', name: 'German',     nativeName: 'Deutsch',           flag: '🇩🇪', rtl: false },
  { code: 'hi', name: 'Hindi',      nativeName: 'हिन्दी',              flag: '🇮🇳', rtl: false },
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',            flag: '🇸🇦', rtl: true  },
  { code: 'zh', name: 'Chinese',    nativeName: '中文',               flag: '🇨🇳', rtl: false },
  { code: 'ru', name: 'Russian',    nativeName: 'Русский',           flag: '🇷🇺', rtl: false },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia',  flag: '🇮🇩', rtl: false },
  { code: 'sw', name: 'Swahili',    nativeName: 'Kiswahili',         flag: '🇰🇪', rtl: false },
]

export const SUPPORTED_CODES = LANGUAGES.map(l => l.code)

export const isRTL = (lang) => !!LANGUAGES.find(l => l.code === lang)?.rtl

// Resolve a device locale (e.g. "es-MX", "pt_BR") to a supported code, else 'en'.
export const resolveLanguage = (locale) => {
  if (!locale) return 'en'
  const base = String(locale).toLowerCase().split(/[-_]/)[0]
  return SUPPORTED_CODES.includes(base) ? base : 'en'
}

export const t = (lang, key, replacements = {}) => {
  const text = translations[lang]?.[key] || translations['en']?.[key] || key
  return Object.entries(replacements).reduce(
    (str, [k, v]) => str.replace(`{${k}}`, v),
    text
  )
}
