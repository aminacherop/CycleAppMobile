import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, Alert, useWindowDimensions } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring, FadeInDown, FadeOutDown,
} from 'react-native-reanimated'
import dayjs from 'dayjs'
import { ScreenHeader, AppText, Button, Icon, DayCircle, Tap } from '../../components/ui'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import { formatDate, weekdayInitials } from '../../utils/dates'
import { tapHaptic, successHaptic, warningHaptic } from '../../utils/haptics'
import { WeekdayRow, CycleDayNum, gridLines, markerKind } from './MonthGrid'
import { computePeriodEdits, applyDayTap } from './periodDiff'
import { buildCycleContext, getDayInfo, normalizeSettings } from '../../utils/cycleEngine'

const START_MONTHS_BACK = 6
const MAX_MONTHS_BACK = 24
const UNDO_MS = 5000

// ── one tappable day ────────────────────────────────────────────────
// Past days: tick circle (filled = period). Future days can't be tapped;
// they preview the expected/predicted period as a dashed circle.
const EditDay = memo(({
  date, dayNum, selected, disabled, isToday, cellW, kind, cycleDay, lastCol, lastRow, onToggle, label,
}) => {
  const { colors } = useTheme()
  const scale = useSharedValue(1)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    scale.value = withSequence(withTiming(1.22, { duration: 90 }), withSpring(1, { damping: 12, stiffness: 260 }))
  }, [selected])
  const tick = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const size = Math.max(20, Math.min(26, cellW - 18))
  return (
    <Pressable
      onPress={disabled ? undefined : () => onToggle(date)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: !!selected, disabled: !!disabled }}
      style={[styles.day, { width: cellW }, gridLines(lastCol, lastRow, colors.border)]}
    >
      <AppText
        variant="caption"
        color={isToday ? colors.primary : colors.text}
        style={{ fontWeight: isToday ? '800' : '600', opacity: disabled ? 0.45 : 1 }}
        maxFontSizeMultiplier={1.15}
      >
        {dayNum}
      </AppText>
      {disabled ? (
        <View style={{ width: size, height: size, marginTop: 5 }}>
          {kind === 'period' || kind === 'predicted'
            ? <DayCircle size={size} stroke={colors.period} dashed style={{ opacity: kind === 'period' ? 1 : 0.6 }} />
            : null}
        </View>
      ) : (
        <Animated.View
          style={[
            styles.tick,
            { width: size, height: size, borderRadius: size / 2 },
            selected
              ? { backgroundColor: colors.period, borderColor: colors.period }
              : { borderColor: colors.border, backgroundColor: colors.surface },
            tick,
          ]}
        >
          {selected ? <Icon name="check" size={size * 0.62} color="#FFFFFF" /> : null}
        </Animated.View>
      )}
      <View style={styles.cycleRow}>
        <CycleDayNum n={cycleDay} kind={kind} />
      </View>
    </Pressable>
  )
})

// ── one month block ─────────────────────────────────────────────────
const EditMonth = memo(({ monthStart, draft, ctx, today, cellW, onToggle, language, t }) => {
  const { colors } = useTheme()
  const first = dayjs(monthStart)
  const daysIn = first.daysInMonth()
  const lead = first.day() // Sunday-first
  const cells = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let i = 0; i < daysIn; i++) cells.push(first.add(i, 'day').format('YYYY-MM-DD'))
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return (
    <View style={{ marginBottom: 18 }}>
      <AppText variant="subheading" style={{ marginBottom: 6, marginLeft: 4 }}>
        {formatDate(monthStart, 'MMMM YYYY', language)}
      </AppText>
      {weeks.map((w, wi) => {
        const lastRow = wi === weeks.length - 1
        return (
          <View key={wi} style={styles.row}>
            {w.map((d, di) => {
              const lastCol = di === 6
              if (!d) return <View key={`b${di}`} style={[{ width: cellW }, gridLines(lastCol, lastRow, colors.border)]} />
              let info = null
              try { info = getDayInfo(d, null, null, null, ctx) } catch { info = null }
              const cycleDay = Number.isFinite(info?.cycleDay) && info.cycleDay > 0 ? info.cycleDay : null
              const day = formatDate(d, 'dddd, MMMM D', language)
              return (
                <EditDay
                  key={d}
                  date={d}
                  dayNum={Number(d.slice(8, 10))}
                  selected={draft.has(d)}
                  disabled={d > today}
                  isToday={d === today}
                  cellW={cellW}
                  kind={markerKind(info)}
                  cycleDay={cycleDay}
                  lastCol={lastCol}
                  lastRow={lastRow}
                  onToggle={onToggle}
                  label={cycleDay ? `${day}, ${t('cal_cycle_day_n', { n: cycleDay })}` : day}
                />
              )
            })}
          </View>
        )
      })}
    </View>
  )
})

export default function EditPeriodScreen({ navigation }) {
  const { colors, isDark } = useTheme()
  const { t, language } = useLanguage()
  const app = useApp()
  const { today } = app
  const { width } = useWindowDimensions()

  const gutter = width >= 600 ? 28 : 16
  const innerW = Math.min(width, 640) - gutter * 2
  const cellW = Math.floor(innerW / 7)

  const [monthsBack, setMonthsBack] = useState(START_MONTHS_BACK)
  const [draft, setDraft] = useState(() => new Set(Array.isArray(app.periodDays) ? app.periodDays : []))
  const [saving, setSaving] = useState(false)
  const [undo, setUndo] = useState(null) // draft before a whole period was removed
  const savedRef = useRef(false)
  const undoTimer = useRef(null)
  useEffect(() => () => clearTimeout(undoTimer.current), [])

  // Months shown: history up to this month, plus next month as a read-only
  // preview of the predicted period.
  const months = useMemo(() => {
    const cur = dayjs(today).startOf('month')
    const out = []
    for (let i = monthsBack; i >= 0; i--) out.push(cur.subtract(i, 'month').format('YYYY-MM-DD'))
    out.push(cur.add(1, 'month').format('YYYY-MM-DD'))
    return out
  }, [today, monthsBack])

  // Live preview: the same engine as the main calendar, run on the draft.
  const settings = useMemo(() => normalizeSettings(app.cycleSettings), [app.cycleSettings])
  const periodLength = app.cycleState?.averages?.periodLength || settings.periodLength
  const ctx = useMemo(() => buildCycleContext([...draft], settings, today), [draft, settings, today])

  const edits = useMemo(() => computePeriodEdits(app.periodDays, draft), [app.periodDays, draft])
  const dirty = edits.added.length + edits.removed.length > 0
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const draftRef = useRef(draft)
  draftRef.current = draft
  const onToggle = useCallback((d) => {
    tapHaptic()
    const prev = draftRef.current
    const { days, removed } = applyDayTap([...prev], d, periodLength)
    setDraft(new Set(days))
    clearTimeout(undoTimer.current)
    if (removed) {
      setUndo(prev)
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS)
    } else {
      setUndo(null)
    }
  }, [periodLength])

  const onUndo = () => {
    clearTimeout(undoTimer.current)
    if (undo) setDraft(undo)
    setUndo(null)
  }

  // Confirm before leaving with unsaved changes (back button, gesture, Cancel).
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (savedRef.current || !dirtyRef.current) return
      e.preventDefault()
      warningHaptic()
      Alert.alert(t('cal_ep_discard_title'), t('cal_ep_discard_body'), [
        { text: t('cal_ep_keep'), style: 'cancel' },
        { text: t('cal_ep_discard'), style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ])
    })
    return unsub
  }, [navigation, t])

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack()
    else navigation.navigate('Calendar')
  }

  const onSave = async () => {
    if (saving) return
    if (!dirty) { close(); return }
    setSaving(true)
    try {
      // No batch setter exists: each toggle applies synchronously on the
      // latest periodDays ref inside useAppData, so firing them together
      // composes into one consistent result; then wait for persistence.
      const changed = [...edits.added, ...edits.removed]
      await Promise.all(changed.map((d) => app.togglePeriodDay(d)))
      successHaptic()
      savedRef.current = true
      close()
    } catch (err) {
      console.warn('Saving period days failed', err)
      setSaving(false)
      Alert.alert(t('cal_ep_save_failed'))
    }
  }

  // Start scrolled to the current month; keep position when older months are prepended.
  const scrollRef = useRef(null)
  const didInitialScroll = useRef(false)
  const currentMonth = months[months.length - 2]
  const onCurrentMonthLayout = (e) => {
    if (didInitialScroll.current) return
    didInitialScroll.current = true
    scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 8), animated: false })
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: gutter, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <ScreenHeader title={t('cal_ep_title')} subtitle={t('cal_ep_hint')} onBack={close} />
        <View style={[styles.weekHead, { borderBottomColor: colors.border }]}>
          <WeekdayRow labels={weekdayInitials(language)} cellW={cellW} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 20, width: '100%', maxWidth: 640, alignSelf: 'center' }}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {monthsBack < MAX_MONTHS_BACK ? (
          <Button
            title={t('cal_ep_earlier')}
            icon="history"
            variant="ghost"
            size="sm"
            style={{ alignSelf: 'center', marginBottom: 12 }}
            onPress={() => setMonthsBack((m) => Math.min(MAX_MONTHS_BACK, m + 6))}
          />
        ) : null}
        {months.map((m) => (
          <View key={m} onLayout={m === currentMonth ? onCurrentMonthLayout : undefined}>
            <EditMonth monthStart={m} draft={draft} ctx={ctx} today={today} cellW={cellW} onToggle={onToggle} language={language} t={t} />
          </View>
        ))}
      </ScrollView>

      {undo ? (
        <Animated.View
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(160)}
          style={[styles.undo, { backgroundColor: colors.text }]}
        >
          <AppText variant="bodyStrong" color={colors.bg} style={{ flex: 1 }} numberOfLines={1}>{t('cal_ep_removed')}</AppText>
          <Tap onPress={onUndo} haptic hitSlop={6} style={styles.undoBtn} accessibilityRole="button" accessibilityLabel={t('home_undo')}>
            <AppText variant="bodyStrong" color={isDark ? colors.primaryPressed : colors.primarySoft2}>{t('home_undo')}</AppText>
          </Tap>
        </Animated.View>
      ) : null}

      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: 12 },
        ]}
      >
        <View style={[styles.bottomInner, { paddingHorizontal: gutter }]}>
          <Button title={t('cancel')} variant="secondary" size="md" onPress={close} style={{ flex: 1 }} />
          <Button title={t('save')} icon="check" size="md" onPress={onSave} loading={saving} disabled={!dirty} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  day: { alignItems: 'center', paddingTop: 6, paddingBottom: 3 },
  cycleRow: { height: 14, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  undo: {
    position: 'absolute', left: 16, right: 16, bottom: 84, maxWidth: 608, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingLeft: 16, paddingRight: 4, paddingVertical: 4,
  },
  undoBtn: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' },
  tick: { marginTop: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  weekHead: { paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  bottomBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  bottomInner: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 640, alignSelf: 'center' },
})
