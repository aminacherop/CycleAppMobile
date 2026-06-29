import { saveData, loadData } from './storage'

// Generate a readable 6-digit code like CYC-847291
export const generatePairingCode = () => {
  const digits = Math.floor(100000 + Math.random() * 900000)
  return `CYC-${digits}`
}

// Save pairing code with 7 day expiry
export const createPairingCode = async (cycleSettings, userProfile) => {
  const code = generatePairingCode()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const pairingData = {
    code,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    userName: userProfile?.name || 'Your partner',
    // Only safe data shared with partner
    sharedData: {
      cycleLength: cycleSettings?.cycleLength || 28,
      periodLength: cycleSettings?.periodLength || 5,
      lastPeriodStart: cycleSettings?.lastPeriodStart,
    }
  }

  await saveData('pairing_code', pairingData)
  return pairingData
}

// Load existing pairing code
export const loadPairingCode = async () => {
  const data = await loadData('pairing_code', null)
  if (!data) return null

  // Check if expired
  const now = new Date()
  const expiry = new Date(data.expiresAt)
  if (expiry < now) {
    await saveData('pairing_code', null)
    return null
  }

  return data
}

// Partner enters code — validate it
export const validatePairingCode = async (enteredCode) => {
  const data = await loadData('pairing_code', null)
  if (!data) return { valid: false, reason: 'Code not found' }

  const now = new Date()
  const expiry = new Date(data.expiresAt)
  if (expiry < now) {
    return { valid: false, reason: 'Code has expired' }
  }

  const normalised = enteredCode.toUpperCase().replace(/\s/g, '')
  const stored = data.code.replace('-', '').replace(/\s/g, '')
  const entered = normalised.replace('CYC', '').replace('-', '')

  if (stored.includes(entered) || normalised === data.code) {
    return { valid: true, data }
  }

  return { valid: false, reason: 'Invalid code' }
}

// Save partner pairing on partner's device
export const savePartnerPairing = async (pairingData) => {
  await saveData('partner_pairing', {
    ...pairingData,
    pairedAt: new Date().toISOString(),
  })
}

export const loadPartnerPairing = async () => {
  return loadData('partner_pairing', null)
}

export const removePartnerPairing = async () => {
  await saveData('partner_pairing', null)
}

// Days remaining on code
export const getDaysRemaining = (expiresAt) => {
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diff = expiry - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}