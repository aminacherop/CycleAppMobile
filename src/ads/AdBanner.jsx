import { useState } from 'react'
import { View } from 'react-native'
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads'
import { AD_UNITS, requestOptions } from './adConfig'
import { useAds } from './AdsProvider'

// Anchored adaptive banner — higher eCPM than a fixed 320x50 and sizes
// itself to the device width. Renders nothing until the SDK is ready or
// if a load fails, so it never leaves an empty grey box in the layout.
// Place it INSIDE a ScrollView's content (above the tab bar), spaced
// from interactive controls to avoid accidental-click policy strikes.
const AdBanner = ({ style }) => {
  const { adsReady } = useAds()
  const [failed, setFailed] = useState(false)

  if (!adsReady || failed) return null

  return (
    <View style={[{ width: '100%', alignItems: 'center', marginTop: 12 }, style]}>
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={requestOptions}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  )
}

export default AdBanner
