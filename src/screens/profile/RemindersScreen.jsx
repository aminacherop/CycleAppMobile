import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState, Linking, View, StyleSheet } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import {
  Screen, AppText, Button, Card, Chip, FadeIn, IconBadge, ListGroup, ListRow, Toggle,
} from '../../components/ui'
import { normalizePrefs } from '../../utils/notificationPrefs'
import {
  getNotificationPermission, requestNotificationPermission, sendTestNotification,
} from '../../utils/notifications'
import { successHaptic, warningHaptic } from '../../utils/haptics'
import { nDays, BackHeader, formatTime, timeToDate, usePicker, useSavedFlash } from './shared'

const safeRequest = async () => {
  try { return !!(await requestNotificationPermission()) } catch { return false }
}

export default function RemindersScreen({ navigation }) {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const app = useApp()
  const picker = usePicker()
  const [saved, flash] = useSavedFlash()
  const [permission, setPermission] = useState('undetermined')
  const [testState, setTestState] = useState(null) // null | 'sending' | 'sent'

  const prefs = useMemo(() => normalizePrefs(app.notificationPrefs), [app.notificationPrefs])

  const checkPermission = useCallback(() => {
    getNotificationPermission().then(setPermission).catch(() => {})
  }, [])
  useFocusEffect(checkPermission)
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') checkPermission() })
    return () => sub.remove()
  }, [checkPermission])

  const update = useCallback(async (partial) => {
    try {
      await app.updateNotificationPrefs(partial)
      flash()
    } catch (e) {
      console.warn('Reminder prefs save failed', e)
    }
  }, [app.updateNotificationPrefs, flash])

  const setMaster = async (on) => {
    if (!on) { update({ enabled: false }); return }
    const granted = await safeRequest()
    checkPermission()
    if (granted) update({ enabled: true })
    else { warningHaptic(); setPermission('denied') }
  }

  // Turning on a single reminder also turns the master switch on.
  const setPref = async (key, value) => {
    if (value && !prefs.enabled) {
      const granted = await safeRequest()
      checkPermission()
      if (!granted) { warningHaptic(); setPermission('denied'); return }
      update({ [key]: value, enabled: true })
      return
    }
    update({ [key]: value })
  }

  const pickTime = (key, title) => picker.open({
    mode: 'time',
    title,
    value: timeToDate(prefs[key]),
    is24Hour: language !== 'en',
    onPick: (d) => update({ [key]: { hour: d.getHours(), minute: d.getMinutes() } }),
  })

  const sendTest = async () => {
    setTestState('sending')
    try {
      const granted = permission === 'granted' || await safeRequest()
      checkPermission()
      if (!granted) { setPermission('denied'); setTestState(null); return }
      await sendTestNotification(t)
      successHaptic()
      setTestState('sent')
      setTimeout(() => setTestState(null), 2500)
    } catch (e) {
      console.warn('Test notification failed', e)
      setTestState(null)
    }
  }

  const blocked = permission === 'denied'
  const off = !prefs.enabled
  const sw = (key, label) => (
    <Toggle value={!!prefs[key] && !off} onChange={(v) => setPref(key, v)} accessibilityLabel={label} />
  )

  return (
    <Screen header={<BackHeader navigation={navigation} title={t('reminders_label')} saved={saved} />}>
      {blocked ? (
        <FadeIn index={0}>
          <Card style={{ marginTop: 4, backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }}>
            <View style={styles.row}>
              <IconBadge name="alert" tone="warning" />
              <View style={{ flex: 1 }}>
                <AppText variant="subheading">{t('pf_notif_blocked_title')}</AppText>
                <AppText variant="caption" muted style={{ marginTop: 2 }}>{t('pf_notif_blocked_body')}</AppText>
              </View>
            </View>
            <Button
              title={t('pf_open_settings')} size="md" variant="secondary" icon="gear"
              onPress={() => Linking.openSettings().catch(() => {})}
              style={{ marginTop: 12 }}
            />
          </Card>
        </FadeIn>
      ) : null}

      <FadeIn index={1}>
        <ListGroup footer={t('pf_reminders_footer')}>
          <ListRow
            icon="bell" tone="primary"
            title={t('pf_allow_reminders')}
            subtitle={prefs.enabled && !blocked ? t('pf_reminders_on') : t('pf_reminders_off')}
            right={<Toggle value={prefs.enabled && !blocked} onChange={setMaster} accessibilityLabel={t('pf_allow_reminders')} />}
          />
        </ListGroup>
      </FadeIn>

      <FadeIn index={2}>
        <ListGroup title={t('pf_cycle_reminders')}>
          <ListRow icon="drop" tone="period" title={t('pf_rem_period')} subtitle={t('pf_rem_period_sub')} right={sw('periodReminder', t('pf_rem_period'))} />
          {prefs.periodReminder && !off ? (
            <View style={styles.chips}>
              <AppText variant="small" muted style={{ fontWeight: '600', marginRight: 2 }}>{t('pf_days_before')}</AppText>
              {[1, 2, 3].map(n => (
                <Chip
                  key={n}
                  label={nDays(t, n)}
                  tone="period"
                  selected={prefs.periodDaysBefore === n}
                  onPress={() => update({ periodDaysBefore: n })}
                />
              ))}
            </View>
          ) : null}
          <ListRow icon="clock" tone="warning" title={t('pf_rem_late')} subtitle={t('pf_rem_late_sub')} right={sw('lateReminder', t('pf_rem_late'))} />
          <ListRow icon="check" tone="period" title={t('pf_rem_period_end')} subtitle={t('pf_rem_period_end_sub')} right={sw('periodEndReminder', t('pf_rem_period_end'))} />
          <ListRow icon="leaf" tone="fertile" title={t('pf_rem_fertile')} subtitle={t('pf_rem_fertile_sub')} right={sw('fertileReminder', t('pf_rem_fertile'))} />
          <ListRow icon="egg" tone="ovulation" title={t('pf_rem_ovulation')} subtitle={t('pf_rem_ovulation_sub')} right={sw('ovulationReminder', t('pf_rem_ovulation'))} />
          <ListRow
            icon="clock" tone="info"
            title={t('pf_rem_time')}
            value={formatTime(prefs.time, language)}
            onPress={() => pickTime('time', t('pf_rem_time'))}
          />
        </ListGroup>
      </FadeIn>

      <FadeIn index={3}>
        <ListGroup title={t('pf_daily_reminders')}>
          <ListRow icon="note" tone="primary" title={t('pf_rem_log')} right={sw('dailyLogReminder', t('pf_rem_log'))} />
          {prefs.dailyLogReminder && !off ? (
            <ListRow
              icon="clock" tone="primary"
              title={t('pf_time')}
              value={formatTime(prefs.dailyLogTime, language)}
              onPress={() => pickTime('dailyLogTime', t('pf_rem_log'))}
            />
          ) : null}
          <ListRow icon="water" tone="info" title={t('pf_rem_water')} right={sw('waterReminder', t('pf_rem_water'))} />
          {prefs.waterReminder && !off ? (
            <ListRow
              icon="clock" tone="info"
              title={t('pf_time')}
              value={formatTime(prefs.waterTime, language)}
              onPress={() => pickTime('waterTime', t('pf_rem_water'))}
            />
          ) : null}
        </ListGroup>
      </FadeIn>

      <FadeIn index={4}>
        <ListGroup>
          <ListRow
            icon="history" tone="ovulation"
            title={t('pf_recent_notifications')}
            onPress={() => navigation.navigate('NotificationHistory')}
          />
        </ListGroup>
        <Button
          title={testState === 'sent' ? t('pf_test_sent') : t('pf_send_test')}
          variant="secondary" size="md" icon={testState === 'sent' ? 'check' : 'bell'}
          loading={testState === 'sending'}
          onPress={sendTest}
          style={{ marginTop: 16 }}
        />
      </FadeIn>
      {picker.element}
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 12, paddingLeft: 58 },
})
