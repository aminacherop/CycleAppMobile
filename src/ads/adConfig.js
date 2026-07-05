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

const TEST = {
  appOpen: TestIds.APP_OPEN,
  interstitial: TestIds.INTERSTITIAL,
  banner: TestIds.ADAPTIVE_BANNER,
  native: TestIds.NATIVE,
}

// Real ad-unit ids come from environment variables so they never live in
// git. Set them in a gitignored `.env` (local) and in EAS environment
// variables (cloud) — see `.env.example`. Any id that isn't provided
// falls back to the Google test id, so a missing var can never crash the
// app (you'll just see a test ad instead of a live one).
const pick = (ios, android, fallback) =>
  (Platform.select({ ios, android }) || '').trim() || fallback

const PROD = {
  appOpen: pick(
    process.env.EXPO_PUBLIC_ADMOB_IOS_APPOPEN,
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_APPOPEN,
    TEST.appOpen,
  ),
  interstitial: pick(
    process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL,
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL,
    TEST.interstitial,
  ),
  banner: pick(
    process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER,
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER,
    TEST.banner,
  ),
  native: pick(
    process.env.EXPO_PUBLIC_ADMOB_IOS_NATIVE,
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_NATIVE,
    TEST.native,
  ),
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
