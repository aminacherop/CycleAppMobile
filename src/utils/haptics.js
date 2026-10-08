// Fire-and-forget haptics. Never throws: some devices have no vibrator, and
// a build without the native module must still run, so the module itself is
// loaded defensively and every call is guarded.
let Haptics = null
try {
  Haptics = require('expo-haptics')
} catch {
  Haptics = null
}

const safe = (fn) => {
  if (!Haptics) return
  try {
    const p = fn(Haptics)
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch {
    // ignore
  }
}

export const tapHaptic = () => safe((H) => H.selectionAsync())
export const lightHaptic = () => safe((H) => H.impactAsync(H.ImpactFeedbackStyle.Light))
export const mediumHaptic = () => safe((H) => H.impactAsync(H.ImpactFeedbackStyle.Medium))
export const successHaptic = () => safe((H) => H.notificationAsync(H.NotificationFeedbackType.Success))
export const warningHaptic = () => safe((H) => H.notificationAsync(H.NotificationFeedbackType.Warning))
