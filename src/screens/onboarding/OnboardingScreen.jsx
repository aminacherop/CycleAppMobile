import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, KeyboardAvoidingView, Platform, BackHandler, Keyboard, useWindowDimensions, StyleSheet, I18nManager,
} from 'react-native'
import Animated, { SlideInRight, SlideOutLeft, SlideInLeft, SlideOutRight, FadeIn as RFadeIn, FadeOut as RFadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import { saveData } from '../../utils/storage'
import { requestNotificationPermission } from '../../utils/notifications'
import { todayISO } from '../../utils/dates'
import { successHaptic } from '../../utils/haptics'
import { TopBar } from './StepLayout'
import {
  WelcomeStep, NameStep, LastPeriodStep, PeriodLengthStep, CycleLengthStep, GoalStep, RemindersStep, DoneStep,
} from './Steps'

// Steps: 0 welcome · 1 name · 2 last period · 3 period length · 4 cycle length
//        5 goal · 6 reminders · 7 done. Steps 1–6 show "x of 6".
const QUESTION_STEPS = 6
const LAST_STEP = 7
const DEFAULT_PERIOD = 5
const DEFAULT_CYCLE = 28
const DURATION = 300

export default function OnboardingScreen() {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const app = useApp() || {}
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const today = app.today || todayISO()

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1) // 1 forward, -1 back
  const pendingStep = useRef(null)
  const [name, setName] = useState('')
  const [lastPeriod, setLastPeriod] = useState(null)
  const [periodLength, setPeriodLength] = useState(DEFAULT_PERIOD)
  const [cycleLength, setCycleLength] = useState(DEFAULT_CYCLE)
  const [goal, setGoal] = useState('track_period')
  const [remindersOn, setRemindersOn] = useState(false)
  const [remindBusy, setRemindBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rtlNote, setRtlNote] = useState(false)
  const [kbOpen, setKbOpen] = useState(false)
  const finishing = useRef(false)

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKbOpen(true))
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbOpen(false))
    return () => { show.remove(); hide.remove() }
  }, [])

  // Direction must be committed (so the outgoing page gets the right
  // `exiting` animation) before the step itself changes.
  const goTo = useCallback((target) => {
    const next = Math.max(0, Math.min(LAST_STEP, target))
    if (next === step) return
    Keyboard.dismiss()
    const d = next > step ? 1 : -1
    if (d !== dir) {
      pendingStep.current = next
      setDir(d)
    } else {
      setStep(next)
    }
  }, [step, dir])

  useEffect(() => {
    if (pendingStep.current != null) {
      const next = pendingStep.current
      pendingStep.current = null
      setStep(next)
    }
  }, [dir])

  const next = useCallback(() => goTo(step + 1), [goTo, step])
  const back = useCallback(() => { if (!saving) goTo(step - 1) }, [goTo, step, saving])

  // Android hardware back → previous step (exit only from the welcome page).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) {
        back()
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [step, back])

  const finish = useCallback(async ({ skipAll = false } = {}) => {
    if (finishing.current) return
    finishing.current = true
    setSaving(true)
    const trimmed = name.trim()
    const lps = skipAll ? null : lastPeriod
    try {
      if (!skipAll) {
        try { await saveData('user_goal', goal) } catch (e) { console.warn('Saving goal failed', e) }
        // Written before onboarding completes so the main screens see it on first mount.
        if (goal === 'pregnancy' && lps && typeof app.startPregnancyMode === 'function') {
          try { await app.startPregnancyMode(lps) } catch (e) { console.warn('Pregnancy mode failed', e) }
        }
      }
      successHaptic()
      await app.completeOnboarding?.({
        profile: skipAll || !trimmed ? {} : { name: trimmed },
        cycleSettings: {
          cycleLength: skipAll ? DEFAULT_CYCLE : cycleLength,
          periodLength: skipAll ? DEFAULT_PERIOD : periodLength,
          lastPeriodStart: lps,
        },
      })
    } catch (err) {
      // completeOnboarding flips isOnboarded before persisting, so the user is
      // already let in; only allow a retry if we're somehow still here.
      console.warn('Completing onboarding failed', err)
      finishing.current = false
      setSaving(false)
    }
  }, [name, lastPeriod, goal, cycleLength, periodLength, app.completeOnboarding, app.startPregnancyMode])

  const enableReminders = useCallback(async () => {
    if (remindBusy) return
    setRemindBusy(true)
    let granted = false
    try { granted = !!(await requestNotificationPermission()) } catch (e) { granted = false }
    if (granted) {
      const wantsFertile = goal === 'conceive'
      try {
        await app.updateNotificationPrefs?.({
          enabled: true,
          periodReminder: true,
          periodDaysBefore: 2,
          lateReminder: true,
          fertileReminder: wantsFertile,
          ovulationReminder: wantsFertile,
          time: { hour: 9, minute: 0 },
        })
        setRemindersOn(true)
      } catch (e) {
        console.warn('Saving reminder prefs failed', e)
      }
    }
    setRemindBusy(false)
    goTo(LAST_STEP)
  }, [remindBusy, goal, app.updateNotificationPrefs, goTo])

  const gutter = width >= 600 ? 32 : 20
  const bottomPad = kbOpen ? 12 : Math.max(insets.bottom, 12) + 8
  const layout = useMemo(() => ({ gutter, bottomPad }), [gutter, bottomPad])

  const rtl = I18nManager.isRTL
  const forward = dir > 0
  // In RTL "forward" visually moves the other way.
  const enter = (forward !== rtl ? SlideInRight : SlideInLeft).duration(DURATION)
  const exit = (forward !== rtl ? SlideOutLeft : SlideOutRight).duration(DURATION)

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <WelcomeStep
            layout={layout}
            onStart={next}
            onSkip={() => finish({ skipAll: true })}
            rtlNote={rtlNote}
            onRtlFlip={() => setRtlNote(true)}
            busy={saving}
          />
        )
      case 1:
        return <NameStep layout={layout} name={name} setName={setName} onNext={next} />
      case 2:
        return (
          <LastPeriodStep
            layout={layout}
            value={lastPeriod}
            setValue={setLastPeriod}
            today={today}
            onNext={next}
            onSkip={() => { setLastPeriod(null); next() }}
          />
        )
      case 3:
        return (
          <PeriodLengthStep
            layout={layout}
            value={periodLength}
            setValue={setPeriodLength}
            onNext={next}
            onSkip={() => { setPeriodLength(DEFAULT_PERIOD); next() }}
          />
        )
      case 4:
        return (
          <CycleLengthStep
            layout={layout}
            value={cycleLength}
            setValue={setCycleLength}
            onNext={next}
            onSkip={() => { setCycleLength(DEFAULT_CYCLE); next() }}
          />
        )
      case 5:
        return <GoalStep layout={layout} value={goal} setValue={setGoal} onNext={next} />
      case 6:
        return (
          <RemindersStep
            layout={layout}
            busy={remindBusy}
            onEnable={enableReminders}
            onSkip={() => goTo(LAST_STEP)}
          />
        )
      default:
        return (
          <DoneStep
            layout={layout}
            name={name}
            lastPeriodStart={lastPeriod}
            cycleLength={cycleLength}
            periodLength={periodLength}
            today={today}
            remindersOn={remindersOn}
            busy={saving}
            onFinish={() => finish()}
          />
        )
    }
  }

  const showTopBar = step >= 1 && step <= QUESTION_STEPS

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior="padding"
      // App.js pads the root by the status-bar inset, so this view's frame
      // starts that far down the screen; offset by it so the button clears the keyboard.
      keyboardVerticalOffset={insets.top + 8}
      // Only pad while the keyboard is up; otherwise the offset leaves a gap.
      enabled={kbOpen}
    >
      <View style={[styles.inner, { maxWidth: 560 }]}>
        {showTopBar ? (
          <Animated.View entering={RFadeIn.duration(200)} exiting={RFadeOut.duration(150)}>
            <TopBar
              index={step}
              total={QUESTION_STEPS}
              onBack={back}
              gutter={gutter}
              backLabel={t('back')}
              label={t('ob_step_of', { n: step, total: QUESTION_STEPS })}
            />
          </Animated.View>
        ) : null}
        <View style={styles.pages}>
          <Animated.View key={step} entering={enter} exiting={exit} style={StyleSheet.absoluteFill}>
            {renderStep()}
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  inner: { flex: 1, width: '100%', alignSelf: 'center' },
  pages: { flex: 1, overflow: 'hidden' },
})
