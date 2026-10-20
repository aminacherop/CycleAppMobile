import { useCallback, useMemo, useState } from 'react'
import { View, StyleSheet, useWindowDimensions } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import {
  Screen, AppText, Card, FadeIn, IconBadge, IconButton, ListGroup, ListRow, WheelPicker, Tap, Icon,
} from '../../components/ui'
import { normalizeSettings, MIN_VALID_CYCLE, MAX_VALID_CYCLE, DEFAULT_LUTEAL_LENGTH } from '../../utils/cycleEngine'
import { nDays, BackHeader, useSavedFlash } from './shared'

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const CYCLE_VALUES = range(MIN_VALID_CYCLE, MAX_VALID_CYCLE)
const PERIOD_VALUES = range(1, 15)
const LUTEAL_MIN = 9
const LUTEAL_MAX = 18

export default function CycleSettingsScreen({ navigation }) {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const app = useApp()
  const { width } = useWindowDimensions()
  const [saved, flash] = useSavedFlash()
  const [advanced, setAdvanced] = useState(false)

  const s = normalizeSettings(app.cycleSettings)
  const avg = app.cycleState?.averages || {}
  const learned = avg.learnedCycleLength != null
  const learnedPeriod = avg.learnedPeriodLength != null
  // Values in use everywhere (manual, learned or default).
  const cycleValue = avg.cycleLength || s.cycleLength
  const periodValue = avg.periodLength || s.periodLength

  const save = useCallback(async (partial) => {
    try {
      await app.updateCycleSettings(partial)
      flash()
    } catch (e) {
      console.warn('Cycle settings save failed', e)
    }
  }, [app.updateCycleSettings, flash])

  // Moving a wheel pins that value (manual); "Use automatic" hands it back to learning.
  const onCycle = useCallback((v) => {
    if (v !== cycleValue) save({ cycleLengthManual: v })
  }, [cycleValue, save])
  const onPeriod = useCallback((v) => {
    if (v !== periodValue) save({ periodLengthManual: v })
  }, [periodValue, save])
  const fmt = useCallback((v) => String(v), [])

  const luteal = s.lutealLength || DEFAULT_LUTEAL_LENGTH
  const setLuteal = (v) => {
    const n = Math.max(LUTEAL_MIN, Math.min(LUTEAL_MAX, v))
    if (n !== luteal) save({ lutealLength: n })
  }

  const narrow = width < 360
  const wheels = useMemo(() => ([
    {
      key: 'c', label: t('cycle_length'), values: CYCLE_VALUES, value: cycleValue, onChange: onCycle,
      manual: s.cycleLengthManual != null, onAuto: () => save({ cycleLengthManual: null }),
    },
    {
      key: 'p', label: t('period_length'), values: PERIOD_VALUES, value: periodValue, onChange: onPeriod,
      manual: s.periodLengthManual != null, onAuto: () => save({ periodLengthManual: null }),
    },
  ]), [t, cycleValue, periodValue, s.cycleLengthManual, s.periodLengthManual, onCycle, onPeriod, save])

  return (
    <Screen header={<BackHeader navigation={navigation} title={t('pf_cycle_period')} saved={saved} />}>
      <FadeIn index={0}>
        <Card style={{ marginTop: 4 }}>
          <View style={styles.row}>
            <IconBadge name={learned ? 'sparkle' : 'info'} tone={learned ? 'success' : 'info'} />
            <View style={{ flex: 1 }}>
              <AppText variant="subheading">{learned ? t('pf_learned_title') : t('pf_defaults_title')}</AppText>
              <AppText variant="caption" muted style={{ marginTop: 2 }}>{t('pf_auto_explain')}</AppText>
            </View>
          </View>
          {learned || learnedPeriod ? (
            <View style={[styles.stats, { borderTopColor: colors.border }]}>
              <Stat label={t('pf_avg_cycle')} value={nDays(t, avg.learnedCycleLength)} show={learned} />
              <Stat label={t('pf_avg_period')} value={nDays(t, avg.learnedPeriodLength)} show={learnedPeriod} />
              <Stat label={t('pf_cycles_logged')} value={String(avg.cyclesUsed || 0)} show />
            </View>
          ) : null}
        </Card>
      </FadeIn>

      <FadeIn index={1}>
        <AppText variant="overline" muted style={{ marginTop: 22, marginBottom: 8, marginHorizontal: 2 }}>{t('pf_your_defaults')}</AppText>
        <View style={[styles.wheels, narrow && { flexDirection: 'column' }]}>
          {wheels.map(w => (
            <Card key={w.key} style={[styles.wheelCard, !narrow && { flex: 1 }]} padded={false}>
              <AppText variant="caption" muted center style={{ fontWeight: '700', marginTop: 12 }}>{w.label}</AppText>
              <WheelPicker
                values={w.values}
                value={w.value}
                onChange={w.onChange}
                format={fmt}
                accessibilityLabel={w.label}
              />
              <AppText variant="small" muted center>{t('days')}</AppText>
              <ModeFooter manual={w.manual} onAuto={w.onAuto} t={t} />
            </Card>
          ))}
        </View>
      </FadeIn>

      <FadeIn index={2}>
        <ListGroup footer={advanced ? t('pf_luteal_hint') : null}>
          <ListRow
            icon="gear" tone="ovulation"
            title={t('pf_advanced')}
            onPress={() => setAdvanced(a => !a)}
            chevron={false}
            right={<Icon name="chevron-down" size={18} color={colors.textFaint} style={advanced ? { transform: [{ rotate: '180deg' }] } : null} />}
          />
          {advanced ? (
            <ListRow
              icon="egg" tone="ovulation"
              title={t('luteal_phase_length')}
              subtitle={nDays(t, luteal)}
              right={(
                <View style={styles.stepper}>
                  <IconButton name="minus" size={38} onPress={() => setLuteal(luteal - 1)} accessibilityLabel={t('pf_decrease')} />
                  <AppText variant="bodyStrong" style={{ minWidth: 26, textAlign: 'center' }}>{luteal}</AppText>
                  <IconButton name="plus" size={38} onPress={() => setLuteal(luteal + 1)} accessibilityLabel={t('pf_increase')} />
                </View>
              )}
            />
          ) : null}
        </ListGroup>
      </FadeIn>
    </Screen>
  )
}

// Under each wheel: "Automatic" badge, or a link back to automatic when pinned.
const ModeFooter = ({ manual, onAuto, t }) => {
  const { colors } = useTheme()
  if (manual) {
    return (
      <Tap onPress={onAuto} haptic hitSlop={6} style={styles.modeRow} accessibilityRole="button" accessibilityLabel={t('pf_use_auto')}>
        <Icon name="refresh" size={14} color={colors.primary} />
        <AppText variant="small" color={colors.primary} style={{ fontWeight: '700' }} numberOfLines={1}>{t('pf_use_auto')}</AppText>
      </Tap>
    )
  }
  return (
    <View style={styles.modeRow}>
      <View style={[styles.autoPill, { backgroundColor: colors.successSoft }]}>
        <Icon name="sparkle" size={12} color={colors.success} />
        <AppText variant="small" color={colors.success} style={{ fontWeight: '700' }} numberOfLines={1}>{t('pf_auto')}</AppText>
      </View>
    </View>
  )
}

const Stat = ({ label, value, show }) => {
  if (!show) return null
  return (
    <View style={{ flex: 1, minWidth: 80 }}>
      <AppText variant="heading">{value}</AppText>
      <AppText variant="small" muted style={{ fontWeight: '500' }}>{label}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  wheels: { flexDirection: 'row', gap: 12 },
  wheelCard: { overflow: 'hidden' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 44, marginBottom: 4 },
  autoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
})
