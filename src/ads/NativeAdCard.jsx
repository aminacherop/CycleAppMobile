import { useEffect, useState } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from 'react-native-google-mobile-ads'
import { AD_UNITS, requestOptions } from './adConfig'
import { useAds } from './AdsProvider'
import { useTheme } from '../context/ThemeContext'

// A native "advanced" ad styled to match the app's pink cards, so it blends
// into content feeds (highest-eCPM format). Includes the mandatory "Ad"
// attribution badge required by AdMob policy. Renders nothing until an ad
// is available, and destroys the native ad object on unmount.
const NativeAdCard = ({ style }) => {
  const { adsReady } = useAds()
  const { colors } = useTheme()
  const [nativeAd, setNativeAd] = useState(null)

  useEffect(() => {
    if (!adsReady) return
    let mounted = true
    let created = null

    NativeAd.createForAdRequest(AD_UNITS.native, requestOptions)
      .then((ad) => {
        if (!mounted) { ad.destroy(); return }
        created = ad
        setNativeAd(ad)
      })
      .catch(() => {})

    return () => {
      mounted = false
      if (created) created.destroy()
    }
  }, [adsReady])

  if (!nativeAd) return null

  const styles = makeStyles(colors)

  return (
    <NativeAdView nativeAd={nativeAd} style={[styles.card, style]}>
      <View style={styles.headerRow}>
        {nativeAd.icon?.url ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        ) : null}
        <View style={{ flex: 1 }}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline} numberOfLines={1}>{nativeAd.headline}</Text>
          </NativeAsset>
          {nativeAd.advertiser ? (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={styles.advertiser} numberOfLines={1}>{nativeAd.advertiser}</Text>
            </NativeAsset>
          ) : null}
        </View>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Ad</Text>
        </View>
      </View>

      {nativeAd.body ? (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={styles.body} numberOfLines={2}>{nativeAd.body}</Text>
        </NativeAsset>
      ) : null}

      <NativeMediaView style={styles.media} resizeMode="cover" />

      {nativeAd.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
          </View>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  headline: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  advertiser: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  adBadge: {
    backgroundColor: colors.pinkLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.pinkDark,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  media: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  cta: {
    backgroundColor: colors.pink,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
})

export default NativeAdCard
