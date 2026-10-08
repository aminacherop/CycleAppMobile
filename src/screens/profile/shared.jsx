import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, TextInput, View, StyleSheet } from 'react-native'
import Animated, { FadeIn as RFadeIn, FadeOut as RFadeOut } from 'react-native-reanimated'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import dayjs from 'dayjs'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { AppText, Button, Icon, ScreenHeader, Sheet } from '../../components/ui'
import { RADIUS } from '../../theme/palette'
import { formatDate, parseDate } from '../../utils/dates'
import { loadData, saveData } from '../../utils/storage'

// ── Header with a back button + optional "Saved" pill on the right ──
export const BackHeader = ({ navigation, title, subtitle, saved, right }) => {
  const { t } = useLanguage()
  const canBack = navigation?.canGoBack?.()
  return (
    <ScreenHeader
      title={title}
      subtitle={subtitle}
      onBack={canBack ? () => navigation.goBack() : undefined}
      right={right || <SavedPill visible={saved} label={t('pf_saved')} />}
    />
  )
}

// Subtle "Saved" confirmation that fades in/out.
export const SavedPill = ({ visible, label }) => {
  const { colors } = useTheme()
  if (!visible) return null
  return (
    <Animated.View
      entering={RFadeIn.duration(160)}
      exiting={RFadeOut.duration(260)}
      style={[styles.saved, { backgroundColor: colors.successSoft }]}
      accessibilityLiveRegion="polite"
    >
      <Icon name="check" size={14} color={colors.success} />
      <AppText variant="small" color={colors.success}>{label}</AppText>
    </Animated.View>
  )
}

/** [saved, flash] — call flash() after an autosave to show the pill for ~1.4s. */
export const useSavedFlash = () => {
  const [saved, setSaved] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => timer.current && clearTimeout(timer.current), [])
  const flash = useCallback(() => {
    setSaved(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaved(false), 1400)
  }, [])
  return [saved, flash]
}

// ── Themed text field ──
export const Field = ({ label, error, style, ...rest }) => {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  return (
    <View style={style}>
      {label ? <AppText variant="caption" muted style={{ fontWeight: '700', marginBottom: 6 }}>{label}</AppText> : null}
      <TextInput
        accessibilityLabel={typeof label === 'string' ? label : undefined}
        placeholderTextColor={colors.textFaint}
        maxFontSizeMultiplier={1.35}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          },
        ]}
        {...rest}
      />
      {error ? <AppText variant="small" color={colors.danger} style={{ marginTop: 4 }}>{error}</AppText> : null}
    </View>
  )
}

// ── Date / time picking (Android: native dialog; iOS: spinner in a sheet) ──
/**
 * const picker = usePicker()
 * picker.open({ mode: 'date'|'time', value: Date, minimumDate, maximumDate, onPick: (Date) => {} })
 * Render {picker.element} once in the screen.
 */
export const usePicker = () => {
  const { t } = useLanguage()
  const [ios, setIos] = useState(null) // { opts, value }

  const open = useCallback((opts) => {
    const value = opts?.value instanceof Date && !isNaN(opts.value) ? opts.value : new Date()
    if (Platform.OS === 'android') {
      try {
        DateTimePickerAndroid.open({
          value,
          mode: opts.mode || 'date',
          is24Hour: opts.is24Hour,
          minimumDate: opts.minimumDate,
          maximumDate: opts.maximumDate,
          onChange: (event, date) => {
            if (event?.type === 'set' && date) {
              try { opts.onPick?.(date) } catch (e) { console.warn('picker onPick failed', e) }
            }
          },
        })
      } catch (e) {
        console.warn('Picker failed to open', e)
      }
    } else {
      setIos({ opts, value })
    }
  }, [])

  const element = Platform.OS === 'android' ? null : (
    <Sheet visible={!!ios} onClose={() => setIos(null)} title={ios?.opts?.title}>
      {ios ? (
        <View>
          <DateTimePicker
            value={ios.value}
            mode={ios.opts.mode || 'date'}
            display="spinner"
            minimumDate={ios.opts.minimumDate}
            maximumDate={ios.opts.maximumDate}
            onChange={(_, d) => { if (d) setIos(s => (s ? { ...s, value: d } : s)) }}
          />
          <Button
            title={t('done')}
            onPress={() => { const cur = ios; setIos(null); try { cur.opts.onPick?.(cur.value) } catch {} }}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : null}
    </Sheet>
  )
  return { open, element }
}

// ── formatting helpers ──
export const formatTime = (time, language = 'en') => {
  const h = Math.max(0, Math.min(23, Number(time?.hour) || 0))
  const m = Math.max(0, Math.min(59, Number(time?.minute) || 0))
  const d = dayjs().hour(h).minute(m)
  // 12h clock for English, 24h elsewhere (matches most locales).
  return formatDate(d, language === 'en' ? 'h:mm A' : 'HH:mm', language)
}

export const timeToDate = (time) => {
  const d = new Date()
  d.setHours(Number(time?.hour) || 0, Number(time?.minute) || 0, 0, 0)
  return d
}

/** Whole years since dob, or null if dob is missing/invalid/implausible. */
export const ageFromDob = (dob) => {
  const d = parseDate(dob)
  if (!d) return null
  const age = dayjs().diff(d, 'year')
  return age >= 0 && age <= 120 ? age : null
}

// ── goal + pregnancy storage (same keys the old screens used) ──
export const GOAL_KEY = 'user_goal'
export const loadGoal = async () => {
  const g = await loadData(GOAL_KEY, 'track_period')
  return typeof g === 'string' ? g : 'track_period'
}
export const saveGoal = async (id) => {
  await Promise.all([saveData(GOAL_KEY, id), saveData('user_goals_all', [id])])
}

export const loadPregnancy = async () => {
  const [on, start, display] = await Promise.all([
    loadData('pregnancy_mode', false),
    loadData('gestation_start', null),
    loadData('pregnancy_homepage_display', 'since_pregnancy'),
  ])
  return {
    on: on === true,
    gestationStart: typeof start === 'string' ? start : null,
    display: display === 'days_to_baby' ? 'days_to_baby' : 'since_pregnancy',
  }
}

/** reason: 'no_longer_pregnant' | 'mistake' | 'baby_born' */
export const endPregnancyMode = async (reason, today) => {
  const writes = [saveData('pregnancy_mode', false)]
  if (reason === 'baby_born') writes.push(saveData('baby_born_date', today || dayjs().format('YYYY-MM-DD')))
  if (reason === 'no_longer_pregnant') writes.push(saveData('pregnancy_ended_reason', 'no_longer_pregnant'))
  const goal = await loadGoal()
  if (goal === 'pregnancy' || reason === 'mistake') writes.push(saveGoal('track_period'))
  await Promise.all(writes)
}

const styles = StyleSheet.create({
  saved: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 50 },
})

/** "1 day" / "5 days" */
export const nDays = (t, n) => (Number(n) === 1 ? t('pf_one_day') : t('pf_n_days', { n }))
