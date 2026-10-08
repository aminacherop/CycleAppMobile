import { memo, useEffect } from 'react'
import { View, StyleSheet, useWindowDimensions } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, withSpring, Easing,
} from 'react-native-reanimated'
import { useTheme } from '../../context/ThemeContext'
import { AppText, IconBadge, Icon, Tap } from '../../components/ui'
import { RADIUS } from '../../theme/palette'
import Svg, { Circle, Path } from 'react-native-svg'

export const MAX_W = 640

/** Same responsive gutter as the shared <Screen>. */
export const useGutter = () => {
  const { width } = useWindowDimensions()
  return width >= 600 ? 28 : 16
}

/** Card section header: tinted icon + title (+ optional right element). */
export const SectionHead = memo(({ icon, tone = 'primary', title, right, subtitle }) => (
  <View style={styles.head}>
    <IconBadge name={icon} tone={tone} size={32} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <AppText variant="subheading" numberOfLines={1}>{title}</AppText>
      {subtitle ? <AppText variant="small" muted numberOfLines={2} style={{ fontWeight: '500' }}>{subtitle}</AppText> : null}
    </View>
    {right}
  </View>
))

/** Small pill that fades in for a moment each time `tick` changes. */
export const SavedIndicator = memo(({ tick, label }) => {
  const { colors } = useTheme()
  const o = useSharedValue(0)
  useEffect(() => {
    if (!tick) return
    o.value = withSequence(
      withTiming(1, { duration: 160 }),
      withDelay(1100, withTiming(0, { duration: 320 })),
    )
  }, [tick])
  const aStyle = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: (1 - o.value) * -4 }, { scale: 0.92 + o.value * 0.08 }],
  }))
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.saved, { backgroundColor: colors.successSoft }, aStyle]}
    >
      <Icon name="check" size={13} color={colors.success} />
      <AppText variant="small" color={colors.success}>{label}</AppText>
    </Animated.View>
  )
})

/** Round − / + stepper button. */
export const StepButton = memo(({ icon, onPress, disabled, accessibilityLabel }) => {
  const { colors } = useTheme()
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      haptic
      scaleTo={0.9}
      hitSlop={6}
      accessibilityLabel={accessibilityLabel}
      style={[styles.step, { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft2 }]}
    >
      <Icon name={icon} size={18} color={colors.primary} />
    </Tap>
  )
})

/** Horizontal bar animating from 0 to `pct` (0–100). */
export const AnimatedBar = memo(({ pct, color, height = 10 }) => {
  const { colors } = useTheme()
  const w = useSharedValue(0)
  const target = Math.max(0, Math.min(100, Number(pct) || 0))
  useEffect(() => {
    w.value = withDelay(120, withTiming(target, { duration: 700, easing: Easing.out(Easing.cubic) }))
  }, [target])
  const aStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }))
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.track }]}>
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: color || colors.primary }, aStyle]} />
    </View>
  )
})

/**
 * Cycle bar: full length relative to `maxLength`, with the period portion
 * highlighted. Grows in with a spring.
 */
export const CycleBar = memo(({ cycleLength, periodLength, maxLength, height = 12 }) => {
  const { colors } = useTheme()
  const L = Math.max(1, Number(cycleLength) || 1)
  const P = Math.max(0, Math.min(L, Number(periodLength) || 0))
  const max = Math.max(L, Number(maxLength) || L)
  const s = useSharedValue(0)
  useEffect(() => { s.value = withSpring(1, { damping: 18, stiffness: 140 }) }, [])
  const aStyle = useAnimatedStyle(() => ({ width: `${(L / max) * 100 * s.value}%` }))
  return (
    <View style={{ height, width: '100%' }}>
      <Animated.View style={[styles.cycleBar, { height, borderRadius: height / 2, backgroundColor: colors.primarySoft2 }, aStyle]}>
        <View style={{ width: `${(P / L) * 100}%`, height, backgroundColor: colors.period }} />
      </Animated.View>
    </View>
  )
})

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  track: { width: '100%', overflow: 'hidden' },
  cycleBar: { flexDirection: 'row', overflow: 'hidden' },
})

/** Magnifier line icon (not in the shared icon set). */
export const SearchIcon = memo(({ size = 18, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="11" cy="11" r="6.5" fill="none" stroke={color} strokeWidth={2} />
    <Path d="m16 16 4 4" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
))
