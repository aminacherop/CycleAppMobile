import { createContext, useContext, useState, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { saveData, loadData } from '../utils/storage'
import { PALETTES } from '../theme/palette'

const ThemeContext = createContext()

export const COLORS = PALETTES

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme()
  const [theme, setTheme] = useState('system')

  useEffect(() => {
    const load = async () => {
      const saved = await loadData('app_theme', 'system')
      if (['light', 'dark', 'system'].includes(saved)) setTheme(saved)
    }
    load()
  }, [])

  const changeTheme = async (t) => {
    setTheme(t)
    await saveData('app_theme', t)
  }

  const isDark = theme === 'dark' ||
    (theme === 'system' && systemScheme === 'dark')

  const colors = isDark ? COLORS.dark : COLORS.light

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
