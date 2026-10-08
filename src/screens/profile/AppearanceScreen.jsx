import { View, StyleSheet } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { Screen, AppText, FadeIn, Tap, Icon } from '../../components/ui'
import { PALETTES, RADIUS } from '../../theme/palette'
import { BackHeader, useSavedFlash } from './shared'

// Tiny "screen" drawn with the real palette tokens.
const MiniScreen = ({ p, style }) => (
  <View style={[styles.mini, { backgroundColor: p.bg }, style]}>
    <View style={[styles.miniBar, { backgroundColor: p.primary, width: '55%' }]} />
    <View style={[styles.miniCard, { backgroundColor: p.surface, borderColor: p.border }]}>
      <View style={[styles.miniDot, { backgroundColor: p.period }]} />
      <View style={[styles.miniLine, { backgroundColor: p.textFaint }]} />
    </View>
    <View style={[styles.miniCard, { backgroundColor: p.surface, borderColor: p.border }]}>
      <View style={[styles.miniDot, { backgroundColor: p.fertile }]} />
      <View style={[styles.miniLine, { backgroundColor: p.textFaint }]} />
    </View>
  </View>
)

const Preview = ({ mode }) => {
  if (mode !== 'system') return <MiniScreen p={PALETTES[mode]} />
  return (
    <View style={[styles.mini, { flexDirection: 'row', padding: 0, overflow: 'hidden' }]}>
      <View style={{ flex: 1, overflow: 'hidden' }}><MiniScreen p={PALETTES.light} style={styles.half} /></View>
      <View style={{ flex: 1, overflow: 'hidden' }}><MiniScreen p={PALETTES.dark} style={styles.half} /></View>
    </View>
  )
}

export default function AppearanceScreen({ navigation }) {
  const { colors, theme, changeTheme } = useTheme()
  const { t } = useLanguage()
  const [saved, flash] = useSavedFlash()
  const options = [
    { key: 'light', label: t('theme_light'), icon: 'sun' },
    { key: 'dark', label: t('theme_dark'), icon: 'moon' },
    { key: 'system', label: t('theme_system'), icon: 'gear' },
  ]

  const choose = async (key) => {
    if (key === theme) return
    try { await changeTheme(key); flash() } catch (e) { console.warn('Theme change failed', e) }
  }

  return (
    <Screen header={<BackHeader navigation={navigation} title={t('pf_appearance')} saved={saved} />}>
      <View style={styles.grid}>
        {options.map((o, i) => {
          const on = theme === o.key
          return (
            <FadeIn key={o.key} index={i} style={{ flex: 1 }}>
              <Tap
                onPress={() => choose(o.key)}
                haptic
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={o.label}
                style={[styles.option, { borderColor: on ? colors.primary : colors.border, backgroundColor: colors.surface }]}
              >
                <Preview mode={o.key} />
                <View style={styles.label}>
                  <Icon name={on ? 'check' : o.icon} size={15} color={on ? colors.primary : colors.textMuted} />
                  <AppText variant="caption" color={on ? colors.primary : colors.text} style={{ fontWeight: '700' }} numberOfLines={1}>
                    {o.label}
                  </AppText>
                </View>
              </Tap>
            </FadeIn>
          )
        })}
      </View>
      <AppText variant="small" muted style={{ marginTop: 14, fontWeight: '500' }}>{t('pf_system_hint')}</AppText>
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 10, marginTop: 8 },
  option: { borderWidth: 2, borderRadius: RADIUS.lg, padding: 8, alignItems: 'stretch' },
  mini: { aspectRatio: 0.72, borderRadius: 12, padding: 8, gap: 6 },
  half: { width: '200%', borderRadius: 0 },
  miniBar: { height: 7, borderRadius: 4, marginBottom: 2 },
  miniCard: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 7, padding: 6 },
  miniDot: { width: 9, height: 9, borderRadius: 5 },
  miniLine: { flex: 1, height: 4, borderRadius: 2, opacity: 0.6 },
  label: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 10, paddingBottom: 4, minHeight: 36 },
})
