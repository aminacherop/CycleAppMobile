# Ads (Google AdMob) — integration guide

All ad logic lives in `src/ads/`. Screens only import from the barrel:

```js
import { AdsProvider, useAds, AdBanner, NativeAdCard, maybeShowInterstitial } from '../ads'
```

## What's wired up

| Format | Where | Behaviour |
|---|---|---|
| **App Open** | Managed globally (`appOpenAdManager`) | Shows once on cold start (after splash) + on every foreground resume, with a 60s cooldown and Google's 4h freshness expiry. Suppressed during onboarding. |
| **Interstitial** | Fired on tab switches (`App.js` → `screenListeners.tabPress`) | Shows every 2nd qualifying action, min 45s apart. Preloaded + auto-reloaded. |
| **Banner** (anchored adaptive) | Bottom of Dashboard, Calendar, Analysis | Renders only when the SDK is ready; hides itself on load failure. |
| **Native** (advanced) | In the Articles feed, after the 3rd article | Styled to match the app's cards, with the required "Ad" badge. |

Lifecycle (consent → init → ads) is owned by `AdsProvider`, mounted in `App.js`. Nothing requests an ad until `useAds().adsReady` is true.

## Frequency

All caps live in **`adConfig.js` → `AD_FREQUENCY`** (currently the *aggressive* profile). Tune there — no other file needs changing. If you ever get an AdMob policy warning, loosen `interstitialMinIntervalMs` / `interstitialEveryNActions` / `appOpenMinIntervalMs` first.

## ⚠️ Before you ship (required)

1. **Create an AdMob account** and an ad unit for each format × platform (8 units total).
2. **App IDs** → `app.json` → `plugins` → `react-native-google-mobile-ads` → replace the two test IDs in `androidAppId` / `iosAppId` (currently Google's sample App IDs).
3. **Unit IDs** → `src/ads/adConfig.js` → replace every `ca-app-pub-0000…` in the `PROD` block with your real unit IDs.
   - `__DEV__` builds **always** use Google test ads, so you can develop safely. Real IDs only load in a production build.
4. **Native rebuild** — this adds native code, so a new build is required (it does **not** work in Expo Go):
   ```
   npx expo prebuild --clean        # or let EAS do it
   eas build -p android --profile production
   ```
5. **Privacy policy** — the app now collects an advertising identifier. Update your store listing + policy, and complete the Play **Data safety** / App Store **privacy** forms accordingly.

## Testing consent / ATT

- On a **test device**, use `AdsConsent` debug geography to simulate the EEA form, and reset with `AdsConsent.reset()`.
- iOS ATT prompt text lives in both the AdMob plugin (`userTrackingUsageDescription`) and the `expo-tracking-transparency` plugin (`userTrackingPermission`) in `app.json`.
- Register your device as a **test device** in AdMob and never tap live ads on your own phone (fastest way to get banned).

## Phase 2 — higher earnings (no app code changes needed)

- **Mediation**: add networks (Meta Audience Network, AppLovin, etc.) in the AdMob console + their SDKs. The request/show code here is mediation-agnostic.
- **Ad Inspector**: call `mobileAds().openAdInspector()` from a hidden debug menu to live-debug fill/latency.
- **A/B**: use AdMob's built-in optimization + eCPM floors.
- **Privacy Options button**: add a "Manage ad consent" row in Profile that calls `AdsConsent.showPrivacyOptionsForm()` (required in some regions for users who consented via the UMP form).
