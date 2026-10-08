import { useCallback, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { Screen, AppText, FadeIn, IconBadge, Tap, Icon } from '../../components/ui'
import { GOALS } from '../../constants/logOptions'
import { RADIUS } from '../../theme/palette'
import { BackHeader, loadGoal, loadPregnancy, saveGoal, useSavedFlash } from './shared'

// Same ids GoalSelector used ('track_period' | 'conceive' | 'pregnancy' | 'wellbeing').
const TONES = { track_period: 'period', conceive: 'fertile', pregnancy: 'primary', wellbeing: 'ovulation' }
const DESC = { track_period: 'pf_goal_track_desc', conceive: 'pf_goal_conceive_desc', pregnancy: 'pf_goal_pregnancy_desc', wellbeing: 'pf_goal_wellbeing_desc' }
const OPTIONS = [
  ...(GOALS || []),
  { id: 'wellbeing', labelKey: 'goal_wellbeing', icon: 'bolt' },
].filter((g, i, arr) => g?.id && arr.findIndex(x => x.id === g.id) === i)

export default function GoalScreen({ navigation }) {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const [goal, setGoal] = useState(null)
  const [saved, flash] = useSavedFlash()

  useFocusEffect(useCallback(() => {
    let alive = true
    loadGoal().then(g => { if (alive) setGoal(g) }).catch(() => {})
    return () => { alive = false }
  }, []))

  const choose = async (id) => {
    if (id === goal) return
    setGoal(id)
    try {
      await saveGoal(id)
      flash()
      if (id === 'pregnancy') {
        const p = await loadPregnancy()
        if (!p.on) navigation.navigate('Pregnancy')
      }
    } catch (e) {
      console.warn('Goal save failed', e)
    }
  }

  return (
    <Screen header={<BackHeader navigation={navigation} title={t('pf_goal')} saved={saved} />}>
      <AppText variant="caption" muted style={{ marginBottom: 12 }}>{t('pf_goal_hint')}</AppText>
      <View style={{ gap: 10 }}>
        {OPTIONS.map((g, i) => {
          const on = goal === g.id
          const tone = TONES[g.id] || 'primary'
          return (
            <FadeIn key={g.id} index={i}>
              <Tap
                onPress={() => choose(g.id)}
                haptic
                scaleTo={0.98}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t(g.labelKey)}
                style={[
                  styles.card,
                  { backgroundColor: on ? colors[`${tone}Soft`] : colors.surface, borderColor: on ? colors[tone] : colors.border },
                ]}
              >
                <IconBadge name={g.icon || 'target'} tone={tone} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="subheading">{t(g.labelKey)}</AppText>
                  {DESC[g.id] ? <AppText variant="caption" muted style={{ marginTop: 2 }}>{t(DESC[g.id])}</AppText> : null}
                </View>
                <View style={[styles.radio, { borderColor: on ? colors[tone] : colors.border, backgroundColor: on ? colors[tone] : 'transparent' }]}>
                  {on ? <Icon name="check" size={14} color={colors.onPrimary} /> : null}
                </View>
              </Tap>
            </FadeIn>
          )
        })}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: RADIUS.lg, borderWidth: 1.5, minHeight: 76 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
