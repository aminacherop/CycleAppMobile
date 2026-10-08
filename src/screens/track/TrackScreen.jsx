import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import { AppText, Icon, IconButton, ScreenHeader, Segmented, Tap } from '../../components/ui'
import { formatDate } from '../../utils/dates'
import { RADIUS } from '../../theme/palette'
import LogView from './LogView'
import InsightsView from './InsightsView'
import DatePickerSheet from './DatePickerSheet'
import { MAX_W, SavedIndicator, useGutter } from './parts'
import { sanitizeDate, shiftDate } from './trackUtils'

const VIEWS = ['log', 'insights']

export default function TrackScreen({ navigation, route }) {
  const app = useApp()
  const { t, language } = useLanguage()
  const { colors } = useTheme()
  const gutter = useGutter()
  const { today } = app

  const params = route?.params
  const [view, setView] = useState(() => (VIEWS.includes(params?.view) ? params.view : 'log'))
  const [date, setDate] = useState(() => sanitizeDate(params?.date, today))
  const [savedTick, setSavedTick] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Honour new route params (each navigate() gives a new params object).
  useEffect(() => {
    if (!params) return
    if (VIEWS.includes(params.view)) setView(params.view)
    if (params.date) setDate(sanitizeDate(params.date, today))
  }, [params])

  // Midnight rollover: never sit on a future date.
  useEffect(() => { setDate((d) => (d > today ? today : d)) }, [today])

  const onSaved = useCallback(() => setSavedTick((x) => x + 1), [])
  const goPrev = useCallback(() => setDate((d) => shiftDate(d, -1)), [])
  const goNext = useCallback(() => setDate((d) => (d < today ? shiftDate(d, 1) : d)), [today])
  const onPick = useCallback((d) => { setDate(sanitizeDate(d, today)); setPickerOpen(false) }, [today])
  const onLogPeriod = useCallback(() => { setDate(today); setView('log') }, [today])

  const segOptions = useMemo(() => [
    { key: 'log', label: t('trk_view_log') },
    { key: 'insights', label: t('insights') },
  ], [t])

  const short = formatDate(date, 'MMM D', language)
  const dateLabel = date === today
    ? t('trk_today_date', { date: short })
    : date === shiftDate(today, -1)
      ? t('trk_yesterday_date', { date: short })
      : formatDate(date, 'ddd, MMM D', language)
  const atToday = date >= today

  const wrap = { paddingHorizontal: gutter, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={wrap}>
        <ScreenHeader
          title={t('nav_track')}
          large
          right={view === 'log' ? <SavedIndicator tick={savedTick} label={t('trk_saved')} /> : null}
        />
        <Segmented options={segOptions} value={view} onChange={setView} />
        {view === 'log' ? (
          <View style={styles.dateRow}>
            <IconButton name="chevron-left" size={44} onPress={goPrev} accessibilityLabel={t('trk_prev_day')} />
            <Tap
              onPress={() => setPickerOpen(true)}
              scaleTo={0.97}
              accessibilityLabel={`${dateLabel}. ${t('trk_pick_date')}`}
              style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Icon name="calendar" size={17} color={colors.primary} />
              <AppText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>{dateLabel}</AppText>
            </Tap>
            <View style={{ opacity: atToday ? 0.35 : 1 }} pointerEvents={atToday ? 'none' : 'auto'}>
              <IconButton name="chevron-right" size={44} onPress={goNext} accessibilityLabel={t('trk_next_day')} />
            </View>
          </View>
        ) : null}
      </View>

      <ScrollView
        key={view}
        style={{ flex: 1 }}
        contentContainerStyle={[wrap, { paddingTop: 12, paddingBottom: 32 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {view === 'log' ? (
          <LogView key={date} date={date} onSaved={onSaved} navigation={navigation} />
        ) : (
          <InsightsView navigation={navigation} onLogPeriod={onLogPeriod} />
        )}
      </ScrollView>

      <DatePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={date}
        today={today}
        periodDays={app.periodDays}
        dailyLogs={app.dailyLogs}
        onPick={onPick}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  dateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 44, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 12,
  },
})
