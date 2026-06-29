import { createContext, useContext, useState, useEffect } from 'react'
import { saveData, loadData } from '../utils/storage'

const PremiumContext = createContext()

export const PremiumProvider = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const saved = await loadData('subscription', null)
      if (saved) {
        const expiry = new Date(saved.expiresAt)
        if (expiry > new Date()) {
          setIsPremium(true)
          setSubscription(saved)
        } else {
          await saveData('subscription', null)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const activatePremium = async (plan, paymentData) => {
    const now = new Date()
    const expiresAt = plan === 'yearly'
      ? new Date(now.setFullYear(now.getFullYear() + 1))
      : new Date(now.setMonth(now.getMonth() + 1))

    const sub = {
      plan,
      activatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      transactionId: paymentData?.transaction_id || 'manual',
      amount: paymentData?.amount || 0,
      currency: paymentData?.currency || 'KES',
    }

    setIsPremium(true)
    setSubscription(sub)
    await saveData('subscription', sub)
  }

  const cancelPremium = async () => {
    setIsPremium(false)
    setSubscription(null)
    await saveData('subscription', null)
  }

  const daysRemaining = subscription
    ? Math.max(0, Math.ceil(
        (new Date(subscription.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
      ))
    : 0

  return (
    <PremiumContext.Provider value={{
      isPremium,
      subscription,
      loading,
      activatePremium,
      cancelPremium,
      daysRemaining,
    }}>
      {children}
    </PremiumContext.Provider>
  )
}

export const usePremium = () => {
  const ctx = useContext(PremiumContext)
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider')
  return ctx
}
