import { memo, useEffect } from 'react'
import { View, ScrollView, StyleSheet, I18nManager } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'
import { useTheme } from '../../context/ThemeContext'
import { AppText, Button, Tap, Icon } from '../../components/ui'
import { RADIUS } from '../../theme/palette'

// One onboarding page: scrollable body + footer pinned to the bottom
// (primary button always visible, secondary text button under it).
export const StepLayout = ({
  title, subtitle, top, children, primary, secondary, gutter, bottomPad, centerBody = false,
}) => (
  <View style={{ flex: 1 }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ flexGrow: 1, paddingHorizontal: gutter, paddingTop: 8, paddingBottom: 16 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces={false}
    >
      {top}
      {title ? <AppText variant="title" style={styles.title}>{title}</AppText> : null}
      {subtitle ? <AppText variant="body" muted style={styles.subtitle}>{subtitle}</AppText> : null}
      <View style={[{ flexGrow: 1, marginTop: 20 }, centerBody && { justifyContent: 'center' }]}>
        {children}
      </View>
    </ScrollView>
    <View style={{ paddingHorizontal: gutter, paddingTop: 8, paddingBottom: bottomPad, gap: 4 }}>
      {primary ? (
        <Button
          title={primary.title}
          onPress={primary.onPress}
          disabled={primary.disabled}
          loading={primary.loading}
          icon={primary.icon}
        />
      ) : null}
      {secondary ? (
        <Button title={secondary.title} onPress={secondary.onPress} variant="ghost" size="md" disabled={secondary.disabled} haptic={false} />
      ) : (
        primary ? <View style={{ height: 4 }} /> : null
      )}
    </View>
  </View>
)

// Back chevron + "x of 6" + spring-animated progress bar.
export const TopBar = memo(({ index, total, onBack, label, backLabel, gutter }) => {
  const { colors } = useTheme()
  const p = useSharedValue(Math.max(0, Math.min(1, index / total)))
  useEffect(() => {
    p.value = withSpring(Math.max(0, Math.min(1, index / total)), { damping: 18, stiffness: 140 })
  }, [index, total])
  const bar = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }))
  return (
    <View style={[styles.topBar, { paddingHorizontal: gutter }]}>
      <Tap
        onPress={onBack}
        hitSlop={8}
        accessibilityLabel={backLabel}
        style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Icon name="chevron-left" size={22} color={colors.text} style={I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : null} />
      </Tap>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[styles.track, { backgroundColor: colors.track }]}>
          <Animated.View style={[styles.fill, { backgroundColor: colors.primary }, bar]} />
        </View>
      </View>
      <AppText variant="caption" muted style={{ fontWeight: '700', minWidth: 44, textAlign: 'right' }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  )
})

const styles = StyleSheet.create({
  title: { fontSize: 27, lineHeight: 34, marginTop: 8 },
  subtitle: { marginTop: 8, fontSize: 16, lineHeight: 23 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60 },
  back: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: RADIUS.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: RADIUS.pill },
})
