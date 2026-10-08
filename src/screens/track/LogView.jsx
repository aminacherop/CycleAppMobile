import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, TextInput, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming,
} from 'react-native-reanimated'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import { AppText, Card, Chip, FadeIn, Icon, Tap } from '../../components/ui'
import { RADIUS } from '../../theme/palette'
import {
  FLOWS, MOODS, QUICK_SYMPTOMS, MUCUS, PREGNANCY_TEST, INTIMACY, WATER_GOAL,
} from '../../constants/logOptions'
import { SectionHead, StepButton } from './parts'
import { asList, asNumber, numberToText, parseDecimal, toggleInList, tp } from './trackUtils'

const DEBOUNCE_MS = 500
const EMPTY_LOG = {}
const FLOW_OPTIONS = [{ id: 'none', labelKey: 'flow_none' }, ...FLOWS]
const BBT_RANGE = { min: 30, max: 115 } // °C or °F
const WEIGHT_RANGE = { min: 1, max: 700 } // kg or lb

// ── Single-select chip row (tap again = deselect → null) ────────────────
const SingleChips = memo(({ options, value, onChange, tone }) => {
  const { t } = useLanguage()
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Chip
          key={o.id}
          label={t(o.labelKey)}
          tone={tone}
          selected={value === o.id}
          onPress={() => onChange(value === o.id ? null : o.id)}
        />
      ))}
    </View>
  )
})

// ── Multi-select chip row ───────────────────────────────────────────────
const MultiChips = memo(({ options, values, onToggle, tone }) => {
  const { t } = useLanguage()
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Chip
          key={o.id}
          label={t(o.labelKey)}
          tone={tone}
          selected={values.includes(o.id)}
          onPress={() => onToggle(o.id)}
        />
      ))}
    </View>
  )
})

// ── Period ──────────────────────────────────────────────────────────────
const PeriodSection = memo(({ flow, hint, onChange }) => {
  const { t } = useLanguage()
  const { colors } = useTheme()
  return (
    <Card>
      <SectionHead icon="drop" tone="period" title={t('period_flow')} />
      {hint ? (
        <View style={[styles.hint, { backgroundColor: colors.periodSoft }]}>
          <Icon name="info" size={15} color={colors.period} />
          <AppText variant="caption" color={colors.period} style={{ flex: 1 }}>{hint}</AppText>
        </View>
      ) : null}
      <SingleChips options={FLOW_OPTIONS} value={flow} onChange={onChange} tone="period" />
    </Card>
  )
})

// ── Symptoms ────────────────────────────────────────────────────────────
const QUICK_OPTIONS = QUICK_SYMPTOMS.map((id) => ({ id, labelKey: `symptom_${id}` }))

const SymptomSection = memo(({ selected, onToggle, onMore }) => {
  const { t } = useLanguage()
  const { colors } = useTheme()
  const extra = selected.filter((id) => !QUICK_SYMPTOMS.includes(id)).length
  return (
    <Card>
      <SectionHead icon="bolt" tone="warning" title={t('symptoms')} />
      <MultiChips options={QUICK_OPTIONS} values={selected} onToggle={onToggle} tone="warning" />
      <Tap
        onPress={onMore}
        haptic
        accessibilityLabel={t('trk_more_symptoms')}
        style={[styles.moreRow, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
      >
        <Icon name="plus" size={16} color={colors.primary} />
        <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700', flex: 1 }}>{t('trk_more_symptoms')}</AppText>
        {extra > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.warningSoft }]}>
            <AppText variant="small" color={colors.warning}>{tp(t, 'trk_more_selected', extra)}</AppText>
          </View>
        ) : null}
        <Icon name="chevron-right" size={16} color={colors.textFaint} />
      </Tap>
    </Card>
  )
})

// ── Water ───────────────────────────────────────────────────────────────
const Glass = memo(({ index, filled, onPress, size }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const s = useSharedValue(1)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    s.value = withSequence(withTiming(filled ? 1.18 : 0.88, { duration: 110 }), withSpring(1, { damping: 10, stiffness: 260 }))
  }, [filled])
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }))
  return (
    <Tap
      onPress={() => onPress(index)}
      scaleTo={0.9}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: filled }}
      accessibilityLabel={t('trk_glass_n', { n: index + 1 })}
      style={{ width: size, height: size + 6, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={[styles.glass, {
          width: size - 4, height: size + 2,
          backgroundColor: filled ? colors.infoSoft : 'transparent',
          borderColor: filled ? colors.info : colors.border,
        }, aStyle]}
      >
        <Icon name="water" size={Math.round(size * 0.6)} color={filled ? colors.info : colors.textFaint} />
      </Animated.View>
    </Tap>
  )
})

const WaterSection = memo(({ water, onChange }) => {
  const { t } = useLanguage()
  const { colors } = useTheme()
  const [rowW, setRowW] = useState(0)
  const glassSize = rowW ? Math.max(30, Math.min(48, Math.floor(rowW / WATER_GOAL) - 2)) : 36
  const onGlass = useCallback((i) => onChange(water === i + 1 ? i : i + 1), [water, onChange])
  return (
    <Card>
      <SectionHead
        icon="water"
        tone="info"
        title={t('water_intake')}
        right={<AppText variant="caption" muted>{t('trk_water_count', { n: water, goal: WATER_GOAL })}</AppText>}
      />
      <View style={styles.glasses} onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
        {Array.from({ length: WATER_GOAL }, (_, i) => (
          <Glass key={i} index={i} filled={i < water} onPress={onGlass} size={glassSize} />
        ))}
      </View>
      <View style={styles.stepRow}>
        <StepButton icon="minus" disabled={water <= 0} onPress={() => onChange(Math.max(0, water - 1))} accessibilityLabel={t('trk_water_remove')} />
        <AppText variant="heading" color={colors.info} style={{ minWidth: 44, textAlign: 'center' }}>{water}</AppText>
        <StepButton icon="plus" disabled={water >= 30} onPress={() => onChange(Math.min(30, water + 1))} accessibilityLabel={t('trk_water_add')} />
      </View>
    </Card>
  )
})

// ── Debounced text field (saves after 500ms idle and on blur/unmount) ───
const useDebouncedCommit = (commit) => {
  const commitRef = useRef(commit)
  commitRef.current = commit
  const timer = useRef(null)
  const pending = useRef(undefined)
  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    if (pending.current !== undefined) {
      const v = pending.current
      pending.current = undefined
      try { commitRef.current?.(v) } catch (e) { console.warn('Track: commit failed', e) }
    }
  }, [])
  const schedule = useCallback((v) => {
    pending.current = v
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, DEBOUNCE_MS)
  }, [flush])
  useEffect(() => flush, [flush]) // flush on unmount (e.g. date change)
  return { schedule, flush }
}

const DecimalField = memo(({ icon, tone, label, value, placeholder, range, onCommit, hint }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const [text, setText] = useState(() => numberToText(value))
  const [invalid, setInvalid] = useState(false)
  const focused = useRef(false)

  // Keep in sync with outside changes while not editing.
  useEffect(() => { if (!focused.current) setText(numberToText(value)) }, [value])

  const commit = useCallback((s) => {
    const n = parseDecimal(s, range)
    if (Number.isNaN(n)) { setInvalid(true); return }
    setInvalid(false)
    if (n !== asNumber(value)) onCommit(n)
  }, [range, value, onCommit])
  const { schedule, flush } = useDebouncedCommit(commit)

  return (
    <View style={styles.field}>
      <SectionHead icon={icon} tone={tone} title={label} subtitle={hint} />
      <TextInput
        value={text}
        onChangeText={(s) => { setText(s); schedule(s) }}
        onFocus={() => { focused.current = true }}
        onBlur={() => { focused.current = false; flush() }}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        maxLength={7}
        accessibilityLabel={label}
        maxFontSizeMultiplier={1.35}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: invalid ? colors.danger : colors.border }]}
      />
      {invalid ? <AppText variant="small" color={colors.danger} style={{ marginTop: 4 }}>{t('trk_invalid_number')}</AppText> : null}
    </View>
  )
})

const NotesField = memo(({ value, onCommit }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const initial = typeof value === 'string' ? value : ''
  const [text, setText] = useState(initial)
  const lastSaved = useRef(initial)
  const commit = useCallback((s) => {
    if (s === lastSaved.current) return
    lastSaved.current = s
    onCommit(s)
  }, [onCommit])
  const { schedule, flush } = useDebouncedCommit(commit)
  return (
    <View style={styles.field}>
      <SectionHead icon="note" tone="primary" title={t('notes')} />
      <TextInput
        value={text}
        onChangeText={(s) => { setText(s); schedule(s) }}
        onBlur={flush}
        multiline
        placeholder={t('how_feeling')}
        placeholderTextColor={colors.textFaint}
        maxLength={2000}
        accessibilityLabel={t('notes')}
        maxFontSizeMultiplier={1.35}
        textAlignVertical="top"
        style={[styles.input, styles.notes, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
      />
    </View>
  )
})

// ── Sleep stepper (null = not logged) ───────────────────────────────────
const SleepField = memo(({ value, onChange }) => {
  const { t } = useLanguage()
  const { colors } = useTheme()
  const v = asNumber(value)
  const has = v != null && v > 0
  const step = (d) => {
    if (!has) { onChange(d > 0 ? 7 : 6); return }
    const next = Math.round((v + d) * 2) / 2
    onChange(next <= 0 ? null : Math.min(24, next))
  }
  return (
    <View style={styles.field}>
      <SectionHead
        icon="bed"
        tone="ovulation"
        title={t('sleep_hours')}
        right={has ? (
          <Tap onPress={() => onChange(null)} hitSlop={8} accessibilityLabel={t('trk_clear')} style={{ padding: 4 }}>
            <AppText variant="small" muted>{t('trk_clear')}</AppText>
          </Tap>
        ) : null}
      />
      <View style={styles.stepRow}>
        <StepButton icon="minus" onPress={() => step(-0.5)} accessibilityLabel={t('trk_decrease')} />
        <AppText variant="heading" color={has ? colors.text : colors.textFaint} style={{ minWidth: 110, textAlign: 'center' }}>
          {has ? t('trk_hours', { n: v }) : t('trk_not_logged')}
        </AppText>
        <StepButton icon="plus" onPress={() => step(0.5)} disabled={has && v >= 24} accessibilityLabel={t('trk_increase')} />
      </View>
    </View>
  )
})

// ── Collapsible "More" card ─────────────────────────────────────────────
const MoreSection = memo(({ log, update }) => {
  const { t } = useLanguage()
  const { colors } = useTheme()
  const hasData = log.sleep != null || log.mucus || log.bbt != null || log.weight != null
    || log.pregnancyTest || log.intimacy || (typeof log.notes === 'string' && log.notes.trim())
  const [open, setOpen] = useState(!!hasData)
  const rot = useSharedValue(open ? 1 : 0)
  useEffect(() => { rot.value = withSpring(open ? 1 : 0, { damping: 16, stiffness: 200 }) }, [open])
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value * 180}deg` }] }))

  const set = useCallback((key) => (v) => update({ [key]: v }), [update])
  const setters = useMemo(() => ({
    sleep: set('sleep'), mucus: set('mucus'), bbt: set('bbt'), weight: set('weight'),
    pregnancyTest: set('pregnancyTest'), intimacy: set('intimacy'), notes: set('notes'),
  }), [set])

  return (
    <Card>
      <Tap
        onPress={() => setOpen((o) => !o)}
        scaleTo={0.99}
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t('trk_more')}
        style={styles.moreHead}
      >
        <View style={{ flex: 1 }}>
          <SectionHead icon="sparkle" tone="primary" title={t('trk_more')} subtitle={t('trk_more_sub')} />
        </View>
        <Animated.View style={[chevron, { marginBottom: 12 }]}>
          <Icon name="chevron-down" size={20} color={colors.textMuted} />
        </Animated.View>
      </Tap>
      {open ? (
        <View>
          <FadeIn index={0}><SleepField value={log.sleep} onChange={setters.sleep} /></FadeIn>
          <FadeIn index={1} style={styles.field}>
            <SectionHead icon="drop-outline" tone="fertile" title={t('cervical_mucus')} />
            <SingleChips options={MUCUS} value={log.mucus} onChange={setters.mucus} tone="fertile" />
          </FadeIn>
          <FadeIn index={2}>
            <DecimalField icon="thermometer" tone="warning" label={t('bbt_temperature')} hint={t('bbt_hint')}
              value={log.bbt} placeholder={t('trk_bbt_placeholder')} range={BBT_RANGE} onCommit={setters.bbt} />
          </FadeIn>
          <FadeIn index={3}>
            <DecimalField icon="scale" tone="success" label={t('weight')}
              value={log.weight} placeholder={t('trk_weight_placeholder')} range={WEIGHT_RANGE} onCommit={setters.weight} />
          </FadeIn>
          <FadeIn index={4} style={styles.field}>
            <SectionHead icon="test" tone="info" title={t('pregnancy_test')} />
            <SingleChips options={PREGNANCY_TEST} value={log.pregnancyTest} onChange={setters.pregnancyTest} tone="info" />
          </FadeIn>
          <FadeIn index={5} style={styles.field}>
            <SectionHead icon="intimacy" tone="period" title={t('intimacy')} />
            <SingleChips options={INTIMACY} value={log.intimacy} onChange={setters.intimacy} tone="period" />
          </FadeIn>
          <FadeIn index={6}><NotesField value={log.notes} onCommit={setters.notes} /></FadeIn>
        </View>
      ) : null}
    </Card>
  )
})

// ── Log view ────────────────────────────────────────────────────────────
// Mount with key={date}: local text state and pending debounced saves are per date.
const LogView = ({ date, onSaved, navigation }) => {
  const app = useApp()
  const { t } = useLanguage()
  const raw = app.dailyLogs?.[date]
  const log = raw && typeof raw === 'object' ? raw : EMPTY_LOG

  // Latest log incl. writes not yet rendered, so fast taps compose.
  const latest = useRef(log)
  latest.current = log

  const saveLog = app.saveLog
  const update = useCallback((partialOrFn) => {
    try {
      const cur = latest.current || {}
      const partial = typeof partialOrFn === 'function' ? partialOrFn(cur) : partialOrFn
      if (!partial || typeof partial !== 'object') return
      latest.current = { ...cur, ...partial }
      Promise.resolve(saveLog(date, partial))
        .then(() => onSaved?.())
        .catch((e) => console.warn('Track: save failed', e))
    } catch (e) {
      console.warn('Track: update failed', e)
    }
  }, [date, saveLog, onSaved])

  const onFlow = useCallback((v) => update({ flow: v }), [update])
  const onMood = useCallback((id) => update((cur) => ({ moods: toggleInList(cur.moods, id) })), [update])
  const onSymptom = useCallback((id) => update((cur) => ({ symptomsDetailed: toggleInList(cur.symptomsDetailed, id) })), [update])
  const onWater = useCallback((n) => update({ water: n }), [update])
  const onMore = useCallback(() => navigation?.navigate?.('SymptomPicker', { date }), [navigation, date])

  // Hint when a period is expected/late on this day but no bleeding is logged.
  const { cycleState, getDayInfo, today } = app
  const flow = typeof log.flow === 'string' ? log.flow : null
  const hint = useMemo(() => {
    if (flow && flow !== 'none') return null
    try {
      if (date === today && cycleState?.isLate && cycleState.daysLate > 0) {
        return tp(t, 'trk_late_hint', cycleState.daysLate)
      }
      const info = getDayInfo?.(date)
      if (info?.isPredictedPeriod || info?.isLateWindow) return t('trk_period_expected')
    } catch { /* ignore */ }
    return null
  }, [flow, date, today, cycleState, getDayInfo, t])

  const moods = asList(log.moods)
  const symptoms = asList(log.symptomsDetailed)
  const water = Math.max(0, Math.min(30, Math.round(asNumber(log.water) || 0)))

  return (
    <View style={{ gap: 12 }}>
      <FadeIn index={0}><PeriodSection flow={flow} hint={hint} onChange={onFlow} /></FadeIn>
      <FadeIn index={1}>
        <Card>
          <SectionHead icon="smile" tone="primary" title={t('mood')} />
          <MultiChips options={MOODS} values={moods} onToggle={onMood} />
        </Card>
      </FadeIn>
      <FadeIn index={2}><SymptomSection selected={symptoms} onToggle={onSymptom} onMore={onMore} /></FadeIn>
      <FadeIn index={3}><WaterSection water={water} onChange={onWater} /></FadeIn>
      <FadeIn index={4}><MoreSection log={log} update={update} /></FadeIn>
    </View>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: RADIUS.md, marginBottom: 12 },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 14, minHeight: 48, borderRadius: RADIUS.md, borderWidth: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
  glasses: { flexDirection: 'row', justifyContent: 'space-between' },
  glass: { borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 12 },
  field: { marginTop: 18 },
  moreHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: -12 },
  input: { borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 48 },
  notes: { minHeight: 96 },
})

export default memo(LogView)
