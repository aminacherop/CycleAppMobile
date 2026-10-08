import { useCallback, useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated'
import dayjs from 'dayjs'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import {
  Screen, AppText, Button, Card, FadeIn, IconBadge, ListGroup, ListRow, Segmented, Sheet,
} from '../../components/ui'
import { getPregnancyProgress, clampLmpDate } from '../../utils/cycleEngine'
import { formatDate, parseDate } from '../../utils/dates'
import { saveData } from '../../utils/storage'
import { successHaptic } from '../../utils/haptics'
import { nDays, BackHeader, endPregnancyMode, loadPregnancy, saveGoal, usePicker, useSavedFlash } from './shared'

const ProgressBar = ({ value }) => {
  const { colors } = useTheme()
  const w = useSharedValue(0)
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value || 0)), { duration: 900, easing: Easing.out(Easing.cubic) })
  }, [value])
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }))
  return (
    <View style={[styles.track, { backgroundColor: colors.track }]}>
      <Animated.View style={[styles.fill, { backgroundColor: colors.primary }, style]} />
    </View>
  )
}

export default function PregnancyScreen({ navigation, route }) {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const app = useApp()
  const picker = usePicker()
  const [saved, flash] = useSavedFlash()
  const [state, setState] = useState(null) // { on, gestationStart, display }
  const [draftLmp, setDraftLmp] = useState(null)
  const [endOpen, setEndOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const today = app.today || dayjs().format('YYYY-MM-DD')

  const refresh = useCallback(async () => {
    try {
      const p = await loadPregnancy()
      setState(p)
      return p
    } catch {
      const p = { on: false, gestationStart: null, display: 'since_pregnancy' }
      setState(p)
      return p
    }
  }, [])

  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  // Opened from the Profile toggle to switch it off → ask why.
  useEffect(() => {
    if (route?.params?.askEnd && state?.on) {
      setEndOpen(true)
      navigation.setParams?.({ askEnd: undefined })
    }
  }, [route?.params?.askEnd, state?.on])

  const fallbackLmp = clampLmpDate(app.cycleState?.lastPeriodStart || today, today) || today
  const lmp = state?.on
    ? (clampLmpDate(state.gestationStart, today) || fallbackLmp)
    : (draftLmp || fallbackLmp)
  const progress = getPregnancyProgress(lmp, today)

  const pickLmp = () => picker.open({
    mode: 'date',
    title: t('pf_lmp'),
    value: parseDate(lmp)?.toDate() || new Date(),
    minimumDate: dayjs(today).subtract(44, 'week').toDate(),
    maximumDate: dayjs(today).toDate(),
    onPick: async (d) => {
      const next = clampLmpDate(dayjs(d).format('YYYY-MM-DD'), today)
      if (!next) return
      if (state?.on) {
        await saveData('gestation_start', next)
        setState(s => ({ ...s, gestationStart: next }))
        flash()
      } else {
        setDraftLmp(next)
      }
    },
  })

  const turnOn = async () => {
    setBusy(true)
    try {
      await app.startPregnancyMode(lmp)
      await saveGoal('pregnancy')
      successHaptic()
      await refresh()
    } catch (e) {
      console.warn('Start pregnancy failed', e)
    } finally {
      setBusy(false)
    }
  }

  const end = async (reason) => {
    setEndOpen(false)
    try {
      await endPregnancyMode(reason, today)
      await refresh()
      navigation.goBack()
    } catch (e) {
      console.warn('End pregnancy failed', e)
    }
  }

  const setDisplay = async (v) => {
    setState(s => ({ ...s, display: v }))
    await saveData('pregnancy_homepage_display', v)
    flash()
  }

  if (!state) return <Screen header={<BackHeader navigation={navigation} title={t('pregnancy_mode_title')} />} />

  return (
    <Screen header={<BackHeader navigation={navigation} title={t('pregnancy_mode_title')} saved={saved} />}>
      {state.on && progress ? (
        <>
          <FadeIn index={0}>
            <Card style={{ marginTop: 4 }}>
              <View style={styles.heroTop}>
                <IconBadge name="baby" tone="primary" size={48} />
                <View style={{ flex: 1 }}>
                  <AppText variant="overline" muted>{t('pf_trimester', { n: progress.trimester })}</AppText>
                  <AppText variant="title">{t('pf_weeks_days', { w: progress.weeks, d: progress.days })}</AppText>
                </View>
              </View>
              <ProgressBar value={progress.progress} />
              <View style={styles.heroBottom}>
                <View style={{ flex: 1 }}>
                  <AppText variant="small" muted style={{ fontWeight: '500' }}>{t('pf_due_date')}</AppText>
                  <AppText variant="bodyStrong">{formatDate(progress.dueDate, 'MMM D, YYYY', language)}</AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="small" muted style={{ fontWeight: '500' }}>{t('pf_to_go')}</AppText>
                  <AppText variant="bodyStrong">
                    {progress.isOverdue ? t('pf_due_passed') : nDays(t, progress.daysRemaining)}
                  </AppText>
                </View>
              </View>
            </Card>
          </FadeIn>

          <FadeIn index={1}>
            <ListGroup footer={t('pf_lmp_hint')}>
              <ListRow
                icon="calendar" tone="period"
                title={t('pf_lmp')}
                value={formatDate(lmp, 'MMM D, YYYY', language)}
                onPress={pickLmp}
              />
            </ListGroup>
          </FadeIn>

          <FadeIn index={2}>
            <AppText variant="overline" muted style={{ marginTop: 22, marginBottom: 8, marginHorizontal: 2 }}>{t('pf_home_shows')}</AppText>
            <Segmented
              options={[
                { key: 'since_pregnancy', label: t('pf_weeks_pregnant') },
                { key: 'days_to_baby', label: t('pf_days_to_baby') },
              ]}
              value={state.display}
              onChange={setDisplay}
            />
          </FadeIn>

          <FadeIn index={3}>
            <Button title={t('my_baby_was_born')} variant="soft" icon="heart" onPress={() => end('baby_born')} style={{ marginTop: 28 }} />
            <Button title={t('pf_end_pregnancy')} variant="danger" onPress={() => setEndOpen(true)} style={{ marginTop: 10 }} />
          </FadeIn>
        </>
      ) : (
        <>
          <FadeIn index={0}>
            <Card style={{ marginTop: 4, alignItems: 'center' }}>
              <IconBadge name="baby" tone="primary" size={60} />
              <AppText variant="heading" center style={{ marginTop: 12 }}>{t('pf_preg_intro_title')}</AppText>
              <AppText variant="caption" muted center style={{ marginTop: 6 }}>{t('pf_preg_intro_body')}</AppText>
            </Card>
          </FadeIn>
          <FadeIn index={1}>
            <ListGroup footer={t('pf_lmp_hint')}>
              <ListRow
                icon="calendar" tone="period"
                title={t('pf_lmp')}
                value={formatDate(lmp, 'MMM D, YYYY', language)}
                subtitle={progress ? t('pf_weeks_days', { w: progress.weeks, d: progress.days }) : null}
                onPress={pickLmp}
              />
            </ListGroup>
          </FadeIn>
          <FadeIn index={2}>
            <Button title={t('pf_turn_on_pregnancy')} icon="baby" onPress={turnOn} loading={busy} style={{ marginTop: 24 }} />
          </FadeIn>
        </>
      )}

      <Sheet visible={endOpen} onClose={() => setEndOpen(false)} title={t('pf_end_pregnancy')}>
        <AppText variant="caption" muted style={{ marginBottom: 14 }}>{t('pf_end_why')}</AppText>
        <View style={{ gap: 10 }}>
          <Button title={t('my_baby_was_born')} variant="soft" onPress={() => end('baby_born')} />
          <Button title={t('no_longer_pregnant')} variant="secondary" onPress={() => end('no_longer_pregnant')} />
          <Button title={t('turned_on_by_mistake')} variant="secondary" onPress={() => end('mistake')} />
          <Button title={t('cancel')} variant="ghost" onPress={() => setEndOpen(false)} />
        </View>
      </Sheet>
      {picker.element}
    </Screen>
  )
}

const styles = StyleSheet.create({
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  heroBottom: { flexDirection: 'row', marginTop: 14, gap: 12 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
})
