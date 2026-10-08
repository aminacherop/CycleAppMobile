import { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, { FadeIn as RFadeIn } from 'react-native-reanimated'
import { Sheet, AppText, Chip, Toggle, Button, IconBadge, Icon } from './ui'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { useApp } from '../context/AppDataContext'
import { FLOWS, MOODS, QUICK_SYMPTOMS } from '../constants/logOptions'
import { SYMPTOM_CATEGORIES } from '../utils/symptomCategories'
import { formatDate, parseDate } from '../utils/dates'
import { dayStatus, CHANCE } from '../screens/calendar/dayStatus'

const SYMPTOM_LABEL_KEYS = (() => {
  const map = {}
  try {
    SYMPTOM_CATEGORIES.forEach((c) => (c.items || []).forEach((i) => { map[i.id] = i.labelKey }))
  } catch { /* ignore */ }
  return map
})()

const asArray = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])

/**
 * Quick log sheet for one day. <DaySheet date="YYYY-MM-DD"|null visible onClose navigation />
 * Every change saves immediately; values are read fresh from app state.
 */
export default function DaySheet({ date, visible, onClose, navigation }) {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const app = useApp()

  // Keep showing the last date while the sheet animates closed.
  const lastDate = useRef(null)
  const valid = parseDate(date) ? String(date).slice(0, 10) : null
  if (valid) lastDate.current = valid
  const d = valid || lastDate.current

  const [savedTick, setSavedTick] = useState(0)
  useEffect(() => {
    if (!savedTick) return undefined
    const id = setTimeout(() => setSavedTick(0), 1600)
    return () => clearTimeout(id)
  }, [savedTick])
  useEffect(() => { if (!visible) setSavedTick(0) }, [visible])

  const run = useCallback(async (fn) => {
    try {
      await fn()
      setSavedTick((x) => x + 1)
    } catch (err) {
      console.warn('DaySheet save failed', err)
    }
  }, [])

  if (!d) return <Sheet visible={false} onClose={onClose} />

  const info = (() => { try { return app.getDayInfo(d) } catch { return null } })()
  const chance = (() => { try { return app.getConceptionChance(d) } catch { return null } })()
  const status = dayStatus(info, { hasData: app.cycleState?.hasData, periodDays: app.periodDays }, t)
  const isFuture = d > app.today
  const log = (app.dailyLogs && typeof app.dailyLogs[d] === 'object' && app.dailyLogs[d]) || {}
  const isPeriodDay = Array.isArray(app.periodDays) && app.periodDays.includes(d)
  const moods = asArray(log.moods)
  const symptoms = asArray(log.symptomsDetailed)

  const go = (screen, params) => {
    onClose?.()
    try { navigation?.navigate('TrackTab', { screen, params }) } catch (err) { console.warn('DaySheet nav failed', err) }
  }

  const toggleMood = (id) => run(() => app.saveLog(d, {
    moods: moods.includes(id) ? moods.filter((m) => m !== id) : [...moods, id],
  }))
  const toggleSymptom = (id) => run(() => app.saveLog(d, {
    symptomsDetailed: symptoms.includes(id) ? symptoms.filter((s) => s !== id) : [...symptoms, id],
  }))
  const setFlow = (id) => run(() => app.saveLog(d, { flow: log.flow === id ? null : id }))

  const chanceInfo = chance ? CHANCE[chance] : null

  return (
    <Sheet visible={visible} onClose={onClose} title={formatDate(d, 'dddd, MMM D', language)}>
      <View style={styles.subRow}>
        <AppText variant="caption" muted style={{ flex: 1 }} numberOfLines={2}>
          {[info?.cycleDay ? t('cal_cycle_day_n', { n: info.cycleDay }) : null, status.text].filter(Boolean).join(' · ')}
        </AppText>
        {savedTick ? (
          <Animated.View key={savedTick} entering={RFadeIn.duration(160)} style={styles.saved}>
            <Icon name="check" size={14} color={colors.success} />
            <AppText variant="small" color={colors.success}>{t('cal_saved')}</AppText>
          </Animated.View>
        ) : null}
      </View>

      {chanceInfo ? (
        <View style={[styles.infoBox, { backgroundColor: colors.surfaceAlt }]}>
          <IconBadge name="heart" tone={chanceInfo.score >= 3 ? 'fertile' : 'primary'} size={30} />
          <AppText variant="caption" style={{ flex: 1 }}>
            {t('cal_chance_title')}: <AppText variant="caption" style={{ fontWeight: '700' }} color={colors[chanceInfo.tone]}>{t(`cal_chance_${chance}`)}</AppText>
          </AppText>
        </View>
      ) : null}

      {isFuture ? (
        <View style={[styles.infoBox, { backgroundColor: colors.surfaceAlt }]}>
          <IconBadge name="clock" tone="info" size={30} />
          <AppText variant="caption" muted style={{ flex: 1 }}>{t('cal_future_note')}</AppText>
        </View>
      ) : (
        <>
          <View style={[styles.periodRow, { borderColor: colors.border }]}>
            <IconBadge name="drop" tone="period" size={32} />
            <AppText variant="body" style={{ flex: 1, fontWeight: '600' }}>{t('cal_period_day')}</AppText>
            <Toggle
              value={isPeriodDay}
              onChange={() => run(() => app.togglePeriodDay(d))}
              accessibilityLabel={t('cal_period_day')}
            />
          </View>

          <AppText variant="overline" muted style={styles.section}>{t('cal_flow')}</AppText>
          <View style={styles.wrap}>
            {FLOWS.map((f) => (
              <Chip key={f.id} label={t(f.labelKey)} icon="drop" tone="period" selected={log.flow === f.id} onPress={() => setFlow(f.id)} />
            ))}
          </View>

          <AppText variant="overline" muted style={styles.section}>{t('mood')}</AppText>
          <View style={styles.wrap}>
            {MOODS.map((m) => (
              <Chip key={m.id} label={t(m.labelKey)} selected={moods.includes(m.id)} onPress={() => toggleMood(m.id)} />
            ))}
          </View>

          <AppText variant="overline" muted style={styles.section}>{t('symptoms')}</AppText>
          <View style={styles.wrap}>
            {QUICK_SYMPTOMS.map((id) => (
              <Chip
                key={id}
                label={t(SYMPTOM_LABEL_KEYS[id] || `symptom_${id}`)}
                tone="info"
                selected={symptoms.includes(id)}
                onPress={() => toggleSymptom(id)}
              />
            ))}
            <Chip label={t('cal_more')} icon="plus" tone="info" onPress={() => go('SymptomPicker', { date: d })} />
          </View>

          <Button
            title={t('cal_open_full_log')}
            icon="track"
            variant="soft"
            size="md"
            style={{ marginTop: 18 }}
            onPress={() => go('Track', { date: d, view: 'log' })}
          />
        </>
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, minHeight: 22 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 10, marginBottom: 10 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  section: { marginTop: 14, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
