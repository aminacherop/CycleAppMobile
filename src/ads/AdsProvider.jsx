import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { Platform } from 'react-native'
import mobileAds, { AdsConsent, MaxAdContentRating } from 'react-native-google-mobile-ads'
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency'
import { preloadInterstitial, maybeShowInterstitial } from './interstitialManager'
import { startAppOpen, setAppOpenSuppressed } from './appOpenAdManager'

const AdsContext = createContext({
  adsReady: false,
  showInterstitial: async () => false,
})

// Owns the whole ads lifecycle:
//   1. iOS App Tracking Transparency prompt
//   2. Google UMP consent (GDPR/EEA) — gathered BEFORE SDK init
//   3. Mobile Ads SDK initialize + request configuration
//   4. Warm up interstitial + start the App Open manager
// Nothing in the app requests an ad until `adsReady` flips true.
export const AdsProvider = ({ children, suppressAppOpen = false }) => {
  const [adsReady, setAdsReady] = useState(false)
  const startedRef = useRef(false)

  // Keep the App Open manager in sync with onboarding state.
  useEffect(() => {
    setAppOpenSuppressed(suppressAppOpen)
  }, [suppressAppOpen])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    let cancelled = false

    const init = async () => {
      // 1) iOS ATT — request only if not yet determined. No-op on Android.
      if (Platform.OS === 'ios') {
        try {
          const { status } = await getTrackingPermissionsAsync()
          if (status === 'undetermined') {
            await requestTrackingPermissionsAsync()
          }
        } catch {
          // ignore — ads still work without IDFA (non-personalized)
        }
      }

      // 2) UMP consent. gatherConsent() shows the EEA form if required and
      //    is a no-op elsewhere. If the user cannot request ads, we bail
      //    out entirely (no SDK init, no ad requests) — the app runs fine.
      let canRequestAds = true
      try {
        const info = await AdsConsent.gatherConsent()
        canRequestAds = info?.canRequestAds !== false
      } catch {
        // Consent errors shouldn't brick ads in non-EEA regions.
        canRequestAds = true
      }
      if (cancelled || !canRequestAds) return

      // 3) Configure + initialize. This is a health app for adults, so we
      //    do NOT tag it child-directed (keeps personalized ads eligible),
      //    but cap content rating to keep advertisers comfortable.
      try {
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.PG,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        })
      } catch {
        // non-fatal
      }

      try {
        await mobileAds().initialize()
      } catch {
        return // without a live SDK there's nothing to show
      }
      if (cancelled) return

      // 4) Warm up ads.
      preloadInterstitial()
      startAppOpen()
      setAdsReady(true)
    }

    init()
    return () => { cancelled = true }
  }, [])

  const showInterstitial = useCallback(
    (opts) => maybeShowInterstitial(opts),
    []
  )

  return (
    <AdsContext.Provider value={{ adsReady, showInterstitial }}>
      {children}
    </AdsContext.Provider>
  )
}

export const useAds = () => useContext(AdsContext)
