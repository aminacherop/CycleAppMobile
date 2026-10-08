import { memo } from 'react'
import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

// A day bubble drawn with SVG. Android ignores borderRadius on views with a
// dashed border (they render square), so circles that may be dashed are
// drawn here instead. Children (the day number) are centred on top.
const DayCircle = ({ size, fill = 'transparent', stroke, strokeWidth = 1.5, dashed = false, children, style }) => {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const dash = dashed ? `${c / 22} ${c / 22}` : undefined
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={stroke ? r : size / 2}
          fill={fill}
          stroke={stroke || 'none'}
          strokeWidth={stroke ? strokeWidth : 0}
          strokeDasharray={dash}
        />
      </Svg>
      {children}
    </View>
  )
}

export default memo(DayCircle)
