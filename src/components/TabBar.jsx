import { memo, useEffect } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { AppText, Icon } from './ui'
import { tapHaptic } from '../utils/haptics'

// Custom 4-tab bar with an animated active state. It emits the standard
// 'tabPress' event exactly like the stock bar, so screenListeners in
// App.js (which drive the interstitial cadence) behave as before.

export const TABS = {
  HomeTab: { icon: 'home', labelKey: 'nav_home' },
  CalendarTab: { icon: 'calendar', labelKey: 'nav_calendar' },
  TrackTab: { icon: 'track', labelKey: 'nav_track' },
  ProfileTab: { icon: 'user', labelKey: 'nav_profile' },
}

const TabItem = memo(({ focused, icon, label, onPress, onLongPress, colors }) => {
  const p = useSharedValue(focused ? 1 : 0)
  useEffect(() => { p.value = withSpring(focused ? 1 : 0, { damping: 15, stiffness: 220 }) }, [focused])
  const pill = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scaleX: interpolate(p.value, [0, 1], [0.5, 1]) }],
  }))
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(p.value, [0, 1], [0, -1]) }, { scale: interpolate(p.value, [0, 1], [1, 1.06]) }],
  }))
  const color = focused ? colors.primary : colors.textFaint
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, { backgroundColor: colors.primarySoft }, pill]} />
        <Animated.View style={iconStyle}>
          <Icon name={icon} size={23} color={color} />
        </Animated.View>
      </View>
      <AppText variant="small" color={color} numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ marginTop: 3, fontWeight: focused ? '700' : '600' }}>
        {label}
      </AppText>
    </Pressable>
  )
})

const TabBar = ({ state, navigation }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const insets = useSafeAreaInsets()
  const bottom = Math.max(insets.bottom, 8)
  return (
    <View style={[styles.bar, { backgroundColor: colors.tabBar, borderTopColor: colors.border, paddingBottom: bottom, height: 62 + bottom }]}>
      {state.routes.map((route, index) => {
        const meta = TABS[route.name] || { icon: 'home', labelKey: route.name }
        const focused = state.index === index
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!focused && !event.defaultPrevented) {
            tapHaptic()
            navigation.navigate(route.name, route.params)
          } else if (focused) {
            // Tapping the active tab returns its stack to the first screen.
            const child = route.state
            if (child && child.index > 0) navigation.navigate(route.name, { screen: child.routeNames?.[0] })
          }
        }
        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key })
        return (
          <TabItem
            key={route.key}
            focused={focused}
            icon={meta.icon}
            label={t(meta.labelKey)}
            onPress={onPress}
            onLongPress={onLongPress}
            colors={colors}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  iconWrap: { width: 60, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
})

export default memo(TabBar)
