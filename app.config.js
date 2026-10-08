// Dynamic Expo config. Everything still lives in app.json; this file only
// overrides the AdMob **App IDs** from environment variables so the real
// ones never have to be committed. When the env vars are absent (e.g. a
// fresh clone), it falls back to the Google test App IDs already in app.json.
//
// Real values go in a gitignored `.env` (see `.env.example`) for local
// builds, and in EAS environment variables for cloud builds.

//
// APP_VARIANT=dev builds a separate test app (own package id, so it installs
// beside the Play Store app without touching its data) that always keeps the
// Google test App IDs. Its debug JS (__DEV__) also uses test ad units, so a
// dev build can never serve live ads.

const IS_DEV_VARIANT = process.env.APP_VARIANT === 'dev'

module.exports = ({ config }) => {
  if (IS_DEV_VARIANT) {
    config.name = `${config.name} (Dev)`
    config.android = { ...config.android, package: `${config.android.package}.dev` }
    config.ios = { ...config.ios, bundleIdentifier: `${config.ios.bundleIdentifier}.dev` }
    return config
  }

  const androidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID
  const iosAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID

  if (androidAppId || iosAppId) {
    config.plugins = (config.plugins || []).map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads') {
        const [name, opts = {}] = plugin
        return [
          name,
          {
            ...opts,
            ...(androidAppId ? { androidAppId } : {}),
            ...(iosAppId ? { iosAppId } : {}),
          },
        ]
      }
      return plugin
    })
  }

  return config
}
