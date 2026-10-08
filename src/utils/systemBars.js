import { Platform } from 'react-native'

// Keep Android's navigation bar and the window background in step with the
// in-app theme. Both modules are optional at runtime: an older native build
// without them must still run, so everything is loaded and called defensively.
let NavigationBar = null
let SystemUI = null
try { NavigationBar = require('expo-navigation-bar') } catch { NavigationBar = null }
try { SystemUI = require('expo-system-ui') } catch { SystemUI = null }

export const applySystemBars = ({ isDark, background }) => {
  if (Platform.OS !== 'android') return
  try {
    NavigationBar?.setStyle?.(isDark ? 'dark' : 'light')
  } catch {
    // ignore
  }
  try {
    const p = SystemUI?.setBackgroundColorAsync?.(background)
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch {
    // ignore
  }
}
