import { memo, useCallback, useEffect, useState } from 'react'
import {
  View, Text, Pressable, ScrollView, Modal, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, FadeInDown, Easing,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { RADIUS, SPACE } from '../../theme/palette'
import { tapHaptic } from '../../utils/haptics'
import Icon from './Icon'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)
const SPRING = { damping: 16, stiffness: 260, mass: 0.7 }

// ── Text ─────────────────────────────────────────────────────────────
const VARIANTS = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontSize: 15.5, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '500', lineHeight: 21 },
  bodyStrong: { fontSize: 15, fontWeight: '700' },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  small: { fontSize: 11.5, fontWeight: '600' },
  overline: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
}

export const AppText = memo(({ variant = 'body', color, muted, faint, center, style, children, noShrink, ...rest }) => {
  const { colors } = useTheme()
  const c = color || (faint ? colors.textFaint : muted ? colors.textMuted : colors.text)
  // Single-line text shrinks a little to fit (small phones, large font
  // settings) before it would ever be cut off with "…".
  const shrink = rest.numberOfLines === 1 && !noShrink
  return (
    <Text
      maxFontSizeMultiplier={1.35}
      adjustsFontSizeToFit={shrink}
      minimumFontScale={shrink ? 0.72 : undefined}
      style={[VARIANTS[variant] || VARIANTS.body, { color: c }, center && { textAlign: 'center' }, style]}
      {...rest}
    >
      {children}
    </Text>
  )
})

// ── Tap: press-scale animation + optional haptic, crash-safe handler ──
export const Tap = memo(({
  onPress, onLongPress, style, children, scaleTo = 0.97, haptic = false, disabled,
  accessibilityLabel, accessibilityRole = 'button', accessibilityState, hitSlop, ...rest
}) => {
  const scale = useSharedValue(1)
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const handlePress = useCallback((e) => {
    if (haptic) tapHaptic()
    try { onPress?.(e) } catch (err) { console.warn('Tap handler failed', err) }
  }, [onPress, haptic])
  return (
    <AnimatedPressable
      onPress={onPress ? handlePress : undefined}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={() => { scale.value = withTiming(scaleTo, { duration: 90 }) }}
      onPressOut={() => { scale.value = withSpring(1, SPRING) }}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      hitSlop={hitSlop}
      style={[style, aStyle, disabled && { opacity: 0.45 }]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  )
})

// ── Button ───────────────────────────────────────────────────────────
export const Button = memo(({
  title, onPress, variant = 'primary', size = 'lg', icon, loading, disabled, style, haptic = true, accessibilityLabel,
}) => {
  const { colors } = useTheme()
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.primarySoft2 },
    soft: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
    ghost: { bg: 'transparent', fg: colors.textMuted, border: 'transparent' },
  }[variant] || {}
  const h = size === 'sm' ? 40 : size === 'md' ? 46 : 54
  return (
    <Tap
      onPress={loading ? undefined : onPress}
      disabled={disabled}
      haptic={haptic}
      accessibilityLabel={accessibilityLabel || title}
      style={[
        styles.btn,
        { height: h, backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.btnInner}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} color={palette.fg} /> : null}
          <AppText variant="bodyStrong" color={palette.fg} numberOfLines={1} style={size === 'sm' && { fontSize: 13.5 }}>
            {title}
          </AppText>
        </View>
      )}
    </Tap>
  )
})

// ── Card ─────────────────────────────────────────────────────────────
export const Card = memo(({ style, children, onPress, padded = true, accessibilityLabel }) => {
  const { colors, isDark } = useTheme()
  const base = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
    !isDark && styles.cardShadow,
    !padded && { padding: 0 },
    style,
  ]
  if (onPress) {
    return <Tap onPress={onPress} style={base} scaleTo={0.985} accessibilityLabel={accessibilityLabel}>{children}</Tap>
  }
  return <View style={base}>{children}</View>
})

// ── IconBadge: tinted rounded square holding an icon ─────────────────
export const IconBadge = memo(({ name, tone = 'primary', size = 34, iconSize }) => {
  const { colors } = useTheme()
  const fg = colors[tone] || colors.primary
  const bg = colors[`${tone}Soft`] || colors.primarySoft
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={iconSize || size * 0.52} color={fg} />
    </View>
  )
})

// ── Chip ─────────────────────────────────────────────────────────────
export const Chip = memo(({ label, selected, onPress, icon, tone = 'primary', style, disabled }) => {
  const { colors } = useTheme()
  const fg = colors[tone] || colors.primary
  const soft = colors[`${tone}Soft`] || colors.primarySoft
  return (
    <Tap
      onPress={onPress}
      haptic
      disabled={disabled}
      scaleTo={0.94}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        { borderColor: selected ? fg : colors.border, backgroundColor: selected ? soft : colors.surface },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={15} color={selected ? fg : colors.textMuted} /> : null}
      <AppText variant="caption" color={selected ? fg : colors.text} style={{ fontWeight: '600' }} numberOfLines={1}>
        {label}
      </AppText>
    </Tap>
  )
})

// ── Toggle (animated switch) ─────────────────────────────────────────
export const Toggle = memo(({ value, onChange, disabled, accessibilityLabel }) => {
  const { colors } = useTheme()
  const x = useSharedValue(value ? 1 : 0)
  useEffect(() => { x.value = withSpring(value ? 1 : 0, SPRING) }, [value])
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 20 }] }))
  return (
    <Tap
      onPress={() => onChange?.(!value)}
      haptic
      disabled={disabled}
      scaleTo={0.92}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: !!value }}
      hitSlop={8}
      style={[styles.toggle, { backgroundColor: value ? colors.primary : colors.track }]}
    >
      <Animated.View style={[styles.thumb, thumb]} />
    </Tap>
  )
})

// ── Settings-style grouped list ──────────────────────────────────────
export const ListGroup = memo(({ title, children, style, footer }) => {
  const { colors } = useTheme()
  const items = Array.isArray(children) ? children.filter(Boolean) : [children]
  return (
    <View style={[{ marginTop: SPACE.lg }, style]}>
      {title ? <SectionTitle style={{ marginTop: 0 }}>{title}</SectionTitle> : null}
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View style={[styles.sep, { backgroundColor: colors.border }]} /> : null}
            {child}
          </View>
        ))}
      </View>
      {footer ? <AppText variant="small" muted style={{ marginTop: 6, marginHorizontal: 4, fontWeight: '500' }}>{footer}</AppText> : null}
    </View>
  )
})

export const ListRow = memo(({
  icon, tone = 'primary', title, subtitle, value, onPress, right, chevron = !!onPress, destructive, accessibilityLabel,
}) => {
  const { colors } = useTheme()
  const content = (
    <View style={styles.row}>
      {icon ? <IconBadge name={icon} tone={destructive ? 'danger' : tone} size={32} /> : null}
      <View style={{ flex: 1, minWidth: '38%' }}>
        <AppText variant="body" color={destructive ? colors.danger : colors.text} style={{ fontWeight: '600' }} numberOfLines={2}>{title}</AppText>
        {subtitle ? <AppText variant="small" muted style={{ fontWeight: '500', marginTop: 1 }} numberOfLines={2}>{subtitle}</AppText> : null}
      </View>
      {value != null && value !== '' ? <AppText variant="caption" muted numberOfLines={2} style={{ flexShrink: 1, maxWidth: '42%', textAlign: 'right' }}>{value}</AppText> : null}
      {right}
      {chevron ? <Icon name="chevron-right" size={18} color={colors.textFaint} /> : null}
    </View>
  )
  if (!onPress) return content
  return <Tap onPress={onPress} scaleTo={0.985} accessibilityLabel={accessibilityLabel || title}>{content}</Tap>
})

// ── Segmented control with sliding indicator ─────────────────────────
export const Segmented = memo(({ options, value, onChange, style }) => {
  const { colors, isDark } = useTheme()
  const [w, setW] = useState(0)
  const idx = Math.max(0, options.findIndex((o) => o.key === value))
  const x = useSharedValue(0)
  const segW = w > 0 ? (w - 6) / options.length : 0
  useEffect(() => { x.value = withSpring(idx * segW, SPRING) }, [idx, segW])
  const ind = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[styles.seg, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }, style]}
      accessibilityRole="tablist"
    >
      {segW > 0 ? (
        <Animated.View style={[styles.segInd, { width: segW, backgroundColor: colors.surface }, ind]} />
      ) : null}
      {options.map((o) => {
        const on = o.key === value
        return (
          <Pressable
            key={o.key}
            onPress={() => { if (!on) { tapHaptic(); onChange?.(o.key) } }}
            style={styles.segItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <AppText variant="caption" color={on ? colors.text : colors.textMuted} style={{ fontWeight: '700' }} numberOfLines={1}>
              {o.label}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
})

// ── Bottom sheet (Modal + spring slide, tap backdrop or Back to close) ─
// Count of sheets currently on screen, so prompts (e.g. rating) can wait
// instead of stacking on top of another sheet.
let openSheets = 0
export const isAnySheetOpen = () => openSheets > 0

export const Sheet = ({ visible, onClose, children, title, maxHeightRatio = 0.88 }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const [mounted, setMounted] = useState(visible)
  const y = useSharedValue(height)
  const fade = useSharedValue(0)

  useEffect(() => {
    let timer
    if (visible) {
      setMounted(true)
      y.value = height
      fade.value = 0
      requestAnimationFrame(() => {
        y.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.8 })
        fade.value = withTiming(1, { duration: 200 })
      })
    } else if (mounted) {
      y.value = withTiming(height, { duration: 220, easing: Easing.in(Easing.quad) })
      fade.value = withTiming(0, { duration: 200 })
      timer = setTimeout(() => setMounted(false), 230)
    }
    return () => timer && clearTimeout(timer)
  }, [visible])

  useEffect(() => {
    if (!mounted) return
    openSheets += 1
    return () => { openSheets = Math.max(0, openSheets - 1) }
  }, [mounted])

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }))

  if (!mounted) return null
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t('close')} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 12) + 8, maxHeight: height * maxHeightRatio },
            sheetStyle,
          ]}
        >
          <View style={[styles.grab, { backgroundColor: colors.border }]} />
          {title ? (
            <View style={[styles.sheetHead]}>
              <AppText variant="heading" style={{ flex: 1 }} numberOfLines={2}>{title}</AppText>
              <Tap onPress={onClose} hitSlop={10} accessibilityLabel={t('close')} style={[styles.iconBtn, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name="close" size={18} color={colors.textMuted} />
              </Tap>
            </View>
          ) : null}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Headers, sections, layout ────────────────────────────────────────
export const IconButton = memo(({ name, onPress, accessibilityLabel, tone, size = 40 }) => {
  const { colors } = useTheme()
  return (
    <Tap
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel={accessibilityLabel}
      style={[styles.iconBtn, { width: size, height: size, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
    >
      <Icon name={name} size={20} color={tone ? colors[tone] : colors.text} />
    </Tap>
  )
})

export const ScreenHeader = memo(({ title, subtitle, onBack, right, large = false }) => {
  const { t } = useLanguage()
  return (
    <View style={styles.header}>
      {onBack ? (
        <IconButton name="chevron-left" onPress={onBack} accessibilityLabel={t('back')} />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant={large ? 'title' : 'heading'} numberOfLines={1}>{title}</AppText>
        {subtitle ? <AppText variant="caption" muted numberOfLines={1}>{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  )
})

export const SectionTitle = memo(({ children, style, right }) => (
  <View style={[styles.sectionTitle, style]}>
    <AppText variant="overline" muted style={{ flex: 1 }}>{children}</AppText>
    {right}
  </View>
))

// Screen: themed scroll container with consistent gutters. Pass
// scroll={false} for screens that manage their own list.
export const Screen = ({ children, scroll = true, contentStyle, header, refreshControl }) => {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const gutter = width >= 600 ? 28 : 16
  const maxW = 640
  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {header ? <View style={{ paddingHorizontal: gutter }}>{header}</View> : null}
        <View style={[{ flex: 1, paddingHorizontal: gutter, width: '100%', maxWidth: maxW, alignSelf: 'center' }, contentStyle]}>{children}</View>
      </View>
    )
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {header ? <View style={{ paddingHorizontal: gutter, width: '100%', maxWidth: maxW, alignSelf: 'center' }}>{header}</View> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingHorizontal: gutter, paddingBottom: 32, width: '100%', maxWidth: maxW, alignSelf: 'center' }, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </View>
  )
}

// Entrance animation: fade + slide up, staggered by `index`.
export const FadeIn = ({ index = 0, children, style }) => (
  <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 10) * 45)} style={style}>
    {children}
  </Animated.View>
)

export const EmptyState = memo(({ icon = 'sparkle', title, body, actionLabel, onAction, tone = 'primary' }) => (
  <View style={styles.empty}>
    <IconBadge name={icon} tone={tone} size={52} />
    <AppText variant="subheading" center style={{ marginTop: 12 }}>{title}</AppText>
    {body ? <AppText variant="caption" muted center style={{ marginTop: 4, maxWidth: 300 }}>{body}</AppText> : null}
    {actionLabel ? <Button title={actionLabel} onPress={onAction} size="md" variant="soft" style={{ marginTop: 14, paddingHorizontal: 22 }} /> : null}
  </View>
))

const styles = StyleSheet.create({
  btn: { borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderWidth: 1.5 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACE.lg },
  cardShadow: { shadowColor: '#3A1027', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: RADIUS.pill, paddingHorizontal: 13, paddingVertical: 8, minHeight: 38 },
  toggle: { width: 46, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  group: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
  seg: { flexDirection: 'row', borderRadius: 14, padding: 3, height: 44 },
  segInd: { position: 'absolute', top: 3, left: 3, bottom: 3, borderRadius: 11, elevation: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10 },
  grab: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 10, minHeight: 56 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginTop: SPACE.xl, marginBottom: SPACE.sm, marginHorizontal: 2 },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 },
})
