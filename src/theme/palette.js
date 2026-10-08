// Design tokens for the "Rose" look. Every screen reads colours from
// useTheme().colors — never hardcode hex values in screens.
//
// The legacy keys at the bottom of each palette (pink, pinkLight, white, …)
// map onto the new tokens so older screens keep working while they migrate.

const withLegacy = (p) => ({
  ...p,
  pink: p.primary,
  pinkLight: p.primarySoft2,
  pinkDark: p.primaryPressed,
  pinkAccent: p.primary,
  pinkSoft: p.primarySoft,
  pinkMid: p.primarySoft2,
  background: p.bg,
  white: p.surface,
  card: p.surface,
  textPrimary: p.text,
  textSecondary: p.textMuted,
  purple: p.ovulation,
})

export const PALETTES = {
  light: withLegacy({
    bg: '#FFF8FA',
    surface: '#FFFFFF',
    surfaceAlt: '#FBF1F5',
    border: '#F0E3E9',
    text: '#1F1A24',
    textMuted: '#6B6472',
    textFaint: '#9A93A1',
    onPrimary: '#FFFFFF',
    primary: '#C2527A',
    primaryPressed: '#A63E64',
    primarySoft: '#FCEEF3',
    primarySoft2: '#F8DCE6',
    period: '#E5487A',
    periodSoft: '#FDE7EF',
    fertile: '#1FA69A',
    fertileSoft: '#DFF5F2',
    ovulation: '#7C5CDB',
    ovulationSoft: '#EEE9FC',
    info: '#3B82F6',
    infoSoft: '#E8F0FE',
    warning: '#D97706',
    warningSoft: '#FFF3E0',
    success: '#16A34A',
    successSoft: '#E7F7EC',
    danger: '#DC2626',
    dangerSoft: '#FDECEC',
    neutralSoft: '#F3F4F6',
    track: '#F1E6EB',
    overlay: 'rgba(25,10,20,0.45)',
    tabBar: '#FFFFFF',
    shadow: '#3A1027',
  }),
  dark: withLegacy({
    bg: '#120D11',
    surface: '#1C1519',
    surfaceAlt: '#251C21',
    border: '#2E242A',
    text: '#F5EFF2',
    textMuted: '#B3A9B0',
    textFaint: '#7D737A',
    onPrimary: '#FFFFFF',
    primary: '#E07399',
    primaryPressed: '#C2527A',
    primarySoft: '#3A1C29',
    primarySoft2: '#4A2334',
    period: '#F0628F',
    periodSoft: '#3D1826',
    fertile: '#3CC4B6',
    fertileSoft: '#12322F',
    ovulation: '#9C82F0',
    ovulationSoft: '#2A2142',
    info: '#60A5FA',
    infoSoft: '#16243A',
    warning: '#F5A524',
    warningSoft: '#3A2A10',
    success: '#22C55E',
    successSoft: '#123222',
    danger: '#F87171',
    dangerSoft: '#3A1717',
    neutralSoft: '#2A2327',
    track: '#2E242A',
    overlay: 'rgba(0,0,0,0.6)',
    tabBar: '#1A1317',
    shadow: '#000000',
  }),
}

export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 }
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 }

// Phase → token names, shared by Home, Calendar and Insights.
export const PHASE_COLORS = {
  period: ['period', 'periodSoft'],
  follicular: ['primary', 'primarySoft'],
  fertile: ['fertile', 'fertileSoft'],
  ovulation: ['ovulation', 'ovulationSoft'],
  luteal: ['warning', 'warningSoft'],
  late: ['period', 'periodSoft'],
  unknown: ['textMuted', 'neutralSoft'],
}
