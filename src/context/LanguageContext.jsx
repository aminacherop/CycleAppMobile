import { createContext, useContext, useState, useEffect } from 'react'
import { saveData, loadData } from '../utils/storage'
import { t as translate } from '../utils/translations'

const LanguageContext = createContext()

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const saved = await loadData('app_language', 'en')
      setLanguage(saved)
      setLoading(false)
    }
    load()
  }, [])

  const changeLanguage = async (lang) => {
    setLanguage(lang)
    await saveData('app_language', lang)
  }

  const t = (key, replacements = {}) => translate(language, key, replacements)

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, loading }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}