import { memo, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated'
import { useTheme } from '../../context/ThemeContext'

// Cycle ring: a track with coloured arcs for period, fertile window and
// ovulation, plus a "today" marker that sweeps into place. All inputs are
// day numbers within the cycle (1-based); bad input just draws the track.

const clampDay = (d, L) => Math.max(1, Math.min(L, Math.round(d || 1)))

const Arc = ({ size, stroke, color, fromDay, toDay, length, opacity = 1 }) => {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const per = c / length
  const start = (clampDay(fromDay, length) - 1) * per
  const len = Math.max(per * 0.6, (clampDay(toDay, length) - clampDay(fromDay, length) + 1) * per - 2)
  return (
    <Circle
      cx={size / 2}
      cy={size / 2}
      r={r}
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      fill="none"
      opacity={opacity}
      strokeDasharray={`${len} ${c}`}
      strokeDashoffset={-start}
    />
  )
}

const CycleRing = ({ size, cycleLength, cycleDay, periodDays, fertileFrom, fertileTo, ovulationDay, late, children }) => {
  const { colors } = useTheme()
  const L = Math.max(15, Math.min(90, Math.round(cycleLength || 28)))
  const stroke = Math.max(12, Math.round(size * 0.065))
  const today = late ? L : clampDay(cycleDay, L)
  const targetDeg = ((today - 0.5) / L) * 360

  const rot = useSharedValue(0)
  const appear = useSharedValue(0)
  useEffect(() => {
    appear.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) })
    rot.value = withDelay(150, withTiming(targetDeg, { duration: 900, easing: Easing.out(Easing.cubic) }))
  }, [targetDeg])

  const ringStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: 0.92 + appear.value * 0.08 }],
  }))
  const markerStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }))

  const hasFertile = fertileFrom && fertileTo && fertileTo >= fertileFrom
  return (
    <Animated.View style={[{ width: size, height: size }, ringStyle]}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Arc size={size} stroke={stroke} color={late ? colors.periodSoft : colors.track} fromDay={1} toDay={L} length={L} />
          {!late && periodDays > 0 ? (
            <Arc size={size} stroke={stroke} color={colors.period} fromDay={1} toDay={periodDays} length={L} />
          ) : null}
          {!late && hasFertile ? (
            <Arc size={size} stroke={stroke} color={colors.fertile} fromDay={fertileFrom} toDay={fertileTo} length={L} opacity={0.9} />
          ) : null}
          {!late && ovulationDay ? (
            <Arc size={size} stroke={stroke} color={colors.ovulation} fromDay={ovulationDay} toDay={ovulationDay} length={L} />
          ) : null}
        </G>
      </Svg>
      {/* today marker */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, markerStyle]}>
        <View
          style={[
            styles.marker,
            {
              width: stroke + 10,
              height: stroke + 10,
              borderRadius: (stroke + 10) / 2,
              left: size / 2 - (stroke + 10) / 2,
              top: stroke / 2 - (stroke + 10) / 2,
              borderColor: late ? colors.period : colors.text,
              backgroundColor: colors.surface,
            },
          ]}
        />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="box-none">
        {children}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  marker: { position: 'absolute', borderWidth: 3, elevation: 3, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  center: { alignItems: 'center', justifyContent: 'center', padding: 28 },
})

export default memo(CycleRing)
