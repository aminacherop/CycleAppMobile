import { memo } from 'react'
import Svg, { Path, Circle, Rect, G } from 'react-native-svg'

// Line-icon set drawn on a 24×24 grid. Stroke icons inherit `color`;
// a few (drop, leaf, egg) are filled because they mark calendar days.
// Unknown names render nothing instead of crashing.

const S = (color, w = 2) => ({
  fill: 'none',
  stroke: color,
  strokeWidth: w,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

const ICONS = {
  drop: (c) => <Path fill={c} d="M12 2.5c-.3 0-.6.2-.8.4C9.6 5 5.5 10.4 5.5 14.5a6.5 6.5 0 0 0 13 0c0-4.1-4.1-9.5-5.7-11.6-.2-.2-.5-.4-.8-.4Z" />,
  'drop-outline': (c) => <Path {...S(c)} d="M12 3.5C10.4 5.6 6.5 10.6 6.5 14.5a5.5 5.5 0 0 0 11 0c0-3.9-3.9-8.9-5.5-11Z" />,
  leaf: (c) => <Path fill={c} d="M20.5 3.6c-7.3-.4-12.6 1.6-15 5.6-1.6 2.6-1.4 5.7.1 8.1L3.8 19a1 1 0 1 0 1.4 1.4l1.8-1.8c2.4 1.5 5.5 1.7 8.1.1 4-2.4 6-7.7 5.6-15a1.2 1.2 0 0 0-.2-.1ZM8.4 17.1l6.3-6.3a1 1 0 0 0-1.4-1.4L7 15.7a5 5 0 0 1 .2-5.4c1.7-2.8 5.5-4.4 11.2-4.5-.1 5.7-1.7 9.5-4.5 11.2a5 5 0 0 1-5.5.1Z" />,
  egg: (c) => (
    <G>
      <Circle cx="12" cy="12" r="5" fill={c} />
      <Path {...S(c)} d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </G>
  ),
  home: (c) => <Path {...S(c)} d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" />,
  'home-fill': (c) => <Path fill={c} stroke={c} strokeWidth={2} strokeLinejoin="round" d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" />,
  calendar: (c) => (
    <G {...S(c)}>
      <Rect x="4" y="5.5" width="16" height="14.5" rx="3" />
      <Path d="M8 3.5v4M16 3.5v4M4 10h16" />
    </G>
  ),
  track: (c) => (
    <G {...S(c)}>
      <Rect x="4" y="4" width="16" height="16" rx="4" />
      <Path d="M12 8.5v7M8.5 12h7" />
    </G>
  ),
  chart: (c) => <Path {...S(c)} d="M5 19V11M10 19V5M15 19v-6M20 19v-9" />,
  user: (c) => (
    <G {...S(c)}>
      <Circle cx="12" cy="8.5" r="4" />
      <Path d="M4.5 20c1.3-3.6 4.2-5.5 7.5-5.5s6.2 1.9 7.5 5.5" />
    </G>
  ),
  bell: (c) => <Path {...S(c)} d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2ZM10 20.5a2 2 0 0 0 4 0" />,
  'chevron-right': (c) => <Path {...S(c, 2.2)} d="m9.5 6 6 6-6 6" />,
  'chevron-left': (c) => <Path {...S(c, 2.2)} d="m14.5 6-6 6 6 6" />,
  'chevron-down': (c) => <Path {...S(c, 2.2)} d="m6 9.5 6 6 6-6" />,
  check: (c) => <Path {...S(c, 3)} d="m6 12.5 4 4 8-9" />,
  close: (c) => <Path {...S(c, 2.2)} d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  plus: (c) => <Path {...S(c, 2.4)} d="M12 5v14M5 12h14" />,
  minus: (c) => <Path {...S(c, 2.4)} d="M5 12h14" />,
  edit: (c) => <Path {...S(c)} d="M4 20h4L19 9l-4-4L4 16v4Z" />,
  moon: (c) => <Path {...S(c)} d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />,
  sun: (c) => (
    <G {...S(c)}>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </G>
  ),
  globe: (c) => (
    <G {...S(c)}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" />
    </G>
  ),
  pill: (c) => (
    <G {...S(c)}>
      <Rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <Path d="m9.5 9.5 5 5" />
    </G>
  ),
  doc: (c) => (
    <G {...S(c)}>
      <Path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5Z" />
      <Path d="M9 12h6M9 16h6" />
    </G>
  ),
  cloud: (c) => <Path {...S(c)} d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.5 18.5H7ZM12 10.5v6M9.5 13l2.5-2.5 2.5 2.5" />,
  download: (c) => <Path {...S(c)} d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />,
  upload: (c) => <Path {...S(c)} d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14" />,
  share: (c) => <Path {...S(c)} d="M12 15V4M7.5 8.5 12 4l4.5 4.5M6 12.5H5v7h14v-7h-1" />,
  shield: (c) => <Path {...S(c)} d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6l-7-2.5Z" />,
  lock: (c) => (
    <G {...S(c)}>
      <Rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </G>
  ),
  trash: (c) => <Path {...S(c)} d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />,
  target: (c) => (
    <G {...S(c)}>
      <Circle cx="12" cy="12" r="8.5" />
      <Circle cx="12" cy="12" r="4.5" />
      <Circle cx="12" cy="12" r="1" fill={c} />
    </G>
  ),
  book: (c) => <Path {...S(c)} d="M4 5.5c2.7-1 5.3-1 8 1 2.7-2 5.3-2 8-1V19c-2.7-1-5.3-1-8 1-2.7-2-5.3-2-8-1V5.5ZM12 6.5V20" />,
  baby: (c) => (
    <G {...S(c)}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M9 10.5h.01M15 10.5h.01M9.5 15c1.5 1.2 3.5 1.2 5 0" />
    </G>
  ),
  smile: (c) => (
    <G {...S(c)}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M9 10h.01M15 10h.01M8.5 14c2 2.2 5 2.2 7 0" />
    </G>
  ),
  bolt: (c) => <Path {...S(c)} d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12L13 3Z" />,
  water: (c) => <Path {...S(c)} d="M6 4h12l-1.5 15.5a1 1 0 0 1-1 .9h-7a1 1 0 0 1-1-.9L6 4ZM6.6 10h10.8" />,
  bed: (c) => <Path {...S(c)} d="M3.5 18.5V6M3.5 14h17v4.5M20.5 14v-2.5a3 3 0 0 0-3-3H11V14M7.5 11.5h.01" />,
  gear: (c) => (
    <G {...S(c)}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" />
    </G>
  ),
  star: (c) => <Path {...S(c)} d="m12 4 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.6-5 2.6 1-5.6-4.1-3.9 5.6-.8L12 4Z" />,
  'star-fill': (c) => <Path fill={c} d="m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3.2Z" />,
  'heart-fill': (c) => <Path fill={c} d="M12 20.3s-8-4.7-8-10.6A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8 2.9c0 5.9-8 10.6-8 10.6Z" />,
  heart: (c) => <Path {...S(c)} d="M12 19.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 6.8a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10-7.5 10Z" />,
  info: (c) => (
    <G {...S(c)}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 11v5M12 8h.01" />
    </G>
  ),
  alert: (c) => (
    <G {...S(c)}>
      <Path d="M12 4 2.8 19.5h18.4L12 4Z" />
      <Path d="M12 10v4M12 17h.01" />
    </G>
  ),
  note: (c) => (
    <G {...S(c)}>
      <Rect x="4.5" y="4" width="15" height="16" rx="2.5" />
      <Path d="M8 9h8M8 13h8M8 17h5" />
    </G>
  ),
  thermometer: (c) => <Path {...S(c)} d="M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0ZM12 9v7" />,
  scale: (c) => (
    <G {...S(c)}>
      <Rect x="4" y="4" width="16" height="16" rx="4" />
      <Path d="M9 9.5a4 4 0 0 1 6 0M12 9.5l1.2-1.6" />
    </G>
  ),
  sparkle: (c) => <Path {...S(c)} d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2L12 3.5Z" />,
  clock: (c) => (
    <G {...S(c)}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7.5V12l3 2" />
    </G>
  ),
  refresh: (c) => <Path {...S(c)} d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  test: (c) => <Path {...S(c)} d="M9 3.5h6M10 3.5v6.2L5.2 18a1.7 1.7 0 0 0 1.5 2.5h10.6a1.7 1.7 0 0 0 1.5-2.5L14 9.7V3.5M7.5 14.5h9" />,
  flower: (c) => (
    <G {...S(c)}>
      <Circle cx="12" cy="12" r="2.5" />
      <Path d="M12 9.5C10 6 10.5 3.5 12 3.5s2 2.5 0 6ZM12 14.5c2 3.5 1.5 6-.0 6s-2-2.5 0-6ZM9.5 12C6 14 3.5 13.5 3.5 12s2.5-2 6 0ZM14.5 12c3.5-2 6-1.5 6 0s-2.5 2-6 0Z" />
    </G>
  ),
  intimacy: (c) => <Path {...S(c)} d="M8.5 18s-5-3-5-6.8A2.9 2.9 0 0 1 8.5 9.4a2.9 2.9 0 0 1 5 1.8c0 3.8-5 6.8-5 6.8ZM14 6.6a2.9 2.9 0 0 1 6.5 1.8c0 2.6-2.4 4.8-4 6" />,
  menu: (c) => <Path {...S(c)} d="M4.5 7h15M4.5 12h15M4.5 17h15" />,
  history: (c) => <Path {...S(c)} d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4M12 8v4.5l3 1.8" />,
  mail: (c) => (
    <G {...S(c)}>
      <Rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <Path d="m4.5 7 7.5 6 7.5-6" />
    </G>
  ),
}

const Icon = ({ name, size = 22, color = '#000', style }) => {
  const draw = ICONS[name]
  if (!draw) return null
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} accessible={false} importantForAccessibility="no-hide-descendants">
      {draw(color)}
    </Svg>
  )
}

export const ICON_NAMES = Object.keys(ICONS)
export default memo(Icon)
