import { createContext, useContext } from 'react'
import useAppData from '../hooks/useAppData'

// One app-wide instance of useAppData. Screens read it with useApp()
// instead of receiving a dozen props through the navigator.
const AppDataContext = createContext(null)

export const AppDataProvider = ({ children }) => {
  const appData = useAppData()
  return <AppDataContext.Provider value={appData}>{children}</AppDataContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useApp must be used within AppDataProvider')
  return ctx
}
