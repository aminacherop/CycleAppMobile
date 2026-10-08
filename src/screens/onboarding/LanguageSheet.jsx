import { memo, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { Sheet, Tap, AppText, Icon } from '../../components/ui'
import { RADIUS } from '../../theme/palette'

// Language pill (shows the current language) + bottom sheet to change it.
// `onRestartNeeded` fires when the change flips the layout direction (RTL).
const LanguagePill = ({ onRestartNeeded }) => {
  const { colors } = useTheme()
  const { t, language, languages, changeLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const list = Array.isArray(languages) ? languages : []
  const current = list.find((l) => l.code === language)

  const pick = async (code) => {
    setOpen(false)
    if (code === language) return
    try {
      const needsRestart = await changeLanguage(code)
      if (needsRestart) onRestartNeeded?.()
    } catch (err) {
      console.warn('Language change failed', err)
    }
  }

  return (
    <>
      <Tap
        onPress={() => setOpen(true)}
        haptic
        accessibilityLabel={t('choose_language')}
        style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Icon name="globe" size={17} color={colors.primary} />
        <AppText variant="caption" style={{ fontWeight: '700' }} numberOfLines={1}>
          {current?.nativeName || 'English'}
        </AppText>
        <Icon name="chevron-down" size={15} color={colors.textMuted} />
      </Tap>
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('choose_language')}>
        <View style={{ gap: 8, paddingBottom: 8 }}>
          {list.map((l) => {
            const on = l.code === language
            return (
              <Tap
                key={l.code}
                onPress={() => pick(l.code)}
                haptic
                scaleTo={0.985}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={l.nativeName}
                style={[
                  styles.row,
                  { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : colors.surface },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="bodyStrong" color={on ? colors.primary : colors.text} numberOfLines={1}>{l.nativeName}</AppText>
                  {l.name !== l.nativeName ? (
                    <AppText variant="small" muted style={{ fontWeight: '500', marginTop: 1 }} numberOfLines={1}>{l.name}</AppText>
                  ) : null}
                </View>
                {on ? <Icon name="check" size={20} color={colors.primary} /> : null}
              </Tap>
            )
          })}
        </View>
      </Sheet>
    </>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.pill,
    paddingHorizontal: 12, minHeight: 40, maxWidth: 220,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 56,
  },
})

export default memo(LanguagePill)
