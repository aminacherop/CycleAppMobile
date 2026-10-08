import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation,
} from 'react-native-reanimated'
import { useTheme } from '../../context/ThemeContext'
import { tapHaptic } from '../../utils/haptics'
import { AppText, Tap } from './primitives'

// Snap-scrolling wheel picker. `values` is an array of numbers (or strings);
// `format(v, isSelected)` renders a label. Selection is reported on settle,
// so fast flings never spam onChange. Out-of-range values clamp safely.

const ITEM_H = 52
const VISIBLE = 5

const WheelItem = memo(({ index, label, scrollY, onPress, color, selected }) => {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(scrollY.value / ITEM_H - index)
    return {
      opacity: interpolate(d, [0, 1, 2, 3], [1, 0.55, 0.28, 0.12], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(d, [0, 1, 2], [1, 0.82, 0.7], Extrapolation.CLAMP) }],
    }
  })
  return (
    <Tap onPress={onPress} scaleTo={1} style={styles.item} accessibilityLabel={String(label)} accessibilityState={{ selected: !!selected }}>
      <Animated.View style={style}>
        <AppText style={{ fontSize: 30, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5 }} color={color} maxFontSizeMultiplier={1.1}>{label}</AppText>
      </Animated.View>
    </Tap>
  )
})

const WheelPicker = ({ values, value, onChange, format = (v) => String(v), width = '100%', accessibilityLabel }) => {
  const { colors } = useTheme()
  const ref = useRef(null)
  const lastIndex = useRef(-1)
  const momentum = useRef(false)
  const initialIndex = useMemo(() => {
    const i = values.indexOf(value)
    return i >= 0 ? i : Math.floor(values.length / 2)
  }, []) // only for the first render
  const scrollY = useSharedValue(initialIndex * ITEM_H)

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y },
  })

  const settle = useCallback((y) => {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM_H)))
    if (i !== lastIndex.current) {
      lastIndex.current = i
      tapHaptic()
      onChange?.(values[i])
    }
  }, [values, onChange])

  // Keep the wheel in sync when the value changes from outside (e.g. a chip).
  useEffect(() => {
    const i = values.indexOf(value)
    if (i >= 0 && i !== lastIndex.current) {
      lastIndex.current = i
      ref.current?.scrollTo?.({ y: i * ITEM_H, animated: true })
    }
  }, [value, values])

  const jumpTo = (i) => ref.current?.scrollTo?.({ y: i * ITEM_H, animated: true })

  return (
    <View style={{ height: ITEM_H * VISIBLE, width, alignSelf: 'center' }} accessibilityLabel={accessibilityLabel} accessibilityValue={{ text: format(value) }}>
      <View
        pointerEvents="none"
        style={[styles.selector, { top: ITEM_H * 2, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft2 }]}
      />
      <Animated.ScrollView
        ref={ref}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: initialIndex * ITEM_H }}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        onScrollBeginDrag={() => { momentum.current = false }}
        onMomentumScrollBegin={() => { momentum.current = true }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          // A slow drag may end without any momentum phase; settle then.
          const y = e.nativeEvent.contentOffset.y
          setTimeout(() => { if (!momentum.current) settle(y) }, 160)
        }}
        nestedScrollEnabled
      >
        {values.map((v, i) => (
          <WheelItem
            key={String(v)}
            index={i}
            label={format(v)}
            scrollY={scrollY}
            color={colors.text}
            onPress={() => jumpTo(i)}
            selected={v === value}
          />
        ))}
      </Animated.ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  selector: { position: 'absolute', left: 24, right: 24, height: ITEM_H, borderRadius: 16, borderWidth: 1.5 },
})

export default memo(WheelPicker)
