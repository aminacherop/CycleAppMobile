import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, ScrollView, StyleSheet, Pressable, Alert, useWindowDimensions } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated'
import dayjs from 'dayjs'
import { ScreenHeader, AppText, Button, Icon } from '../../components/ui'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import { formatDate, weekdayInitials } from '../../utils/dates'
import { tapHaptic, successHaptic, warningHaptic } from '../../utils/haptics'
import { WeekdayRow } from './MonthGrid'
import { computePeriodEdits } from './periodDiff'

const START_MONTHS_BACK = 6
const MAX_MONTHS_BACK = 24

// ── one tappable day ────────────────────────────────────────────────
const EditDay = memo(({ date, dayNum, selected, disabled, isToday, cellW, onToggle, label }) => {
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
      style={[styles.day, { width: cellW, opacity: disabled ? 0.35 : 1 }]}
    >
      <AppText
        variant="caption"
        color={isToday ? colors.primary : colors.text}
        style={{ fontWeight: isToday ? '800' : '600' }}
        maxFontSizeMultiplier={1.15}
      >
        {dayNum}
      </AppText>
      {disabled ? (
        <View style={{ width: size, height: size, marginTop: 5 }} />
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
    </Pressable>
  )
})

// ── one month block ─────────────────────────────────────────────────
const EditMonth = memo(({ monthStart, draft, today, cellW, onToggle, language }) => {
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
      {weeks.map((w, wi) => (
        <View key={wi} style={styles.row}>
          {w.map((d, di) => (d ? (
            <EditDay
              key={d}
              date={d}
              dayNum={Number(d.slice(8, 10))}
              selected={draft.has(d)}
              disabled={d > today}
              isToday={d === today}
              cellW={cellW}
              onToggle={onToggle}
              label={formatDate(d, 'dddd, MMMM D', language)}
            />
          ) : <View key={`b${di}`} style={{ width: cellW }} />))}
        </View>
      ))}
    </View>
  )
})

export default function EditPeriodScreen({ navigation }) {
  const { colors } = useTheme()
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
  const savedRef = useRef(false)

  const months = useMemo(() => {
    const cur = dayjs(today).startOf('month')
    const out = []
    for (let i = monthsBack; i >= 0; i--) out.push(cur.subtract(i, 'month').format('YYYY-MM-DD'))
    return out
  }, [today, monthsBack])
  const rangeStart = months[0]

  const edits = useMemo(
    () => computePeriodEdits(app.periodDays, draft, rangeStart, today),
    [app.periodDays, draft, rangeStart, today],
  )
  const dirty = edits.added.length + edits.removed.length > 0
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const onToggle = useCallback((d) => {
    tapHaptic()
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }, [])

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

  // Start scrolled to the current month (bottom); keep position when older months are prepended.
  const scrollRef = useRef(null)
  const didInitialScroll = useRef(false)

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
        onContentSizeChange={() => {
          if (!didInitialScroll.current) {
            didInitialScroll.current = true
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        }}
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
          <EditMonth key={m} monthStart={m} draft={draft} today={today} cellW={cellW} onToggle={onToggle} language={language} />
        ))}
      </ScrollView>

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
  day: { alignItems: 'center', paddingVertical: 6, minHeight: 52 },
  tick: { marginTop: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  weekHead: { paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  bottomBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  bottomInner: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 640, alignSelf: 'center' },
})
