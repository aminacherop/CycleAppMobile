import { AppState, Linking, Platform } from 'react-native'
import { loadData, saveData } from './storage'

// Rating prompt rules (Google Play compliant: no incentives, no star
// steering, not excessive):
//   - only from the 2nd visit onward
//   - only right after a "happy moment" (logged a period / saved a log)
//   - at most once a day
//   - never again once the user taps the review button
//
// State lives in AsyncStorage under KEY. Every function is defensive: a
// broken or missing record just means "don't show".

const KEY = 'rating_prompt'
const MIN_VISITS = 2
const COOLDOWN_MS = 24 * 60 * 60 * 1000
// Returning after 30 min counts as a new visit. Debug builds count every
// open, so the prompt can be tested without waiting.
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__
const NEW_VISIT_AFTER_MS = IS_DEV ? 0 : 30 * 60 * 1000

// Store listing of the production app (the dev variant has no listing).
const PLAY_PACKAGE = 'com.mycycleapp.periodtracker'

const DEFAULT = { visits: 0, lastVisitAt: 0, lastShownAt: 0, dismissals: 0, rated: false, ratedAt: 0 }

let StoreReview = null
try { StoreReview = require('expo-store-review') } catch { StoreReview = null }

const read = async () => {
  const raw = await loadData(KEY, null)
  if (!raw || typeof raw !== 'object') return { ...DEFAULT }
  return {
    visits: Number.isFinite(raw.visits) ? raw.visits : 0,
    lastVisitAt: Number.isFinite(raw.lastVisitAt) ? raw.lastVisitAt : 0,
    lastShownAt: Number.isFinite(raw.lastShownAt) ? raw.lastShownAt : 0,
    dismissals: Number.isFinite(raw.dismissals) ? raw.dismissals : 0,
    rated: raw.rated === true,
    ratedAt: Number.isFinite(raw.ratedAt) ? raw.ratedAt : 0,
  }
}

const write = (state) => saveData(KEY, state)

/** Count a visit: each cold start, and each return after 30+ minutes away. */
export const recordVisit = async (now = Date.now()) => {
  try {
    const s = await read()
    if (now - s.lastVisitAt < NEW_VISIT_AFTER_MS && s.visits > 0) {
      await write({ ...s, lastVisitAt: now })
      return s
    }
    const next = { ...s, visits: s.visits + 1, lastVisitAt: now }
    await write(next)
    return next
  } catch {
    return { ...DEFAULT }
  }
}

/** Pure rule check (exported for tests). */
export const isEligible = (s, now = Date.now()) =>
  !!s &&
  !s.rated &&
  s.visits >= MIN_VISITS &&
  now - (s.lastShownAt || 0) >= COOLDOWN_MS

export const shouldShowRating = async (now = Date.now()) => {
  try { return isEligible(await read(), now) } catch { return false }
}

export const markShown = async (now = Date.now()) => {
  try { const s = await read(); await write({ ...s, lastShownAt: now }) } catch {}
}

export const markDismissed = async () => {
  try { const s = await read(); await write({ ...s, dismissals: s.dismissals + 1 }) } catch {}
}

export const markRated = async (now = Date.now()) => {
  try { const s = await read(); await write({ ...s, rated: true, ratedAt: now }) } catch {}
}

// The https Play link is a verified app link, so Android opens the Play
// Store app directly. (market:// is intercepted on some phones, e.g. Xiaomi
// shows a chooser with its own store, where a rating wouldn't reach Play.)
const openStoreListing = async () => {
  const web = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`
  const market = `market://details?id=${PLAY_PACKAGE}`
  try {
    await Linking.openURL(Platform.OS === 'android' ? web : (StoreReview?.storeUrl?.() || web))
  } catch {
    try { await Linking.openURL(market) } catch {}
  }
}

// Did the app leave the foreground within `ms`? Google's review sheet is a
// separate activity, so if it appears the app goes inactive/background.
const leftForegroundWithin = (ms) => new Promise((resolve) => {
  let done = false
  const sub = AppState.addEventListener('change', (s) => {
    if (done || s === 'active') return
    done = true
    sub.remove()
    resolve(true)
  })
  setTimeout(() => {
    if (done) return
    done = true
    sub.remove()
    resolve(false)
  }, ms)
})

/**
 * Open Google's in-app review sheet. Google may silently decline (quota,
 * sideloaded install); in that case open the Play Store listing so the
 * user's tap always leads somewhere.
 */
export const openReview = async () => {
  try {
    if (StoreReview && (await StoreReview.isAvailableAsync())) {
      const left = leftForegroundWithin(2000)
      await StoreReview.requestReview()
      if (await left) return 'in_app'
    }
  } catch {
    // fall through to the store page
  }
  await openStoreListing()
  return 'store'
}

// ── Happy-moment signal ──────────────────────────────────────────────────
// Data actions call notifyHappyMoment(); the RatingHost listens.
const listeners = new Set()
export const onHappyMoment = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export const notifyHappyMoment = () => {
  listeners.forEach((fn) => { try { fn() } catch {} })
}
