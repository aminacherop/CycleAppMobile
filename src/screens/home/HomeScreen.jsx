import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { View, StyleSheet, useWindowDimensions } from 'react-native'
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated'
import { useFocusEffect } from '@react-navigation/native'
import { useApp } from '../../context/AppDataContext'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import {
  AppText, Tap, Button, Card, IconBadge, IconButton, SectionTitle, Screen, FadeIn, Icon, DayCircle,
} from '../../components/ui'
import DaySheet from '../../components/DaySheet'
import { AdBanner } from '../../ads'
import { formatDate } from '../../utils/dates'
import { addDays, diffDays, getPregnancyProgress, isValidDateStr } from '../../utils/cycleEngine'
import { loadData } from '../../utils/storage'
import { successHaptic } from '../../utils/haptics'
import { MOODS, WATER_GOAL } from '../../constants/logOptions'
import CycleRing from './CycleRing'

// ── Week strip ────────────────────────────────────────────────────────
const WeekDay = memo(({ date, label, num, info, onPress, colors, size }) => {
  // Future period days are expectations, so they get the dashed style.
  const isPeriod = info?.isPeriod && !info?.isFuture
  const predicted = !isPeriod && (info?.isPredictedPeriod || (info?.isPeriod && info?.isFuture))
  const ovu = !isPeriod && info?.isOvulation
  const fertile = !isPeriod && !ovu && info?.isFertile
  const bg = isPeriod ? colors.period : ovu ? colors.ovulationSoft : fertile ? colors.fertileSoft : 'transparent'
  const fg = isPeriod ? '#FFFFFF' : ovu ? colors.ovulation : fertile ? colors.fertile : predicted ? colors.period : colors.text
  return (
    <Tap onPress={() => onPress(date)} scaleTo={0.9} style={styles.weekDay} accessibilityLabel={date}>
      <AppText variant="small" muted style={{ fontWeight: '600' }}>{label}</AppText>
      <View style={{ width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, borderWidth: 2, borderColor: info?.isToday ? colors.text : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <DayCircle size={size} fill={bg} stroke={predicted ? colors.period : null} dashed={predicted}>
          <AppText variant="bodyStrong" color={fg} maxFontSizeMultiplier={1.1}>{num}</AppText>
        </DayCircle>
      </View>
    </Tap>
  )
})

// ── Toast with Undo ───────────────────────────────────────────────────
const UndoToast = ({ toast, onUndo, colors, t }) => {
  if (!toast) return null
  return (
    <Animated.View entering={SlideInDown.springify().damping(18)} exiting={SlideOutDown.duration(180)} style={styles.toastWrap} pointerEvents="box-none">
      <View style={[styles.toast, { backgroundColor: colors.text }]}>
        <Icon name="check" size={18} color={colors.bg} />
        <AppText variant="caption" color={colors.bg} style={{ flex: 1, fontWeight: '600' }}>{toast.message}</AppText>
        {toast.undo ? (
          <Tap onPress={onUndo} hitSlop={10} accessibilityLabel={t('home_undo')}>
            <AppText variant="caption" color={colors.primarySoft2} style={{ fontWeight: '800' }}>{t('home_undo')}</AppText>
          </Tap>
        ) : null}
      </View>
    </Animated.View>
  )
}

export default function HomeScreen({ navigation }) {
  const app = useApp()
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const { width } = useWindowDimensions()
  const [sheetDate, setSheetDate] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [pregnancy, setPregnancy] = useState(null)
  const toastTimer = useRef(null)

  const today = app.today
  const cs = app.cycleState || {}
  // Last day of the period run containing today, counting logged future days.
  const runEnd = useMemo(() => {
    const set = new Set(app.periodDays || [])
    if (!set.has(today)) return null
    let d = today
    while (set.has(addDays(d, 1))) d = addDays(d, 1)
    return d
  }, [app.periodDays, today])
  const log = app.dailyLogs?.[today] || {}

  // Pregnancy mode lives in storage (set from Profile); refresh on focus.
  useFocusEffect(useCallback(() => {
    let alive = true
    ;(async () => {
      try {
        const [on, lmp, display] = await Promise.all([
          loadData('pregnancy_mode', false),
          loadData('gestation_start', null),
          loadData('pregnancy_homepage_display', 'since_pregnancy'),
        ])
        if (!alive) return
        const progress = on && isValidDateStr(lmp) ? getPregnancyProgress(lmp, today) : null
        setPregnancy(progress ? { ...progress, display: display === 'days_to_baby' ? 'days_to_baby' : 'since_pregnancy' } : null)
      } catch {
        if (alive) setPregnancy(null)
      }
    })()
    return () => { alive = false }
  }, [today]))

  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), [])

  const showToast = (message, undo) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, undo })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  // ── Derived ring numbers ──
  const ring = useMemo(() => {
    if (!cs.hasData || !cs.lastPeriodStart) return null
    const L = cs.cycleLength || 28
    const start = cs.lastPeriodStart
    const rel = (d) => (isValidDateStr(d) ? diffDays(start, d) + 1 : null)
    const periodEnd = cs.isOnPeriod ? (cs.expectedPeriodEnd || cs.currentPeriodEnd) : cs.lastPeriodEnd
    return {
      L,
      periodDays: Math.max(1, Math.min(L, rel(periodEnd) || cs.periodLength || 5)),
      fertileFrom: rel(cs.fertileStart),
      fertileTo: rel(cs.fertileEnd),
      ovulationDay: rel(cs.ovulationDate),
    }
  }, [cs])

  const week = useMemo(() => {
    const out = []
    for (let i = -3; i <= 3; i++) {
      const d = addDays(today, i)
      let info = null
      try { info = app.getDayInfo?.(d) } catch { info = null }
      out.push({ date: d, label: formatDate(d, 'dd', language), num: formatDate(d, 'D', language), info })
    }
    return out
  }, [today, app.getDayInfo, language])

  // ── Actions ──
  const run = async (fn) => {
    if (busy) return
    setBusy(true)
    try { await fn() } catch (err) { console.warn('Home action failed', err) } finally { setBusy(false) }
  }

  const logPeriodToday = () => run(async () => {
    // Undo removes exactly the days this tap added, so a nearby earlier
    // period that the new days merged into is left untouched.
    const before = new Set(app.periodDays || [])
    const after = await app.startPeriod(today)
    const added = (Array.isArray(after) ? after : []).filter((d) => !before.has(d))
    successHaptic()
    showToast(t('home_period_logged'), added.length ? async () => {
      for (const d of added) {
        try { await app.togglePeriodDay(d) } catch {}
      }
    } : null)
  })

  const endPeriodToday = () => run(async () => {
    const start = cs.lastPeriodStart
    const prevEnd = runEnd || cs.expectedPeriodEnd
    await app.endPeriod(today)
    successHaptic()
    showToast(t('home_period_end_saved'), start && prevEnd ? async () => {
      try { await app.setPeriodRange(start, prevEnd) } catch {}
    } : null)
  })

  const undo = async () => {
    const fn = toast?.undo
    setToast(null)
    if (fn) await fn()
  }

  const openLog = (extra) => navigation.navigate('TrackTab', { screen: 'Track', params: { date: today, view: 'log', ...extra } })
  const openSymptoms = () => navigation.navigate('TrackTab', { screen: 'SymptomPicker', params: { date: today } })

  // ── Hero content ──
  const ringSize = Math.min(width - 32, 360) * 0.8
  const name = String(app.userProfile?.name ?? '').trim()

  const phaseKey = cs.isStale ? null : cs.isLate ? 'late' : cs.isOnPeriod ? 'period' : (cs.phase && cs.phase !== 'unknown' ? cs.phase : null)

  const renderCenter = () => {
    if (cs.isLate) {
      return (
        <>
          <AppText variant="caption" muted center style={{ fontWeight: '700' }}>{t('home_period_late')}</AppText>
          <AppText variant="display" center color={colors.period} style={{ fontSize: Math.round(ringSize * 0.15) }} numberOfLines={1} adjustsFontSizeToFit>
            {cs.daysLate === 1 ? t('home_late_one') : t('home_late_by', { n: cs.daysLate })}
          </AppText>
          <AppText variant="small" muted center>{t('home_expected', { date: formatDate(cs.nextPeriodStart, 'MMM D', language) })}</AppText>
        </>
      )
    }
    if (cs.isOnPeriod) {
      return (
        <>
          <AppText variant="caption" muted center style={{ fontWeight: '700' }}>{t('home_on_period')}</AppText>
          <AppText variant="display" center color={colors.period} style={{ fontSize: Math.round(ringSize * 0.17) }} numberOfLines={1} adjustsFontSizeToFit>
            {t('home_period_day', { n: cs.cycleDay })}
          </AppText>
          {cs.expectedPeriodEnd ? (
            <AppText variant="small" muted center>{t('home_ends_around', { date: formatDate(cs.expectedPeriodEnd, 'MMM D', language) })}</AppText>
          ) : null}
        </>
      )
    }
    const n = cs.daysUntilNextPeriod
    const fertileChip = (() => {
      if (cs.phase === 'ovulation') return { icon: 'egg', tone: 'ovulation', text: t('home_ovulation_today') }
      if (cs.phase === 'fertile') return { icon: 'leaf', tone: 'fertile', text: t('home_fertile_now') }
      if (cs.fertileStart && cs.fertileStart > today) return { icon: 'leaf', tone: 'fertile', text: t('home_fertile_from', { date: formatDate(cs.fertileStart, 'MMM D', language) }) }
      return null
    })()
    return (
      <>
        <AppText variant="caption" muted center style={{ fontWeight: '700' }}>
          {n === 0 ? t('home_period_today') : t('home_period_in')}
        </AppText>
        {n > 0 ? (
          <AppText variant="display" center style={{ fontSize: Math.round(ringSize * 0.19), letterSpacing: -1.5 }} numberOfLines={1} adjustsFontSizeToFit>
            {n === 1 ? t('home_one_day') : t('home_n_days', { n })}
          </AppText>
        ) : null}
        <AppText variant="small" muted center>{formatDate(cs.nextPeriodStart, 'ddd, MMM D', language)}</AppText>
        {fertileChip ? (
          <View style={[styles.miniChip, { backgroundColor: colors[`${fertileChip.tone}Soft`] }]}>
            <Icon name={fertileChip.icon} size={12} color={colors[fertileChip.tone]} />
            <AppText variant="small" color={colors[fertileChip.tone]} style={{ fontWeight: '700' }} numberOfLines={1}>{fertileChip.text}</AppText>
          </View>
        ) : null}
      </>
    )
  }

  // ── Today's quick log summary ──
  const moodLabel = Array.isArray(log.moods) && log.moods.length
    ? log.moods.map((id) => { const m = MOODS.find((x) => x.id === id); return m ? t(m.labelKey) : null }).filter(Boolean).slice(0, 2).join(', ')
    : null
  const symptomCount = Array.isArray(log.symptomsDetailed) ? log.symptomsDetailed.length : 0
  const water = Number.isFinite(Number(log.water)) ? Number(log.water) : 0
  const tiles = [
    { key: 'mood', icon: 'smile', tone: 'primary', title: t('home_mood'), value: moodLabel, onPress: () => openLog() },
    { key: 'sym', icon: 'bolt', tone: 'ovulation', title: t('home_symptoms'), value: symptomCount ? t('home_n_logged', { n: symptomCount }) : null, onPress: openSymptoms },
    { key: 'water', icon: 'water', tone: 'info', title: t('home_water'), value: water ? `${water}/${WATER_GOAL}` : null, onPress: () => openLog() },
    { key: 'notes', icon: 'note', tone: 'warning', title: t('home_notes'), value: log.notes ? '✓' : null, onPress: () => openLog() },
  ]

  const upcoming = []
  if (cs.hasData && !cs.isLate && !cs.isOnPeriod && cs.nextPeriodStart) {
    upcoming.push({ icon: 'drop', tone: 'period', title: t('home_next_period'), value: formatDate(cs.nextPeriodStart, 'ddd, MMM D', language) })
  }
  if (cs.hasData && !cs.isLate && cs.fertileStart && cs.fertileEnd && cs.fertileEnd >= today) {
    upcoming.push({ icon: 'leaf', tone: 'fertile', title: t('home_fertile_window'), value: `${formatDate(cs.fertileStart, 'MMM D', language)} – ${formatDate(cs.fertileEnd, 'MMM D', language)}` })
  }
  if (cs.hasData && !cs.isLate && cs.ovulationDate && cs.ovulationDate >= today) {
    upcoming.push({ icon: 'egg', tone: 'ovulation', title: t('home_ovulation'), value: formatDate(cs.ovulationDate, 'ddd, MMM D', language) })
  }

  const dayCircle = Math.max(24, Math.min(40, Math.floor((Math.min(width, 640) - 32) / 7) - 8))

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        {/* Header */}
        <FadeIn index={0} style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="small" muted style={{ fontWeight: '600' }}>{formatDate(today, 'dddd, MMM D', language)}</AppText>
            <AppText variant="title" numberOfLines={1}>{name ? t('home_hi', { name }) : t('home_hi_anon')}</AppText>
          </View>
          <IconButton name="calendar" onPress={() => navigation.navigate('CalendarTab')} accessibilityLabel={t('nav_calendar')} />
        </FadeIn>

        {/* Week strip */}
        {!pregnancy ? (
          <FadeIn index={1} style={styles.week}>
            {week.map((d) => (
              <WeekDay key={d.date} {...d} onPress={setSheetDate} colors={colors} size={dayCircle} />
            ))}
          </FadeIn>
        ) : null}

        {/* Hero */}
        <FadeIn index={2} style={{ alignItems: 'center', marginTop: 22 }}>
          {pregnancy ? (
            <Card style={{ width: '100%', alignItems: 'center', paddingVertical: 24 }}>
              <IconBadge name="baby" tone="ovulation" size={56} />
              <AppText variant="overline" muted style={{ marginTop: 12 }}>{t('home_pregnant')}</AppText>
              <AppText variant="display" center style={{ marginTop: 4 }}>
                {pregnancy.display === 'days_to_baby'
                  ? t('home_preg_days_left', { n: pregnancy.daysRemaining ?? 0 })
                  : t('home_preg_weeks', { w: pregnancy.weeks, d: pregnancy.days })}
              </AppText>
              <AppText variant="caption" muted center style={{ marginTop: 4 }}>
                {t('home_preg_trimester', { n: pregnancy.trimester })} · {t('home_preg_due', { date: formatDate(pregnancy.dueDate, 'MMM D, YYYY', language) })}
              </AppText>
              <View style={[styles.progressTrack, { backgroundColor: colors.track }]}>
                <View style={[styles.progressFill, { width: `${Math.round(Math.max(0, Math.min(1, pregnancy.progress || 0)) * 100)}%`, backgroundColor: colors.ovulation }]} />
              </View>
              <Button title={t('home_preg_open')} variant="soft" size="md" style={{ marginTop: 16, alignSelf: 'stretch' }}
                onPress={() => navigation.navigate('ProfileTab', { screen: 'Pregnancy', initial: false })} />
            </Card>
          ) : cs.isStale ? (
            <Card style={{ width: '100%', alignItems: 'center', paddingVertical: 28 }}>
              <IconBadge name="calendar" tone="primary" size={56} />
              <AppText variant="heading" center style={{ marginTop: 12 }}>{t('home_stale_title')}</AppText>
              <AppText variant="caption" muted center style={{ marginTop: 4, maxWidth: 300 }}>{t('home_stale_body')}</AppText>
              <Button title={t('home_stale_action')} icon="edit" variant="soft" size="md" style={{ marginTop: 16, alignSelf: 'stretch' }}
                onPress={() => navigation.navigate('CalendarTab', { screen: 'EditPeriod', initial: false })} />
            </Card>
          ) : ring ? (
            <Tap onPress={() => setSheetDate(today)} scaleTo={0.98} accessibilityLabel={t('home_today')}>
              <CycleRing
                size={ringSize}
                cycleLength={ring.L}
                cycleDay={cs.cycleDay}
                periodDays={ring.periodDays}
                fertileFrom={ring.fertileFrom}
                fertileTo={ring.fertileTo}
                ovulationDay={ring.ovulationDay}
                late={cs.isLate}
              >
                {renderCenter()}
              </CycleRing>
            </Tap>
          ) : (
            <Card style={{ width: '100%', alignItems: 'center', paddingVertical: 28 }}>
              <IconBadge name="drop" tone="period" size={56} />
              <AppText variant="heading" center style={{ marginTop: 12 }}>{t('home_no_data_title')}</AppText>
              <AppText variant="caption" muted center style={{ marginTop: 4, maxWidth: 280 }}>{t('home_no_data_body')}</AppText>
            </Card>
          )}
        </FadeIn>

        {/* Primary action */}
        {!pregnancy ? (
          <FadeIn index={3} style={{ marginTop: 18, gap: 8 }}>
            {cs.isLate && !cs.isStale ? (
              <AppText variant="caption" muted center style={{ marginBottom: 4, paddingHorizontal: 12 }}>{t('home_late_hint')}</AppText>
            ) : null}
            {cs.isOnPeriod && runEnd === today ? (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <IconBadge name="check" tone="period" size={34} />
                <AppText variant="caption" muted style={{ flex: 1 }}>{t('home_period_ends_today')}</AppText>
              </Card>
            ) : cs.isOnPeriod ? (
              <Button title={t('home_period_ended')} icon="check" onPress={endPeriodToday} loading={busy} />
            ) : (
              <Button title={t('home_log_period')} icon="drop" onPress={logPeriodToday} loading={busy} />
            )}
            {cs.hasData ? (
              <Button title={t('home_edit_dates')} variant="ghost" size="sm" icon="edit"
                onPress={() => navigation.navigate('CalendarTab', { screen: 'EditPeriod', initial: false })} />
            ) : null}
          </FadeIn>
        ) : null}

        {/* Today */}
        <FadeIn index={4}>
          <SectionTitle>{cs.hasData && cs.cycleDay ? t('home_today_day', { n: cs.cycleDay }) : t('home_today')}</SectionTitle>
          <View style={styles.tiles}>
            {tiles.map((tile) => (
              <Card key={tile.key} onPress={tile.onPress} style={styles.tile} accessibilityLabel={tile.title}>
                <IconBadge name={tile.icon} tone={tile.tone} size={38} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="caption" style={{ fontWeight: '700' }} numberOfLines={1}>{tile.title}</AppText>
                  <AppText variant="small" muted numberOfLines={1} style={{ fontWeight: '500' }}>
                    {tile.value || t('home_add')}
                  </AppText>
                </View>
              </Card>
            ))}
          </View>
        </FadeIn>

        {/* Tip */}
        {phaseKey && !pregnancy ? (
          <FadeIn index={5}>
            <SectionTitle>{t('home_for_you')}</SectionTitle>
            <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <IconBadge name="sparkle" tone={phaseKey === 'late' ? 'period' : phaseKey === 'luteal' ? 'warning' : phaseKey === 'follicular' ? 'primary' : phaseKey} size={36} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{t(`phase_name_${phaseKey}`)}</AppText>
                <AppText variant="caption" muted style={{ marginTop: 2 }}>{t(`home_tip_${phaseKey}`)}</AppText>
              </View>
            </Card>
          </FadeIn>
        ) : null}

        {/* Coming up */}
        {upcoming.length && !pregnancy ? (
          <FadeIn index={6}>
            <SectionTitle>{t('home_coming_up')}</SectionTitle>
            <Card padded={false}>
              {upcoming.map((u, i) => (
                <View key={u.title} style={[styles.upRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <IconBadge name={u.icon} tone={u.tone} size={32} />
                  <AppText variant="body" style={{ flex: 1, minWidth: 0, fontWeight: '600' }} numberOfLines={2}>{u.title}</AppText>
                  <AppText variant="caption" muted numberOfLines={2} style={{ maxWidth: '48%', textAlign: 'right' }}>{u.value}</AppText>
                </View>
              ))}
            </Card>
          </FadeIn>
        ) : null}

        {/* Learn */}
        <FadeIn index={7}>
          <Card onPress={() => navigation.navigate('Articles')} style={[styles.learn, { marginTop: 20 }]} accessibilityLabel={t('home_learn')}>
            <IconBadge name="book" tone="info" size={40} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t('home_learn')}</AppText>
              <AppText variant="small" muted style={{ fontWeight: '500', marginTop: 2 }}>{t('home_learn_body')}</AppText>
            </View>
            <Icon name="chevron-right" size={18} color={colors.textFaint} />
          </Card>
        </FadeIn>

        <AdBanner />
      </Screen>

      <UndoToast toast={toast} onUndo={undo} colors={colors} t={t} />
      <DaySheet date={sheetDate} visible={!!sheetDate} onClose={() => setSheetDate(null)} navigation={navigation} />
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10 },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  weekDay: { alignItems: 'center', gap: 6, flex: 1 },
  weekNum: { alignItems: 'center', justifyContent: 'center' },
  miniChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, maxWidth: '100%' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '46%', minWidth: 140, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  upRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  learn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressTrack: { height: 8, borderRadius: 4, alignSelf: 'stretch', marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  toastWrap: { position: 'absolute', left: 16, right: 16, bottom: 72, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, width: '100%', maxWidth: 520, elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
})
