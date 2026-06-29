import { createContext, useContext, useState, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { saveData, loadData } from '../utils/storage'

const ThemeContext = createContext()

export const COLORS = {
  light: {
    pink: '#C2527A',
    pinkLight: '#F8DDE6',
    pinkDark: '#9A3A5C',
    pinkAccent: '#D67A96',
    pinkSoft: '#FEF2F6',
    pinkMid: '#EAA8BC',
    background: '#FFF6F9',
    white: '#FFFFFF',
    border: '#F2E4EA',
    textPrimary: '#1A1A2E',
    textSecondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#7C3AED',
    card: '#FFFFFF',
  },
  dark: {
    pink: '#D67A96',
    pinkLight: '#3D1A28',
    pinkDark: '#F0A8BC',
    pinkAccent: '#E292A8',
    pinkSoft: '#2A1020',
    pinkMid: '#8A4A62',
    background: '#0F0A0C',
    white: '#1A1218',
    border: '#2A1E24',
    textPrimary: '#F5F0F2',
    textSecondary: '#9CA3AF',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#EF4444',
    purple: '#9D6FE8',
    card: '#1E1218',
  },
}

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme()
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const load = async () => {
      const saved = await loadData('app_theme', 'system')
      setTheme(saved)
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
