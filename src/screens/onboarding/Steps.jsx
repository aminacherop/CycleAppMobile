import { memo, useEffect, useMemo, useRef } from 'react'
import { View, TextInput, StyleSheet, useWindowDimensions } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { AppText, Card, IconBadge, Icon, Tap, WheelPicker, FadeIn } from '../../components/ui'
import { GOALS } from '../../constants/logOptions'
import { formatDate } from '../../utils/dates'
import { RADIUS } from '../../theme/palette'
import { StepLayout } from './StepLayout'
import LanguagePill from './LanguageSheet'
import MonthCalendar from './MonthCalendar'
import { buildOnboardingSummary } from './summary'

const PERIOD_VALUES = Array.from({ length: 9 }, (_, i) => i + 2) // 2..10
const CYCLE_VALUES = Array.from({ length: 26 }, (_, i) => i + 20) // 20..45

// ── 1. Welcome ─────────────────────────────────────────────────────────
export const WelcomeStep = memo(({ layout, onStart, onSkip, rtlNote, onRtlFlip, busy }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const { height } = useWindowDimensions()
  const short = height < 700
  const hero = short ? 84 : 112
  const values = [
    { icon: 'sparkle', tone: 'primary', title: t('ob_val_predict_title'), desc: t('ob_val_predict_desc') },
    { icon: 'lock', tone: 'fertile', title: t('ob_val_private_title'), desc: t('ob_val_private_desc') },
    { icon: 'bell', tone: 'ovulation', title: t('ob_val_remind_title'), desc: t('ob_val_remind_desc') },
  ]
  return (
    <StepLayout
      {...layout}
      top={
        <View style={styles.welcomeTop}>
          <LanguagePill onRestartNeeded={onRtlFlip} />
        </View>
      }
      primary={{ title: t('ob_get_started'), onPress: onStart, disabled: busy }}
      secondary={{ title: t('ob_skip_all'), onPress: onSkip, disabled: busy }}
    >
      <View style={{ alignItems: 'center', marginTop: short ? 0 : 8 }}>
        <View style={[styles.heroOuter, { width: hero + 28, height: hero + 28, borderRadius: (hero + 28) / 2, backgroundColor: colors.primarySoft }]}>
          <View style={[styles.heroInner, { width: hero, height: hero, borderRadius: hero / 2, backgroundColor: colors.primarySoft2 }]}>
            <Icon name="flower" size={hero * 0.5} color={colors.primary} />
          </View>
        </View>
        <AppText variant="title" center style={{ fontSize: short ? 25 : 28, lineHeight: short ? 31 : 35, marginTop: short ? 14 : 20 }}>
          {t('ob_welcome_title')}
        </AppText>
        <AppText variant="body" muted center style={{ marginTop: 6, fontSize: 16, lineHeight: 22, maxWidth: 340 }}>
          {t('ob_welcome_sub')}
        </AppText>
      </View>
      <View style={{ marginTop: short ? 16 : 26, gap: short ? 12 : 16 }}>
        {values.map((v, i) => (
          <FadeIn key={v.icon} index={i + 1} style={styles.valueRow}>
            <IconBadge name={v.icon} tone={v.tone} size={42} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="bodyStrong">{v.title}</AppText>
              <AppText variant="caption" muted style={{ marginTop: 1 }}>{v.desc}</AppText>
            </View>
          </FadeIn>
        ))}
      </View>
      {rtlNote ? (
        <View style={[styles.note, { backgroundColor: colors.infoSoft }]}>
          <Icon name="info" size={18} color={colors.info} />
          <AppText variant="caption" color={colors.info} style={{ flex: 1, fontWeight: '600' }}>{t('ob_rtl_note')}</AppText>
        </View>
      ) : null}
    </StepLayout>
  )
})

// ── 2. Name ────────────────────────────────────────────────────────────
export const NameStep = memo(({ layout, name, setName, onNext }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const ref = useRef(null)
  const valid = name.trim().length > 0
  useEffect(() => {
    // Wait for the page transition before raising the keyboard.
    const id = setTimeout(() => ref.current?.focus?.(), 380)
    return () => clearTimeout(id)
  }, [])
  return (
    <StepLayout
      {...layout}
      title={t('ob_name_title')}
      subtitle={t('ob_name_sub')}
      primary={{ title: t('continue'), onPress: onNext, disabled: !valid }}
    >
      <TextInput
        ref={ref}
        value={name}
        onChangeText={setName}
        placeholder={t('name_placeholder')}
        placeholderTextColor={colors.textFaint}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => { if (valid) onNext() }}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={40}
        maxFontSizeMultiplier={1.35}
        accessibilityLabel={t('ob_name_title')}
        selectionColor={colors.primary}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.surface, borderColor: valid ? colors.primary : colors.border },
        ]}
      />
    </StepLayout>
  )
})

// ── 3. Last period start ───────────────────────────────────────────────
export const LastPeriodStep = memo(({ layout, value, setValue, today, onNext, onSkip }) => {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const { width, height } = useWindowDimensions()
  const inner = Math.min(width, 560) - layout.gutter * 2 - 24
  return (
    <StepLayout
      {...layout}
      title={t('ob_last_title')}
      subtitle={t('ob_last_sub')}
      primary={{ title: t('continue'), onPress: onNext, disabled: !value }}
      secondary={{ title: t('ob_dont_remember'), onPress: onSkip }}
    >
      <Card style={{ padding: 12 }}>
        <MonthCalendar value={value} onChange={setValue} today={today} width={inner} compact={height < 720} />
      </Card>
      <View style={[styles.chosen, { backgroundColor: value ? colors.periodSoft : colors.surfaceAlt }]}>
        <Icon name={value ? 'drop' : 'calendar'} size={18} color={value ? colors.period : colors.textMuted} />
        <AppText variant="bodyStrong" color={value ? colors.text : colors.textMuted} style={{ flex: 1 }} numberOfLines={2}>
          {value ? formatDate(value, 'dddd, MMMM D', language) : t('ob_last_pick')}
        </AppText>
      </View>
    </StepLayout>
  )
})

// ── 4/5. Wheel steps ───────────────────────────────────────────────────
const WheelStep = ({ layout, title, subtitle, values, value, setValue, onNext, skipLabel, onSkip }) => {
  const { t } = useLanguage()
  return (
    <StepLayout
      {...layout}
      title={title}
      subtitle={subtitle}
      centerBody
      primary={{ title: t('continue'), onPress: onNext }}
      secondary={{ title: skipLabel, onPress: onSkip }}
    >
      <WheelPicker
        values={values}
        value={value}
        onChange={setValue}
        format={(v) => t('ob_n_days', { n: v })}
        accessibilityLabel={title}
      />
    </StepLayout>
  )
}

export const PeriodLengthStep = memo(({ layout, value, setValue, onNext, onSkip }) => {
  const { t } = useLanguage()
  return (
    <WheelStep
      layout={layout}
      title={t('ob_period_title')}
      subtitle={t('ob_period_sub')}
      values={PERIOD_VALUES}
      value={value}
      setValue={setValue}
      onNext={onNext}
      skipLabel={t('ob_period_skip')}
      onSkip={onSkip}
    />
  )
})

export const CycleLengthStep = memo(({ layout, value, setValue, onNext, onSkip }) => {
  const { t } = useLanguage()
  return (
    <WheelStep
      layout={layout}
      title={t('ob_cycle_title')}
      subtitle={t('ob_cycle_sub')}
      values={CYCLE_VALUES}
      value={value}
      setValue={setValue}
      onNext={onNext}
      skipLabel={t('ob_cycle_skip')}
      onSkip={onSkip}
    />
  )
})

// ── 6. Goal ────────────────────────────────────────────────────────────
const GOAL_META = {
  track_period: { tone: 'period', descKey: 'ob_goal_track_desc' },
  conceive: { tone: 'fertile', descKey: 'ob_goal_conceive_desc' },
  pregnancy: { tone: 'ovulation', descKey: 'ob_goal_pregnancy_desc' },
}

export const GoalStep = memo(({ layout, value, setValue, onNext }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const goals = Array.isArray(GOALS) ? GOALS : []
  return (
    <StepLayout
      {...layout}
      title={t('ob_goal_title')}
      subtitle={t('ob_goal_sub')}
      primary={{ title: t('continue'), onPress: onNext }}
    >
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {goals.map((g, i) => {
          const meta = GOAL_META[g.id] || { tone: 'primary' }
          const on = value === g.id
          const fg = colors[meta.tone] || colors.primary
          return (
            <FadeIn key={g.id} index={i}>
              <Tap
                onPress={() => setValue(g.id)}
                haptic
                scaleTo={0.98}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t(g.labelKey)}
                style={[
                  styles.goal,
                  { borderColor: on ? fg : colors.border, backgroundColor: on ? colors[`${meta.tone}Soft`] || colors.primarySoft : colors.surface },
                ]}
              >
                <IconBadge name={g.icon} tone={meta.tone} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="heading" style={{ fontSize: 17 }}>{t(g.labelKey)}</AppText>
                  {meta.descKey ? <AppText variant="caption" muted style={{ marginTop: 2 }}>{t(meta.descKey)}</AppText> : null}
                </View>
                <View style={[styles.radio, { borderColor: on ? fg : colors.border, backgroundColor: on ? fg : 'transparent' }]}>
                  {on ? <Icon name="check" size={14} color={colors.onPrimary} /> : null}
                </View>
              </Tap>
            </FadeIn>
          )
        })}
      </View>
    </StepLayout>
  )
})

// ── 7. Reminders ───────────────────────────────────────────────────────
export const RemindersStep = memo(({ layout, onEnable, onSkip, busy }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  return (
    <StepLayout
      {...layout}
      centerBody
      primary={{ title: t('ob_remind_on'), onPress: onEnable, loading: busy, icon: 'bell' }}
      secondary={{ title: t('ob_not_now'), onPress: onSkip, disabled: busy }}
    >
      <View style={{ alignItems: 'center' }}>
        <View style={[styles.heroOuter, { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primarySoft }]}>
          <Icon name="bell" size={52} color={colors.primary} />
        </View>
        <AppText variant="title" center style={{ fontSize: 26, lineHeight: 33, marginTop: 20 }}>{t('ob_remind_title')}</AppText>
        <AppText variant="body" muted center style={{ marginTop: 8, fontSize: 16, lineHeight: 23, maxWidth: 360 }}>
          {t('ob_remind_sub')}
        </AppText>
      </View>
      <FadeIn index={2} style={{ marginTop: 26 }}>
        <Card style={styles.preview}>
          <IconBadge name="drop" tone="period" size={38} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="small" faint>My Cycle</AppText>
            <AppText variant="bodyStrong" style={{ marginTop: 2 }}>{t('ob_remind_preview')}</AppText>
          </View>
        </Card>
      </FadeIn>
    </StepLayout>
  )
})

// ── 8. Done ────────────────────────────────────────────────────────────
export const DoneStep = memo(({ layout, name, lastPeriodStart, cycleLength, periodLength, today, remindersOn, onFinish, busy }) => {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const summary = useMemo(
    () => buildOnboardingSummary({ lastPeriodStart, cycleLength, periodLength, today }),
    [lastPeriodStart, cycleLength, periodLength, today],
  )
  const trimmed = (name || '').trim()
  const fmt = (d) => formatDate(d, 'ddd, MMM D', language)
  const range = (a, b) => `${formatDate(a, 'MMM D', language)} – ${formatDate(b, 'MMM D', language)}`

  const Row = ({ icon, tone, label, value }) => (
    <View style={styles.sumRow}>
      <IconBadge name={icon} tone={tone} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        {label ? <AppText variant="caption" muted>{label}</AppText> : null}
        <AppText variant="bodyStrong" style={{ fontSize: 16, marginTop: label ? 1 : 0 }}>{value}</AppText>
      </View>
    </View>
  )

  return (
    <StepLayout
      {...layout}
      primary={{ title: t('ob_lets_go'), onPress: onFinish, loading: busy }}
    >
      <View style={{ alignItems: 'center', marginTop: 12 }}>
        <View style={[styles.heroOuter, { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.successSoft }]}>
          <Icon name="check" size={48} color={colors.success} />
        </View>
        <AppText variant="title" center style={{ fontSize: 27, lineHeight: 34, marginTop: 18 }}>
          {trimmed ? t('ob_done_title', { name: trimmed }) : t('ob_done_title_plain')}
        </AppText>
        <AppText variant="body" muted center style={{ marginTop: 6, fontSize: 16, lineHeight: 22 }}>{t('ob_done_sub')}</AppText>
      </View>
      <FadeIn index={1} style={{ marginTop: 24 }}>
        <Card style={{ gap: 14 }}>
          {summary.hasData && !summary.isLate ? (
            <>
              <Row icon="drop" tone="period" label={t('next_period')} value={fmt(summary.nextPeriodStart)} />
              {summary.fertileStart && summary.fertileEnd ? (
                <Row icon="leaf" tone="fertile" label={t('ob_fertile_window')} value={range(summary.fertileStart, summary.fertileEnd)} />
              ) : null}
            </>
          ) : (
            <Row
              icon="calendar"
              tone="primary"
              value={summary.hasData ? t('ob_done_late') : t('ob_done_no_data')}
            />
          )}
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
          <Row icon="history" tone="info" value={t('ob_cycle_summary', { c: cycleLength, p: periodLength })} />
          {remindersOn ? <Row icon="bell" tone="ovulation" value={t('ob_reminders_on')} /> : null}
        </Card>
      </FadeIn>
    </StepLayout>
  )
})

const styles = StyleSheet.create({
  welcomeTop: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  heroOuter: { alignItems: 'center', justifyContent: 'center' },
  heroInner: { alignItems: 'center', justifyContent: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: RADIUS.md, marginTop: 18 },
  input: {
    height: 60, borderRadius: RADIUS.lg, borderWidth: 1.5, paddingHorizontal: 18, fontSize: 20, fontWeight: '600',
  },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: RADIUS.md, marginTop: 12 },
  goal: {
    flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderRadius: RADIUS.lg,
    padding: 16, minHeight: 84,
  },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sep: { height: StyleSheet.hairlineWidth },
})
