import { createContext, useContext, useState, useEffect } from 'react'
import { I18nManager } from 'react-native'
import * as Localization from 'expo-localization'
import { saveData, loadData } from '../utils/storage'
import { t as translate, LANGUAGES, resolveLanguage, isRTL } from '../utils/translations'

const LanguageContext = createContext()

// Detect the best supported language from the device locale (first run only).
const detectDeviceLanguage = () => {
  try {
    const locales = Localization.getLocales?.() || []
    const code = locales[0]?.languageCode || locales[0]?.languageTag
    return resolveLanguage(code)
  } catch {
    return 'en'
  }
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en')
  const [languageChosen, setLanguageChosen] = useState(false) // has the user explicitly picked?
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const saved = await loadData('app_language', null)
      const chosen = await loadData('app_language_chosen', false)
      const lang = saved || detectDeviceLanguage()
      // Keep RTL layout in sync with the resolved language on startup.
      I18nManager.allowRTL(true)
      if (I18nManager.isRTL !== isRTL(lang)) {
        I18nManager.forceRTL(isRTL(lang))
      }
      setLanguage(lang)
      setLanguageChosen(!!chosen)
      setLoading(false)
    }
    load()
  }, [])

  // Change language. Returns true if a restart is needed (RTL direction flipped).
  const changeLanguage = async (lang) => {
    const wasRTL = isRTL(language)
    const nowRTL = isRTL(lang)
    setLanguage(lang)
    await saveData('app_language', lang)
    if (!languageChosen) {
      setLanguageChosen(true)
      await saveData('app_language_chosen', true)
    }
    if (wasRTL !== nowRTL) {
      I18nManager.forceRTL(nowRTL)
      return true // caller should prompt an app restart for layout mirroring
    }
    return false
  }

  const t = (key, replacements = {}) => translate(language, key, replacements)

  return (
    <LanguageContext.Provider
      value={{ language, changeLanguage, t, loading, languageChosen, languages: LANGUAGES }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
