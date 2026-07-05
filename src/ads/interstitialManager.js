import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads'
import { AD_UNITS, requestOptions, AD_FREQUENCY } from './adConfig'

// Singleton interstitial manager. Keeps ONE ad preloaded at all times,
// rebuilds after every show/error (an ad object can only be shown once),
// and enforces the aggressive-but-safe frequency cap from adConfig.

let ad = null
let loaded = false
let loading = false
let lastShownAt = 0
let actionCount = 0
let unsub = null
let backoffTimer = null

const teardown = () => {
  if (unsub) { unsub(); unsub = null }
  ad = null
  loaded = false
}

const build = () => {
  teardown()
  ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, requestOptions)
  const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true
    loading = false
  })
  const offError = ad.addAdEventListener(AdEventType.ERROR, () => {
    loaded = false
    loading = false
    scheduleReload(AD_FREQUENCY.interstitialErrorBackoffMs)
  })
  const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
    loaded = false
    preloadInterstitial() // immediately warm the next one
  })
  unsub = () => { offLoaded(); offError(); offClosed() }
}

const scheduleReload = (delay) => {
  if (backoffTimer) return
  backoffTimer = setTimeout(() => {
    backoffTimer = null
    preloadInterstitial()
  }, delay)
}

export const preloadInterstitial = () => {
  if (loading || loaded) return
  loading = true
  build()
  ad.load()
}

const withinCooldown = () =>
  Date.now() - lastShownAt < AD_FREQUENCY.interstitialMinIntervalMs

// Call at natural transition points. Returns true if an ad was shown.
// { force: true } bypasses the every-N-actions counter (still respects
// the time cooldown and load state).
export const maybeShowInterstitial = async ({ force = false } = {}) => {
  actionCount += 1

  const nthReached =
    force || actionCount % AD_FREQUENCY.interstitialEveryNActions === 0
  if (!nthReached) return false

  if (withinCooldown()) return false

  if (!loaded || !ad) {
    preloadInterstitial()
    return false
  }

  try {
    await ad.show()
    lastShownAt = Date.now()
    loaded = false
    return true
  } catch {
    preloadInterstitial()
    return false
  }
}

export const resetInterstitial = () => {
  if (backoffTimer) { clearTimeout(backoffTimer); backoffTimer = null }
  teardown()
  loading = false
}
