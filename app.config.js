// Dynamic Expo config. Everything still lives in app.json; this file only
// overrides the AdMob **App IDs** from environment variables so the real
// ones never have to be committed. When the env vars are absent (e.g. a
// fresh clone), it falls back to the Google test App IDs already in app.json.
//
// Real values go in a gitignored `.env` (see `.env.example`) for local
// builds, and in EAS environment variables for cloud builds.

module.exports = ({ config }) => {
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
