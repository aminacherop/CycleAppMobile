import { useCallback, useMemo, useState } from 'react'
import { View, StyleSheet, Linking } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Constants from 'expo-constants'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import {
  Screen, ScreenHeader, AppText, Card, FadeIn, ListGroup, ListRow, Toggle, Icon,
} from '../../components/ui'
import { GOALS } from '../../constants/logOptions'
import { getPregnancyProgress, normalizeSettings } from '../../utils/cycleEngine'
import { normalizePrefs } from '../../utils/notificationPrefs'
import { ageFromDob, loadGoal, loadPregnancy, saveGoal } from './shared'

const PACKAGE = 'com.mycycleapp.periodtracker'
export const CONDITION_KEYS = {
  none: 'cond_none', pcos: 'cond_pcos', endo: 'cond_endo', peri: 'cond_peri', postpill: 'cond_postpill', other: 'cond_other',
}
export const GOAL_LABEL_KEYS = {
  ...Object.fromEntries((GOALS || []).map(g => [g.id, g.labelKey])),
  wellbeing: 'goal_wellbeing',
}

export const openStore = () => {
  // https first: opens the Play Store app directly (market:// gets a store
  // chooser on some phones, e.g. Xiaomi).
  Linking.openURL(`https://play.google.com/store/apps/details?id=${PACKAGE}`)
    .catch(() => Linking.openURL(`market://details?id=${PACKAGE}`))
    .catch(() => {})
}

export default function ProfileScreen({ navigation }) {
  const { colors, theme } = useTheme()
  const { t, language, languages } = useLanguage()
  const app = useApp()
  const [goal, setGoal] = useState('track_period')
  const [preg, setPreg] = useState({ on: false, gestationStart: null })

  useFocusEffect(useCallback(() => {
    let alive = true
    Promise.all([loadGoal(), loadPregnancy()])
      .then(([g, p]) => { if (alive) { setGoal(g); setPreg(p) } })
      .catch(() => {})
    return () => { alive = false }
  }, []))

  const profile = app.userProfile || {}
  const name = typeof profile.name === 'string' ? profile.name.trim() : ''
  const age = ageFromDob(profile.dob)
  const condKey = CONDITION_KEYS[profile.condition]
  const settings = normalizeSettings(app.cycleSettings)
  const prefs = useMemo(() => normalizePrefs(app.notificationPrefs), [app.notificationPrefs])
  const lang = (languages || []).find(l => l.code === language)
  const version = Constants.expoConfig?.version || ''

  const progress = preg.on
    ? getPregnancyProgress(preg.gestationStart || app.cycleState?.lastPeriodStart || app.today, app.today)
    : null

  const headerSub = [
    age != null ? t('pf_age_years', { n: age }) : null,
    condKey && profile.condition !== 'none' ? t(condKey) : null,
  ].filter(Boolean).join(' · ')

  const themeLabel = theme === 'light' ? t('theme_light') : theme === 'dark' ? t('theme_dark') : t('theme_system')

  const onTogglePregnancy = async (value) => {
    if (value) {
      try {
        await app.startPregnancyMode()
        await saveGoal('pregnancy')
        setPreg(p => ({ ...p, on: true }))
      } catch (e) {
        console.warn('Could not start pregnancy mode', e)
      }
      navigation.navigate('Pregnancy')
    } else {
      navigation.navigate('Pregnancy', { askEnd: true })
    }
  }

  let i = 0
  return (
    <Screen header={<ScreenHeader title={t('profile')} large />}>
      <FadeIn index={i++}>
        <Card onPress={() => navigation.navigate('EditProfile')} accessibilityLabel={t('edit_profile')}>
          <View style={styles.head}>
            <View style={[styles.avatar, { backgroundColor: colors.primarySoft2 }]}>
              <AppText variant="title" color={colors.primary}>
                {name ? name.charAt(0).toUpperCase() : '?'}
              </AppText>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="heading" numberOfLines={1}>{name || t('your_name')}</AppText>
              <AppText variant="caption" muted numberOfLines={1}>{headerSub || t('pf_tap_to_edit')}</AppText>
            </View>
            <View style={[styles.editDot, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name="edit" size={16} color={colors.textMuted} />
            </View>
          </View>
        </Card>
      </FadeIn>

      <FadeIn index={i++}>
        <ListGroup title={t('pf_my_cycle')}>
          <ListRow
            icon="refresh" tone="period"
            title={t('pf_cycle_period')}
            value={t('pf_cycle_value', { c: settings.cycleLength, p: settings.periodLength })}
            onPress={() => navigation.navigate('CycleSettings')}
          />
          <ListRow
            icon="target" tone="ovulation"
            title={t('pf_goal')}
            value={t(GOAL_LABEL_KEYS[goal] || 'goal_track_period')}
            onPress={() => navigation.navigate('Goal')}
          />
          <ListRow
            icon="baby" tone="primary"
            title={t('pregnancy_mode_title')}
            subtitle={progress ? t('pf_week_day', { w: progress.weeks, d: progress.days }) : null}
            onPress={() => navigation.navigate('Pregnancy')}
            chevron={false}
            right={<Toggle value={preg.on} onChange={onTogglePregnancy} accessibilityLabel={t('pregnancy_mode_title')} />}
          />
          <ListRow
            icon="pill" tone="success"
            title={t('pf_pills')}
            onPress={() => navigation.navigate('Medications')}
          />
        </ListGroup>
      </FadeIn>

      <FadeIn index={i++}>
        <ListGroup title={t('pf_app')}>
          <ListRow
            icon="bell" tone="warning"
            title={t('reminders_label')}
            value={prefs.enabled ? t('pf_on') : t('pf_off')}
            onPress={() => navigation.navigate('Reminders')}
          />
          <ListRow
            icon="moon" tone="ovulation"
            title={t('pf_appearance')}
            value={themeLabel}
            onPress={() => navigation.navigate('Appearance')}
          />
          <ListRow
            icon="globe" tone="info"
            title={t('language')}
            value={lang?.nativeName || 'English'}
            onPress={() => navigation.navigate('Language')}
          />
        </ListGroup>
      </FadeIn>

      <FadeIn index={i++}>
        <ListGroup title={t('pf_data_privacy')}>
          <ListRow
            icon="cloud" tone="info"
            title={t('pf_backup_restore')}
            onPress={() => navigation.navigate('Backup')}
          />
          <ListRow
            icon="shield" tone="success"
            title={t('pf_privacy')}
            onPress={() => navigation.navigate('Privacy')}
          />
        </ListGroup>
      </FadeIn>

      <FadeIn index={i++}>
        <ListGroup title={t('pf_about')}>
          <ListRow
            icon="book" tone="fertile"
            title={t('pf_health_articles')}
            onPress={() => navigation.navigate('Articles')}
          />
          <ListRow
            icon="star" tone="warning"
            title={t('pf_rate_app')}
            onPress={openStore}
          />
          <ListRow
            icon="info" tone="primary"
            title={t('version')}
            value={version}
          />
        </ListGroup>
      </FadeIn>
    </Screen>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  editDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
})
