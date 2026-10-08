import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Alert, StyleSheet } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import {
  AppText, Button, Card, EmptyState, FadeIn, Icon, IconBadge, ListGroup, ListRow, SectionTitle, Tap,
} from '../../components/ui'
import { AdBanner } from '../../ads'
import { RADIUS } from '../../theme/palette'
import { formatDate, daysBetween } from '../../utils/dates'
import { getSymptomCorrelations } from '../../utils/insightEngine'
import { generateAndShareReport } from '../../utils/healthReport'
import { SYMPTOM_CATEGORIES } from '../../utils/symptomCategories'
import { AnimatedBar, CycleBar, SectionHead } from './parts'
import { humanize, periodsNeededForRegularity, tp } from './trackUtils'

const ITEM_BY_ID = Object.fromEntries(SYMPTOM_CATEGORIES.flatMap((c) => c.items).map((i) => [i.id, i]))
const PHASE_KEY = { Menstrual: 'phase_menstrual', Follicular: 'phase_follicular', Ovulation: 'phase_ovulation', Luteal: 'phase_luteal' }
const KEEP_CASE = new Set(['de'])

export const symptomLabel = (id, t) => {
  const item = ITEM_BY_ID[id]
  if (item) return t(item.labelKey)
  const key = `symptom_${id}`
  const s = t(key)
  return s !== key ? s : humanize(id)
}

const regularityInfo = (score) => {
  if (score >= 80) return { key: 'reg_very_regular', tone: 'success' }
  if (score >= 60) return { key: 'reg_mostly_regular', tone: 'fertile' }
  if (score >= 40) return { key: 'reg_somewhat_irregular', tone: 'warning' }
  return { key: 'reg_irregular', tone: 'danger' }
}

// ── Stat card ───────────────────────────────────────────────────────────
const StatCard = memo(({ icon, tone, label, value, foot }) => {
  const { colors } = useTheme()
  return (
    <Card style={{ flex: 1, padding: 14 }}>
      <IconBadge name={icon} tone={tone} size={30} />
      <AppText variant="caption" muted style={{ marginTop: 10 }} numberOfLines={1}>{label}</AppText>
      <AppText variant="title" color={colors[tone]} style={{ marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
      <AppText variant="small" faint style={{ marginTop: 4, fontWeight: '500' }} numberOfLines={2}>{foot}</AppText>
    </Card>
  )
})

// ── Cycle row (shared with CycleHistoryScreen) ──────────────────────────
export const CycleRow = memo(({ cycle, maxLength, language, t }) => {
  const start = formatDate(cycle.start, 'MMM D', language)
  const end = formatDate(cycle.nextStart ? daysBeforeISO(cycle.nextStart) : cycle.end, 'MMM D, YYYY', language)
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.rowBetween}>
        <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{`${start} – ${end}`}</AppText>
        <AppText variant="bodyStrong">{tp(t, 'trk_days', cycle.cycleLength)}</AppText>
      </View>
      <CycleBar cycleLength={cycle.cycleLength} periodLength={cycle.periodLength} maxLength={maxLength} />
      <AppText variant="small" muted style={{ fontWeight: '500' }}>
        {t('trk_period_len', { days: tp(t, 'trk_days', cycle.periodLength) })}
      </AppText>
    </View>
  )
})

// Day before a 'YYYY-MM-DD' (last day of a cycle = day before next start).
const daysBeforeISO = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) - 1))
  return dt.toISOString().slice(0, 10)
}

const InsightsView = ({ navigation, onLogPeriod }) => {
  const app = useApp()
  const { t, language } = useLanguage()
  const { colors } = useTheme()
  const { cycleState, cycleHistory, upcomingCycles, today, dailyLogs, cycleSettings, periodDays } = app
  const averages = cycleState?.averages || {}

  // ── Averages
  const cycleFoot = averages.source === 'learned'
    ? tp(t, 'trk_based_cycles', averages.cyclesUsed || 0)
    : t('trk_based_settings')
  const periodFoot = averages.periodLengthSource === 'learned' ? t('trk_based_periods') : t('trk_based_settings')

  // ── Regularity
  const completed = Array.isArray(cycleHistory?.completed) ? cycleHistory.completed : []
  const periodCount = completed.length + (cycleHistory?.current ? 1 : 0)
  const reg = typeof averages.regularity === 'number' ? averages.regularity : null
  const regInfo = reg != null ? regularityInfo(reg) : null

  // ── Next period / ovulation
  const nextOvulation = useMemo(() => {
    const list = [cycleState?.ovulationDate, ...(upcomingCycles || []).map((u) => u?.ovulationDate)]
    return list.find((d) => typeof d === 'string' && d >= today) || null
  }, [cycleState, upcomingCycles, today])

  // ── History preview (newest first)
  const recent = useMemo(() => completed.slice(-3).reverse(), [completed])
  const maxLen = useMemo(() => Math.max(1, ...recent.map((c) => c.cycleLength || 0)), [recent])

  // ── Patterns
  const patterns = useMemo(() => {
    try {
      return (getSymptomCorrelations(dailyLogs, cycleSettings, periodDays) || []).slice(0, 3)
    } catch (e) {
      console.warn('Track: correlations failed', e)
      return []
    }
  }, [dailyLogs, cycleSettings, periodDays])
  const lower = (s) => (KEEP_CASE.has(language) ? s : String(s).toLocaleLowerCase())

  // ── Report
  const [busy, setBusy] = useState(false)
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])
  const onShare = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await generateAndShareReport({
        userProfile: app.userProfile,
        cycleSettings: app.cycleSettings,
        dailyLogs: app.dailyLogs,
        installDate: app.installDate,
        periodDays: app.periodDays,
      })
      if (!res?.success) Alert.alert(t('error'), t('trk_report_failed'))
    } catch (e) {
      console.warn('Track: report failed', e)
      Alert.alert(t('error'), t('trk_report_failed'))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }, [busy, app.userProfile, app.cycleSettings, app.dailyLogs, app.installDate, app.periodDays, t])

  const daysLabel = (n) => tp(t, 'trk_days', n)

  return (
    <View>
      {/* Averages */}
      <FadeIn index={0} style={styles.statRow}>
        <StatCard icon="refresh" tone="primary" label={t('average_cycle')} value={daysLabel(averages.cycleLength || 28)} foot={cycleFoot} />
        <StatCard icon="drop" tone="period" label={t('average_period')} value={daysLabel(averages.periodLength || 5)} foot={periodFoot} />
      </FadeIn>

      {/* Regularity */}
      <FadeIn index={1}>
        <Card style={{ marginTop: 12 }}>
          <SectionHead
            icon="chart"
            tone={regInfo?.tone || 'primary'}
            title={t('cycle_regularity')}
            right={reg != null ? <AppText variant="heading" color={colors[regInfo.tone]}>{`${reg}%`}</AppText> : null}
          />
          {reg != null ? (
            <>
              <AnimatedBar pct={reg} color={colors[regInfo.tone]} />
              <AppText variant="bodyStrong" color={colors[regInfo.tone]} style={{ marginTop: 10 }}>{t(regInfo.key)}</AppText>
              {averages.minCycleLength != null ? (
                <AppText variant="caption" muted style={{ marginTop: 2 }}>
                  {t('trk_range', { min: averages.minCycleLength, max: averages.maxCycleLength })}
                </AppText>
              ) : null}
            </>
          ) : (
            <AppText variant="caption" muted>{tp(t, 'trk_regularity_need', periodsNeededForRegularity(periodCount))}</AppText>
          )}
        </Card>
      </FadeIn>

      {/* Next period / ovulation */}
      <FadeIn index={2}>
        <Card style={{ marginTop: 12 }}>
          {cycleState?.hasData ? (
            <View style={{ gap: 14 }}>
              <View style={styles.predRow}>
                <IconBadge name="drop" tone="period" size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="caption" muted>{t('next_period')}</AppText>
                  <AppText variant="subheading" numberOfLines={1}>
                    {formatDate(cycleState.nextPeriodStart, 'ddd, MMM D', language)}
                  </AppText>
                </View>
                <View style={[styles.pill, { backgroundColor: cycleState.isLate ? colors.dangerSoft : colors.periodSoft }]}>
                  <AppText variant="small" color={cycleState.isLate ? colors.danger : colors.period}>
                    {cycleState.isLate
                      ? tp(t, 'trk_late', cycleState.daysLate)
                      : cycleState.daysUntilNextPeriod === 0
                        ? t('trk_expected_today')
                        : tp(t, 'trk_in_days', cycleState.daysUntilNextPeriod)}
                  </AppText>
                </View>
              </View>
              {nextOvulation && !cycleState.isLate ? (
                <View style={styles.predRow}>
                  <IconBadge name="egg" tone="ovulation" size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="caption" muted>{t('trk_ovulation_est')}</AppText>
                    <AppText variant="subheading" numberOfLines={1}>{formatDate(nextOvulation, 'ddd, MMM D', language)}</AppText>
                  </View>
                  <View style={[styles.pill, { backgroundColor: colors.ovulationSoft }]}>
                    <AppText variant="small" color={colors.ovulation}>
                      {nextOvulation === today ? t('today') : tp(t, 'trk_in_days', daysBetween(today, nextOvulation))}
                    </AppText>
                  </View>
                </View>
              ) : null}
              {cycleState.isLate ? (
                <AppText variant="caption" muted>{t('trk_late_note')}</AppText>
              ) : null}
            </View>
          ) : (
            <EmptyState
              icon="drop"
              tone="period"
              title={t('trk_no_data_title')}
              body={t('trk_no_data_body')}
              actionLabel={t('trk_log_period')}
              onAction={onLogPeriod}
            />
          )}
        </Card>
      </FadeIn>

      {/* Cycle history preview */}
      <FadeIn index={3}>
        <SectionTitle
          right={completed.length ? (
            <Tap onPress={() => navigation?.navigate?.('CycleHistory')} hitSlop={10} accessibilityLabel={t('trk_see_all')} style={styles.seeAll}>
              <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>{t('trk_see_all')}</AppText>
              <Icon name="chevron-right" size={14} color={colors.primary} />
            </Tap>
          ) : null}
        >
          {t('trk_cycle_history')}
        </SectionTitle>
        <Card>
          {recent.length ? (
            <View style={{ gap: 18 }}>
              {recent.map((c) => <CycleRow key={c.start} cycle={c} maxLength={maxLen} language={language} t={t} />)}
              <View style={styles.legend}>
                <View style={[styles.legendDot, { backgroundColor: colors.period }]} />
                <AppText variant="small" muted>{t('period')}</AppText>
                <View style={[styles.legendDot, { backgroundColor: colors.primarySoft2, marginLeft: 12 }]} />
                <AppText variant="small" muted>{t('trk_rest_of_cycle')}</AppText>
              </View>
            </View>
          ) : (
            <EmptyState icon="history" title={t('trk_history_empty_title')} body={t('trk_history_empty_body')} />
          )}
        </Card>
      </FadeIn>

      {/* Patterns */}
      <FadeIn index={4}>
        <SectionTitle>{t('trk_patterns')}</SectionTitle>
        <Card>
          {patterns.length ? (
            <View style={{ gap: 12 }}>
              {patterns.map((p, i) => (
                <View key={`${p.symptom}-${p.phase}-${i}`} style={styles.patternRow}>
                  <IconBadge name="sparkle" tone="ovulation" size={30} />
                  <AppText variant="body" style={{ flex: 1 }}>
                    {t('trk_pattern', {
                      symptom: lower(symptomLabel(p.symptom, t)),
                      phase: lower(t(PHASE_KEY[p.phase] || 'phase_luteal')),
                      pct: p.frequency,
                    })}
                  </AppText>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState icon="sparkle" tone="ovulation" title={t('trk_patterns_empty_title')} body={t('symptom_correlation_empty')} />
          )}
        </Card>
      </FadeIn>

      {/* Learn + report */}
      <FadeIn index={5}>
        <ListGroup>
          <ListRow icon="book" tone="fertile" title={t('trk_learn')} subtitle={t('trk_learn_sub')} onPress={() => navigation?.navigate?.('Articles')} />
        </ListGroup>
        <Card style={{ marginTop: 12 }}>
          <SectionHead icon="doc" tone="info" title={t('trk_share_report')} subtitle={t('trk_share_report_sub')} />
          <Button title={t('trk_share_report_btn')} icon="share" variant="primary" size="md" loading={busy} onPress={onShare} />
        </Card>
      </FadeIn>

      <View style={{ marginTop: 16 }}>
        <AdBanner />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  predRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill, maxWidth: '45%' },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32, paddingLeft: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  patternRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
})

export default memo(InsightsView)
