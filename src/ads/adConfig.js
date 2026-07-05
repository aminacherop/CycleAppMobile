import { Platform } from 'react-native'
import { TestIds } from 'react-native-google-mobile-ads'

// ─────────────────────────────────────────────────────────────
//  AD CONFIG — the ONLY file you edit to go live.
//
//  In development (__DEV__) we ALWAYS serve Google's official test
//  ads, so you can never accidentally click a live ad on your own
//  device (which gets AdMob accounts banned). In a production build
//  the PROD ids below are used — paste your real AdMob unit ids there.
// ─────────────────────────────────────────────────────────────

// TODO: Replace every 'ca-app-pub-XXXX…/…' below with your real AdMob
//       ad-unit ids from https://apps.admob.com (one per format, per
//       platform). Also set your real App IDs in app.json → plugins →
//       react-native-google-mobile-ads (androidAppId / iosAppId).
const PROD = {
  appOpen: Platform.select({
    ios: 'ca-app-pub-0000000000000000/0000000001',
    android: 'ca-app-pub-0000000000000000/0000000002',
  }),
  interstitial: Platform.select({
    ios: 'ca-app-pub-0000000000000000/0000000003',
    android: 'ca-app-pub-0000000000000000/0000000004',
  }),
  banner: Platform.select({
    ios: 'ca-app-pub-0000000000000000/0000000005',
    android: 'ca-app-pub-0000000000000000/0000000006',
  }),
  native: Platform.select({
    ios: 'ca-app-pub-0000000000000000/0000000007',
    android: 'ca-app-pub-0000000000000000/0000000008',
  }),
}

const TEST = {
  appOpen: TestIds.APP_OPEN,
  interstitial: TestIds.INTERSTITIAL,
  banner: TestIds.ADAPTIVE_BANNER,
  native: TestIds.NATIVE,
}

export const AD_UNITS = __DEV__ ? TEST : PROD

// Shared request options passed to every ad request. Left empty so the
// Google UMP consent layer decides personalized vs non-personalized
// automatically (personalized = higher eCPM when the user consents).
export const requestOptions = {}

// ── Frequency (AGGRESSIVE profile) ──────────────────────────
// Tuned for high revenue-per-session while staying inside AdMob
// policy. Every value is a guardrail you can loosen or tighten here
// without touching any other file.
export const AD_FREQUENCY = {
  // Interstitials
  interstitialMinIntervalMs: 45 * 1000, // hard floor between two interstitials
  interstitialEveryNActions: 2,         // fire on every 2nd qualifying action
  interstitialErrorBackoffMs: 30 * 1000,

  // App Open
  appOpenColdStart: true,               // show once on cold launch (after splash)
  appOpenMinIntervalMs: 60 * 1000,      // min gap between App Open shows on resume
  appOpenExpiryMs: 4 * 60 * 60 * 1000,  // Google: App Open ads expire after 4h
  appOpenErrorBackoffMs: 30 * 1000,
}
