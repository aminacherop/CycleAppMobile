import { useCallback, useMemo, useRef, useState } from 'react'
import { View, StyleSheet, PanResponder, useWindowDimensions } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring } from 'react-native-reanimated'
import dayjs from 'dayjs'
import {
  Screen, ScreenHeader, AppText, Button, Card, IconButton, IconBadge, Icon, Tap, ListGroup, ListRow, EmptyState, FadeIn,
} from '../../components/ui'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import { formatDate, weekdayInitials } from '../../utils/dates'
import { tapHaptic } from '../../utils/haptics'
import DaySheet from '../../components/DaySheet'
import { AdBanner } from '../../ads'
import { MonthGrid, WeekdayRow, Legend } from './MonthGrid'
import { dayStatus, CHANCE, logSummary, hasLogContent } from './dayStatus'

const MIN_OFFSET = -24
const MAX_OFFSET = 12
const clamp = (n) => Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, n))

export default function CalendarScreen({ navigation }) {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const app = useApp()
  const { today, cycleState, getMonthGrid, getDayInfo, getConceptionChance, dailyLogs, periodDays } = app
  const { width } = useWindowDimensions()

  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState(today)
  const [sheetDate, setSheetDate] = useState(null)

  // ── sizes (Screen gutter 16/28, max width 640) ──
  const gutter = width >= 600 ? 28 : 16
  const gridW = Math.min(width, 640) - gutter * 2 - 4 // card border
  const cellW = Math.floor(gridW / 7)
  const circle = Math.max(28, Math.min(cellW - 10, 42))

  // ── month data ──
  const monthStart = useMemo(() => dayjs(today).startOf('month').add(offset, 'month'), [today, offset])
  const year = monthStart.year()
  const month = monthStart.month() + 1
  const grid = useMemo(() => {
    try { return getMonthGrid(year, month) } catch (err) { console.warn('getMonthGrid failed', err); return { weeks: [] } }
  }, [getMonthGrid, year, month])
  const logDays = useMemo(() => {
    const set = new Set()
    if (dailyLogs && typeof dailyLogs === 'object') {
      Object.keys(dailyLogs).forEach((k) => { if (hasLogContent(dailyLogs[k])) set.add(k) })
    }
    return set
  }, [dailyLogs])
  const weekdays = useMemo(() => weekdayInitials(language), [language])
  const formatLabel = useCallback((d) => formatDate(d, 'dddd, MMMM D', language), [language])

  // ── month transition + swipe ──
  const tx = useSharedValue(0)
  const fade = useSharedValue(1)
  const gridStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }], opacity: fade.value }))
  const offsetRef = useRef(offset)
  offsetRef.current = offset

  const goMonth = useCallback((target) => {
    const next = clamp(target)
    const dir = Math.sign(next - offsetRef.current)
    if (!dir) { tx.value = withSpring(0); return }
    tapHaptic()
    setOffset(next)
    tx.value = withSequence(withTiming(dir * 60, { duration: 0 }), withTiming(0, { duration: 240 }))
    fade.value = withSequence(withTiming(0.2, { duration: 0 }), withTiming(1, { duration: 240 }))
  }, [])

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => { tx.value = g.dx * 0.45 },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -50 || g.vx < -0.5) goMonth(offsetRef.current + 1)
      else if (g.dx > 50 || g.vx > 0.5) goMonth(offsetRef.current - 1)
      else tx.value = withSpring(0)
    },
    onPanResponderTerminate: () => { tx.value = withSpring(0) },
  }), [goMonth])

  const onDayPress = useCallback((d) => {
    tapHaptic()
    setSelected(d)
    setSheetDate(d)
  }, [])

  // ── selected day card ──
  const sel = selected || today
  const info = useMemo(() => { try { return getDayInfo(sel) } catch { return null } }, [getDayInfo, sel])
  const chance = useMemo(() => { try { return getConceptionChance(sel) } catch { return null } }, [getConceptionChance, sel])
  const status = dayStatus(info, { hasData: cycleState?.hasData, periodDays }, t)
  const logged = logSummary(dailyLogs?.[sel], t)
  const chanceInfo = chance ? CHANCE[chance] : null

  // ── header & late banner ──
  const header = (
    <ScreenHeader
      large
      title={t('calendar')}
      right={(
        <Button
          title={t('cal_edit_period')}
          icon="edit"
          size="sm"
          variant="soft"
          onPress={() => navigation.navigate('EditPeriod')}
        />
      )}
    />
  )

  const fmt = (d, p = 'MMM D') => formatDate(d, p, language)
  const range = (a, b) => (a && b && a !== b ? `${fmt(a)} – ${fmt(b)}` : fmt(a || b))

  let nextValue = ''
  if (cycleState?.hasData) {
    if (cycleState.isLate) {
      nextValue = cycleState.daysLate === 1 ? t('cal_one_day_late') : t('cal_n_days_late', { n: cycleState.daysLate })
    } else {
      const n = cycleState.daysUntilNextPeriod
      const when = n === 0 ? t('cal_due_today') : n === 1 ? t('cal_tomorrow') : t('cal_in_n_days', { n })
      nextValue = `${fmt(cycleState.nextPeriodStart)} · ${when}`
    }
  }

  return (
    <Screen header={header}>
      {cycleState?.isLate ? (
        <FadeIn>
          <View style={[styles.banner, { backgroundColor: colors.periodSoft }]}>
            <Icon name="alert" size={18} color={colors.period} />
            <AppText variant="caption" color={colors.text} style={{ flex: 1, fontWeight: '600' }}>
              {cycleState.daysLate === 1 ? t('cal_late_banner_one') : t('cal_late_banner', { n: cycleState.daysLate })}
            </AppText>
            <Button title={t('cal_log_it')} size="sm" onPress={() => navigation.navigate('EditPeriod')} style={{ paddingHorizontal: 14 }} />
          </View>
        </FadeIn>
      ) : null}

      <Card style={{ paddingHorizontal: 0, paddingTop: 10, paddingBottom: 12 }}>
        <View style={[styles.monthNav, { paddingHorizontal: 10 }]}>
          <IconButton
            name="chevron-left"
            onPress={() => goMonth(offset - 1)}
            accessibilityLabel={t('cal_prev_month')}
            size={38}
          />
          <View style={styles.monthTitle}>
            <AppText variant="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>{formatDate(monthStart, 'MMMM YYYY', language)}</AppText>
            {offset !== 0 ? (
              <Tap onPress={() => { goMonth(0); setSelected(today) }} haptic hitSlop={8} style={[styles.todayPill, { backgroundColor: colors.primarySoft }]} accessibilityLabel={t('today')}>
                <AppText variant="small" color={colors.primary} numberOfLines={1}>{t('today')}</AppText>
              </Tap>
            ) : null}
          </View>
          <IconButton
            name="chevron-right"
            onPress={() => goMonth(offset + 1)}
            accessibilityLabel={t('cal_next_month')}
            size={38}
          />
        </View>

        <View style={{ alignItems: 'center', marginTop: 8 }} {...pan.panHandlers}>
          <WeekdayRow labels={weekdays} cellW={cellW} />
          <Animated.View style={[{ marginTop: 4, minHeight: (circle + 26) * 5 }, gridStyle]}>
            <MonthGrid
              weeks={grid.weeks}
              selected={sel}
              today={today}
              logDays={logDays}
              cellW={cellW}
              circle={circle}
              onPress={onDayPress}
              formatLabel={formatLabel}
            />
          </Animated.View>
        </View>
        <Legend t={t} />
      </Card>

      {/* Selected day */}
      <Card style={{ marginTop: 14 }}>
        <View style={styles.dayHead}>
          <View style={{ flex: 1 }}>
            <AppText variant="heading" numberOfLines={1}>{formatDate(sel, 'dddd, MMM D', language)}</AppText>
            {info?.cycleDay ? (
              <AppText variant="caption" muted>{t('cal_cycle_day_n', { n: info.cycleDay })}</AppText>
            ) : null}
          </View>
        </View>
        {status.text ? (
          <View style={[styles.statusRow]}>
            <View style={[styles.statusDot, { backgroundColor: colors[status.tone] || colors.textMuted }]} />
            <AppText variant="body" color={colors[status.tone] === colors.textMuted ? colors.text : colors[status.tone]} style={{ flex: 1, fontWeight: '600' }}>
              {status.text}
            </AppText>
          </View>
        ) : null}

        {chanceInfo ? (
          <View style={[styles.chanceBox, { backgroundColor: colors.surfaceAlt }]}>
            <IconBadge name="heart" tone={chanceInfo.score >= 3 ? 'fertile' : 'primary'} size={32} />
            <View style={{ flex: 1 }}>
              <AppText variant="small" muted>{t('cal_chance_title')}</AppText>
              <AppText variant="bodyStrong" color={colors[chanceInfo.tone]}>{t(`cal_chance_${chance}`)}</AppText>
            </View>
            <View style={styles.meter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[styles.meterBar, { height: 6 + i * 3, backgroundColor: i <= chanceInfo.score ? colors[chanceInfo.tone] : colors.track }]}
                />
              ))}
            </View>
          </View>
        ) : null}

        <AppText variant="caption" muted style={{ marginTop: 10 }} numberOfLines={3}>
          {logged ? `${t('cal_logged')}: ${logged}` : (sel > today ? t('cal_future_note') : t('cal_nothing_logged'))}
        </AppText>

        <Button
          title={sel > today ? t('cal_view_day') : t('cal_log_edit_day')}
          icon={sel > today ? 'calendar' : 'edit'}
          variant={sel > today ? 'secondary' : 'primary'}
          size="md"
          style={{ marginTop: 14 }}
          onPress={() => setSheetDate(sel)}
        />
      </Card>

      {/* This cycle */}
      {cycleState?.hasData ? (
        <ListGroup title={t('cal_this_cycle')}>
          <ListRow
            icon="drop"
            tone="period"
            title={t('period')}
            value={range(cycleState.lastPeriodStart, cycleState.isOnPeriod ? cycleState.expectedPeriodEnd : cycleState.lastPeriodEnd)}
          />
          {!cycleState.isLate && cycleState.fertileStart ? (
            <ListRow icon="leaf" tone="fertile" title={t('fertile_window')} value={range(cycleState.fertileStart, cycleState.fertileEnd)} />
          ) : null}
          {!cycleState.isLate && cycleState.ovulationDate ? (
            <ListRow icon="egg" tone="ovulation" title={t('ovulation')} value={fmt(cycleState.ovulationDate)} />
          ) : null}
          <ListRow
            icon={cycleState.isLate ? 'alert' : 'calendar'}
            tone={cycleState.isLate ? 'warning' : 'primary'}
            title={t('next_period')}
            value={nextValue}
          />
          <ListRow
            icon="refresh"
            tone="info"
            title={t('cal_cycle_length')}
            value={t('cal_n_days', { n: cycleState.cycleLength })}
          />
        </ListGroup>
      ) : (
        <Card style={{ marginTop: 14 }}>
          <EmptyState
            icon="drop"
            tone="period"
            title={t('cal_no_period_title')}
            body={t('cal_no_period_body')}
            actionLabel={t('cal_edit_period')}
            onAction={() => navigation.navigate('EditPeriod')}
          />
        </Card>
      )}

      <View style={{ marginTop: 16 }}>
        <AdBanner />
      </View>

      <DaySheet
        date={sheetDate}
        visible={!!sheetDate}
        onClose={() => setSheetDate(null)}
        navigation={navigation}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingVertical: 10, paddingLeft: 14, paddingRight: 8, marginBottom: 12 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 0 },
  todayPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  dayHead: { flexDirection: 'row', alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  chanceBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12, marginTop: 12 },
  meter: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  meterBar: { width: 5, borderRadius: 3 },
})
