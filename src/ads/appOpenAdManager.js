import { AppState } from 'react-native'
import { AppOpenAd, AdEventType } from 'react-native-google-mobile-ads'
import { AD_UNITS, requestOptions, AD_FREQUENCY } from './adConfig'

// Singleton App Open manager. Preloads an App Open ad, shows it on cold
// start (once, after the splash) and whenever the app returns to the
// foreground — subject to a cooldown, a 4h freshness window (Google's
// hard expiry), and a suppression flag used during onboarding.

let ad = null
let loaded = false
let loading = false
let loadedAt = 0
let lastShownAt = 0
let showing = false
let enabled = false
let suppressed = false
let pendingColdShow = false
let unsub = null
let appStateSub = null

const isExpired = () =>
  Date.now() - loadedAt > AD_FREQUENCY.appOpenExpiryMs

const teardown = () => {
  if (unsub) { unsub(); unsub = null }
  ad = null
  loaded = false
}

const build = () => {
  teardown()
  ad = AppOpenAd.createForAdRequest(AD_UNITS.appOpen, requestOptions)
  const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true
    loading = false
    loadedAt = Date.now()
    if (pendingColdShow) {
      pendingColdShow = false
      showAppOpenIfAvailable()
    }
  })
  const offError = ad.addAdEventListener(AdEventType.ERROR, () => {
    loaded = false
    loading = false
    pendingColdShow = false
  })
  const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
    loaded = false
    showing = false
    preloadAppOpen() // warm the next one
  })
  unsub = () => { offLoaded(); offError(); offClosed() }
}

export const preloadAppOpen = () => {
  if (loading || (loaded && !isExpired())) return
  loading = true
  build()
  ad.load()
}

export const showAppOpenIfAvailable = async () => {
  if (!enabled || suppressed || showing) return false
  if (Date.now() - lastShownAt < AD_FREQUENCY.appOpenMinIntervalMs) return false
  if (!loaded || isExpired() || !ad) {
    preloadAppOpen()
    return false
  }
  try {
    showing = true
    await ad.show()
    lastShownAt = Date.now()
    loaded = false
    return true
  } catch {
    showing = false
    preloadAppOpen()
    return false
  }
}

// During onboarding we don't want a full-screen ad hijacking setup.
export const setAppOpenSuppressed = (value) => {
  suppressed = value
}

export const startAppOpen = () => {
  if (enabled) return
  enabled = true
  pendingColdShow = AD_FREQUENCY.appOpenColdStart
  preloadAppOpen()
  appStateSub = AppState.addEventListener('change', (next) => {
    if (next === 'active') showAppOpenIfAvailable()
  })
}

export const stopAppOpen = () => {
  enabled = false
  pendingColdShow = false
  if (appStateSub) { appStateSub.remove(); appStateSub = null }
  teardown()
}
