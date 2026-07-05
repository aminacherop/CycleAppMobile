import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  AppState,
  Animated,
  Modal,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Svg, { Circle } from 'react-native-svg'
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
import dayjs from 'dayjs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { getUnreadNotificationCount } from '../utils/notifications'
import { getSmartPredictions } from '../utils/cyclePrediction'
import { getDailyInsight } from '../utils/dailyInsights'
import { AdBanner } from '../ads'

const Dashboard = ({ cycleSettings, setCycleSettings, updateCycleSettings, userProfile, todayLog, saveLog, dailyLogs, navigation }) => {
  const { colors, isDark, changeTheme } = useTheme()
  const insets = useSafeAreaInsets()
  const [unreadCount, setUnreadCount] = useState(0)
  const welcomeOpacity = useRef(new Animated.Value(0)).current
  const welcomeTranslateY = useRef(new Animated.Value(-16)).current
  const ringProgress = useRef(new Animated.Value(0)).current
  const countScale = useRef(new Animated.Value(0.7)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const [displayedName, setDisplayedName] = useState('')
  const nameOpacity = useRef(new Animated.Value(0)).current
  const nameTranslateY = useRef(new Animated.Value(10)).current

  useEffect(() => {
    // Typewriter name animation
    if (name) {
      let i = 0
      const interval = setInterval(() => {
        i++
        setDisplayedName(name.slice(0, i))
        if (i >= name.length) {
          clearInterval(interval)
          Animated.parallel([
            Animated.timing(nameOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(nameTranslateY, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
          ]).start()
        }
      }, 80)
    }

    // Pulse animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start()

    Animated.parallel([
      Animated.timing(ringProgress, { toValue: 1, duration: 1400, delay: 200, useNativeDriver: false }),
      Animated.spring(countScale, { toValue: 1, tension: 60, friction: 8, delay: 400, useNativeDriver: true }),
      Animated.timing(welcomeOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(welcomeTranslateY, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  useFocusEffect(
    useCallback(() => {
      const checkUnread = async () => {
        const count = await getUnreadNotificationCount()
        setUnreadCount(count)
      }
      checkUnread()
    }, [])
  )

  useEffect(() => {
    const checkUnread = async () => {
      const count = await getUnreadNotificationCount()
      setUnreadCount(count)
    }
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkUnread()
      }
    })
    return () => subscription.remove()
  }, [])

  const { t } = useLanguage()
  const [selectedMood, setSelectedMood] = useState(null)
  const [tipOffset, setTipOffset] = useState(0)
  const [showPeriodSheet, setShowPeriodSheet] = useState(false)
  const [showPeriodEndSheet, setShowPeriodEndSheet] = useState(false)

  const name = userProfile?.name || ''

  const smartPrediction = getSmartPredictions(dailyLogs, cycleSettings)
  const cycleLength = smartPrediction.effectiveCycleLength
  const periodLength = cycleSettings?.periodLength || 5
  const rawLutealLength = cycleSettings?.lutealLength || 14
  const lastPeriodStart = cycleSettings?.lastPeriodStart ||
    dayjs().subtract(14, 'day').format('YYYY-MM-DD')

  const lpsDate = dayjs(lastPeriodStart)
  const todayDate = dayjs()
  const currentCycleDay = Math.max(1, todayDate.diff(lpsDate, 'day') + 1)

  // Clamp luteal length so it can never push ovulation day before
  // the period ends, or past the end of the cycle. Ovulation day
  // (cycleLength - lutealLength) must land strictly after periodLength
  // and strictly before cycleLength.
  const minLuteal = 1
  const maxLuteal = Math.max(minLuteal, cycleLength - periodLength - 1)
  const lutealLength = Math.min(Math.max(rawLutealLength, minLuteal), maxLuteal)

  const ovulationDayOfCycle = cycleLength - lutealLength

  let nextPeriodDate = lpsDate.add(cycleLength, 'day')
  while (nextPeriodDate.isBefore(todayDate, 'day')) {
    nextPeriodDate = nextPeriodDate.add(cycleLength, 'day')
  }
  const daysUntilPeriod = nextPeriodDate.diff(todayDate, 'day')

  // Calculate if period is late (currentCycleDay > cycleLength)
  const daysLate = currentCycleDay > cycleLength ? currentCycleDay - cycleLength : 0

  // Period ended = was in period window but no longer (day > periodLength)
  const justEndedPeriod = currentCycleDay === periodLength + 1

  // Has no real data (using default date)
  const hasNoData = !cycleSettings?.lastPeriodStart

  let ovulationDate = lpsDate.add(ovulationDayOfCycle, 'day')
  while (ovulationDate.isBefore(todayDate, 'day')) {
    ovulationDate = ovulationDate.add(cycleLength, 'day')
  }
  const daysUntilOvulation = ovulationDate.diff(todayDate, 'day')

  // Fertile window: up to 5 days before ovulation through ovulation day,
  // but never earlier than the day right after the period ends.
  const earliestFertileDay = periodLength + 1
  const fertileStartDayOfCycle = Math.max(earliestFertileDay, ovulationDayOfCycle - 5)
  const fertileStart = ovulationDate.subtract(ovulationDayOfCycle - fertileStartDayOfCycle, 'day')

  // Phase boundaries derived from the same clamped ovulation day, so
  // Follicular/Ovulation/Luteal always have at least 1 day each and
  // never overlap Menstrual, regardless of cycle length.
  const ovulationWindowStart = Math.max(periodLength + 1, ovulationDayOfCycle - 2)
  const ovulationWindowEnd = Math.min(cycleLength - 1, ovulationDayOfCycle + 2)

  const currentPhase =
    currentCycleDay <= periodLength ? 'Menstrual' :
    currentCycleDay < ovulationWindowStart ? 'Follicular' :
    currentCycleDay <= ovulationWindowEnd ? 'Ovulation' : 'Luteal'

  const phaseInfo = {
    Menstrual: { color: '#EC4899', bg: '#FCE7F3', emoji: '🌸', tip: t('phase_tip_menstrual') },
    Follicular: { color: '#7C3AED', bg: '#EDE9FE', emoji: '🌱', tip: t('phase_tip_follicular') },
    Ovulation: { color: '#F59E0B', bg: '#FEF3C7', emoji: '✨', tip: t('phase_tip_ovulation') },
    Luteal: { color: '#10B981', bg: '#D1FAE5', emoji: '🍂', tip: t('phase_tip_luteal') },
  }

  const phase = phaseInfo[currentPhase]
  const dailyInsight = getDailyInsight(currentPhase, tipOffset)
  const progress = Math.min(100, (currentCycleDay / cycleLength) * 100)

  const moods = [
    { id: 'good', label: t('mood_good'), emoji: '😊' },
    { id: 'tired', label: t('mood_tired'), emoji: '😴' },
    { id: 'cramps', label: t('mood_cramps'), emoji: '😣' },
    { id: 'moody', label: t('mood_moody'), emoji: '😤' },
    { id: 'nausea', label: t('mood_nausea'), emoji: '🤢' },
    { id: 'energetic', label: t('mood_energetic'), emoji: '💪' },
  ]

  // Ring calculations
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const statCards = [
    {
      label: t('cycle_day_label'),
      value: currentCycleDay,
      ring: true,
      bg: colors.background,
    },
    {
      label: t('next_period'),
      date: nextPeriodDate.format('MMM D'),
      icon: '💧',
      bg: '#FCE7F3',
      iconBg: '#EC4899',
      goToCalendar: true,
    },
    {
      label: t('fertile_window'),
      date: fertileStart.format('MMM D'),
      icon: '🌱',
      bg: '#FEF3C7',
      iconBg: '#F59E0B',
      goToCalendar: true,
    },
    {
      label: t('ovulation'),
      date: ovulationDate.format('MMM D'),
      icon: '✨',
      bg: '#EDE9FE',
      iconBg: '#7C3AED',
      goToCalendar: true,
    },
  ]

  const styles = makeStyles(colors)

  return (
    <>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation?.navigate('Profile')}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
            onPress={() => changeTheme(isDark ? 'light' : 'dark')}
          >
            <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation?.navigate('Notifications')}
            style={{ position: 'relative' }}
          >
            <Text style={{ fontSize: 22 }}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Big countdown header */}
      <Animated.View
        style={[
          styles.countdownWrap,
          {
            opacity: welcomeOpacity,
            transform: [{ translateY: welcomeTranslateY }],
          },
        ]}
      >
        {/* Greeting */}
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <Animated.Text style={[
            styles.greetingText,
            {
              color: colors.textPrimary,
              fontSize: 24,
              fontWeight: '800',
              opacity: name ? nameOpacity : welcomeOpacity,
              transform: [{ translateY: name ? nameTranslateY : welcomeTranslateY }],
            }
          ]}>
            {name ? `Hi, ${displayedName || ''}${displayedName.length < name.length ? '|' : ' 👋'}` : '👋'}
          </Animated.Text>
          <Animated.Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2, opacity: welcomeOpacity }}>
            {phase.emoji} {t('phase_' + currentPhase.toLowerCase())} {t('phase_word')} · {t('day_label')} {currentCycleDay}
          </Animated.Text>
        </View>

        {/* Large animated ring card */}
        <Animated.View style={[
          styles.heroCard,
          { backgroundColor: phase.bg, transform: [{ scale: pulseAnim }] }
        ]}>
          {/* SVG Ring */}
          <View style={styles.heroRingWrap}>
            {(() => {
              const R = 90
              const circ = 2 * Math.PI * R
              const cycleProgress = Math.min(1, currentCycleDay / cycleLength)
              const animatedDash = ringProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, cycleProgress * circ],
              })
              return (
                <Svg width={220} height={220} style={{ position: 'absolute' }}>
                  {/* Background track */}
                  <Circle
                    cx="110" cy="110" r={R}
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={14}
                  />
                  {/* Animated progress arc */}
                  <AnimatedCircle
                    cx="110" cy="110" r={R}
                    fill="none"
                    stroke={phase.color}
                    strokeWidth={14}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={animatedDash.interpolate
                      ? animatedDash.interpolate({ inputRange: [0, circ], outputRange: [circ, 0] })
                      : circ - cycleProgress * circ
                    }
                    rotation="-90"
                    origin="110, 110"
                  />
                </Svg>
              )
            })()}

            {/* Center content */}
            <Animated.View style={[styles.heroCenter, { transform: [{ scale: countScale }] }]}>
              <Text style={[styles.heroDaysNum, { color: phase.color }]}>
                {daysUntilPeriod === 0 ? '🌸' : daysUntilPeriod}
              </Text>
              <Text style={[styles.heroDaysLabel, { color: colors.textSecondary }]}>
                {daysUntilPeriod === 0 ? t('today') : t('days_left') || 'days left'}
              </Text>
              <Text style={[styles.heroPhaseLabel, { color: phase.color }]}>
                {phase.emoji} {currentPhase}
              </Text>
            </Animated.View>
          </View>

          {/* Date subtitle */}
          <Text style={[styles.countdownSub, { color: colors.textSecondary, marginBottom: 4 }]}>
            {lpsDate.format('MMM D')} → {nextPeriodDate.format('MMM D')}
          </Text>
        </Animated.View>
        {smartPrediction.source === 'learned' && (
          <Text style={{ fontSize: 11, color: colors.pink, fontWeight: '600', textAlign: 'center', marginTop: -10, marginBottom: 14 }}>
            {t('learned_from_cycles', { count: smartPrediction.cyclesAnalyzed })}
          </Text>
        )}

        {(() => {
          const isPeriodActive = currentCycleDay <= periodLength
          const isComingSoon = daysUntilPeriod <= 3 && daysUntilPeriod > 0

          const logPeriodStart = () => setShowPeriodSheet(true)

          // NO START DATE — late period warning
          if (hasNoData) {
            return (
              <TouchableOpacity
                style={[styles.periodStartBtn, { backgroundColor: '#EF4444' }]}
                onPress={logPeriodStart}
              >
                <Text style={styles.periodStartBtnText}>
                  ⚠️ {t('period_late') || 'Period late'} · {t('log_period_start')}
                </Text>
              </TouchableOpacity>
            )
          }

          // PERIOD ACTIVE — Days 1 to periodLength
          if (isPeriodActive) {
            const daysAgo = currentCycleDay - 1
            const daysAgoText =
              daysAgo === 0
                ? t('today')
                : daysAgo === 1
                ? (t('yesterday') || 'Yesterday')
                : daysAgo + ' ' + (t('days_ago_suffix') || 'days ago')

            // Last day of period — offer to confirm ended
            if (currentCycleDay >= periodLength) {
              return (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.periodStartBtn, { backgroundColor: '#10B981', flex: 1 }]}
                    onPress={() => setShowPeriodEndSheet(true)}
                  >
                    <Text style={styles.periodStartBtnText}>
                      {t('period_ended_today') || '✅ Period ended today?'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.periodStartBtn, { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, flex: 0.5 }]}
                    onPress={() => navigation?.navigate('PeriodPicker')}
                  >
                    <Text style={[styles.periodStartBtnText, { color: colors.textSecondary, fontSize: 13 }]}>
                      📅 {t('edit_date')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            }

            // Days 1 to periodLength-1 — info only
            return (
              <View style={[styles.periodStartBtn, { backgroundColor: colors.pinkLight, borderWidth: 1.5, borderColor: colors.pink }]}>
                <Text style={[styles.periodStartBtnText, { color: colors.pink }]}>
                  🩸 {t('period_started') || 'Period started'} {daysAgoText}
                </Text>
              </View>
            )
          }

          // CYCLE COMPLETE — time to log new period
          if (currentCycleDay >= cycleLength) {
            return (
              <TouchableOpacity
                style={[styles.periodStartBtn, { backgroundColor: colors.pink }]}
                onPress={logPeriodStart}
              >
                <Text style={styles.periodStartBtnText}>🩸 {t('log_period_start')}</Text>
              </TouchableOpacity>
            )
          }

          // LATE PERIOD — past expected date
          if (daysLate > 0) {
            return (
              <TouchableOpacity
                style={[styles.periodStartBtn, { backgroundColor: '#EF4444' }]}
                onPress={logPeriodStart}
              >
                <Text style={styles.periodStartBtnText}>
                  ⚠️ {daysLate}d {t('days_late') || 'days late'} · {t('log_period_start')}
                </Text>
              </TouchableOpacity>
            )
          }

          // COMING SOON — started early option
          if (isComingSoon) {
            return (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={[styles.periodStartBtn, { backgroundColor: colors.pink, flex: 1 }]}
                  onPress={logPeriodStart}
                >
                  <Text style={styles.periodStartBtnText}>🩸 {t('started_early') || 'Started early?'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodStartBtn, { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.pink, flex: 0.6 }]}
                  onPress={() => navigation?.navigate('PeriodPicker')}
                >
                  <Text style={[styles.periodStartBtnText, { color: colors.pink }]}>📅 {t('edit_date')}</Text>
                </TouchableOpacity>
              </View>
            )
          }

          // NORMAL TRACKING — log new period start
          return (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.periodStartBtn, { backgroundColor: colors.pink, flex: 1 }]}
                onPress={logPeriodStart}
              >
                <Text style={styles.periodStartBtnText}>🩸 {t('log_period_start')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodStartBtn, { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.pink, flex: 0.6 }]}
                onPress={() => navigation?.navigate('PeriodPicker')}
              >
                <Text style={[styles.periodStartBtnText, { color: colors.pink }]}>📅 {t('edit_date')}</Text>
              </TouchableOpacity>
            </View>
          )
        })()}
      </Animated.View>

      {/* Stat cards row — horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={{ gap: 10, paddingRight: 16 }}
      >
        {statCards.map((card, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={(card.isAction || card.goToCalendar || card.ring) ? 0.7 : 1}
            style={[styles.statCard, { backgroundColor: card.bg }]}
            onPress={() => {
              if (card.goToCalendar) navigation?.getParent()?.navigate('Calendar')
              if (card.ring) navigation?.navigate('CycleDayDetail')
            }}
          >
            {card.ring ? (
              <>
                <Text style={[styles.statCardLabel, { color: colors.pinkDark }]}>
                  {card.label}
                </Text>
                <View style={styles.ringWrap}>
                  <Svg width={76} height={76} viewBox="0 0 76 76">
                    <Circle
                      cx="38" cy="38" r={radius}
                      fill="none"
                      stroke={colors.border}
                      strokeWidth="6"
                    />
                    <Circle
                      cx="38" cy="38" r={radius}
                      fill="none"
                      stroke={colors.pink}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      transform="rotate(-90 38 38)"
                    />
                  </Svg>
                  <Text style={[styles.ringNumber, { color: colors.textPrimary }]}>
                    {card.value}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.statCardTitle, { color: colors.textPrimary }]}>
                  {card.date || ''}
                </Text>
                <Text style={[styles.statCardSubLabel, { color: colors.textSecondary }]}>
                  {card.sub || card.label}
                </Text>
                <View style={[styles.statCardIconWrap, { backgroundColor: card.iconBg }]}>
                  <Text style={{ fontSize: 16 }}>{card.icon}</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Period alert */}
      {daysUntilPeriod <= 5 && daysUntilPeriod > 0 && (
        <View style={[styles.alert, { backgroundColor: colors.pinkLight, borderColor: colors.pink }]}>
          <Text style={[styles.alertText, { color: colors.pinkDark }]}>
            🌸 {t('period_coming')} {daysUntilPeriod} {t('days')}
          </Text>
        </View>
      )}

      {daysUntilOvulation <= 2 && daysUntilOvulation >= 0 && currentPhase !== 'Menstrual' && (
        <View style={[styles.alertWarning, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <Text style={[styles.alertText, { color: '#92400E' }]}>
            ✨ {daysUntilOvulation === 0
              ? t('ovulation_today')
              : `${t('ovulation_soon')} ${daysUntilOvulation} ${t('days')}`}
          </Text>
        </View>
      )}

      {/* How are you feeling card */}
      <View style={[styles.feelingCard, { backgroundColor: colors.white }]}>
        <Text style={[styles.feelingTitle, { color: colors.textPrimary }]}>
          {t('how_feeling')}
        </Text>
        <Text style={[styles.feelingSub, { color: colors.textSecondary }]}>{t('add_body_analysis')}</Text>

        {selectedMood && (
          <View style={styles.moodGrid}>
            {moods.map(mood => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodBtn,
                  {
                    backgroundColor: selectedMood === mood.id ? phase.bg : colors.background,
                    borderColor: selectedMood === mood.id ? phase.color : colors.border,
                  },
                ]}
                onPress={() => setSelectedMood(selectedMood === mood.id ? null : mood.id)}
              >
                <Text style={[
                  styles.moodBtnText,
                  { color: selectedMood === mood.id ? phase.color : colors.textPrimary }
                ]}>
                  {mood.emoji} {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.addSymptomBtn, { backgroundColor: '#5B4FE5' }]}
          onPress={() => navigation?.navigate('AddSymptom')}
        >
          <Text style={styles.addSymptomBtnText}>{t('add_symptom_title')}</Text>
        </TouchableOpacity>
      </View>

      {/* Today's stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('todays_log')}
        </Text>
        <View style={styles.statsRow}>
          {[
            { icon: '💧', value: todayLog?.water ? `${todayLog.water}/8` : '—', label: t('glasses_water') },
            { icon: '😴', value: todayLog?.sleep ? `${todayLog.sleep}h` : '—', label: t('sleep') },
            { icon: '😊', value: todayLog?.moods?.length ? `${todayLog.moods.length}` : '—', label: t('mood') },
            { icon: '⚡', value: todayLog?.symptomsDetailed?.length ? `${todayLog.symptomsDetailed.length}` : '—', label: t('symptoms'), isSymptom: true },
          ].map((stat, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.smallStatCard, { backgroundColor: colors.white, borderColor: colors.border }]}
              onPress={() => stat.isSymptom ? navigation?.navigate('AddSymptom') : null}
              activeOpacity={stat.isSymptom ? 0.7 : 1}
            >
              <Text style={styles.statCardIcon}>{stat.icon}</Text>
              <Text style={[styles.smallStatValue, { color: colors.textPrimary }]}>{stat.value}</Text>
              <Text style={[styles.smallStatLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Phase tip */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('tip_for_phase')}
        </Text>
        <TouchableOpacity
          style={[styles.tipCard, { backgroundColor: colors.white, borderLeftColor: phase.color }]}
          onPress={() => setTipOffset(prev => prev + 1)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={[styles.tipTitle, { color: phase.color }]}>
              {phase.emoji} {t('phase_' + currentPhase.toLowerCase())} {t('phase_word')}
            </Text>
            <Text style={{ fontSize: 16, color: colors.textSecondary }}>↻</Text>
          </View>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            {dailyInsight ? `${dailyInsight.emoji} ${dailyInsight.text}` : phase.tip}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick shortcuts */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('quick_access')}
        </Text>
        <View style={styles.shortcutsWrap}>
          {[
            { icon: '📚', title: t('health_articles'), desc: t('articles_desc'), screen: 'Articles' },
            { icon: '💊', title: t('pills_supplements'), desc: t('medications_desc'), screen: 'Medications' },
            { icon: '🔔', title: t('reminders_label'), desc: t('reminders_desc'), screen: 'Notifications' },
          ].map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.shortcutCard, { backgroundColor: colors.white, borderColor: colors.border }]}
              onPress={() => navigation?.navigate(s.screen)}
            >
              <Text style={styles.shortcutIcon}>{s.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.shortcutTitle, { color: colors.textPrimary }]}>{s.title}</Text>
                <Text style={[styles.shortcutDesc, { color: colors.textSecondary }]}>{s.desc}</Text>
              </View>
              <Text style={[styles.shortcutArrow, { color: colors.pink }]}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <AdBanner />
    </ScrollView>

      {/* Period Start Bottom Sheet */}
      <Modal visible={showPeriodSheet} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPeriodSheet(false)} />
          <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 24 + insets.bottom }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>
              🩸 {t('when_period_start') || 'When did your period start?'}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
              {t('select_start_date') || 'Select the date your period began'}
            </Text>

            {/* Today */}
            <TouchableOpacity
              style={{ backgroundColor: colors.pink, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 }}
              onPress={async () => {
                const today = dayjs().format('YYYY-MM-DD')
                if (updateCycleSettings) await updateCycleSettings(prev => ({ ...prev, lastPeriodStart: today }))
                if (saveLog) await saveLog(today, { date: today, flow: 'medium', periodStatus: 'started' })
                setShowPeriodSheet(false)
              }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                🩸 {t('today')} — {dayjs().format('MMM D')}
              </Text>
            </TouchableOpacity>

            {/* Yesterday */}
            <TouchableOpacity
              style={{ backgroundColor: colors.pinkLight, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1.5, borderColor: colors.pink }}
              onPress={async () => {
                const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
                if (updateCycleSettings) await updateCycleSettings(prev => ({ ...prev, lastPeriodStart: yesterday }))
                if (saveLog) await saveLog(yesterday, { date: yesterday, flow: 'medium', periodStatus: 'started' })
                setShowPeriodSheet(false)
              }}
            >
              <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 15 }}>
                📅 {t('yesterday') || 'Yesterday'} — {dayjs().subtract(1, 'day').format('MMM D')}
              </Text>
            </TouchableOpacity>

            {/* Pick date */}
            <TouchableOpacity
              style={{ backgroundColor: colors.white, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
              onPress={() => {
                setShowPeriodSheet(false)
                navigation?.navigate('PeriodPicker')
              }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 15 }}>
                🗓 {t('pick_another_date') || 'Pick another date'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 16, alignItems: 'center' }}
              onPress={() => setShowPeriodSheet(false)}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Period END Bottom Sheet */}
      <Modal visible={showPeriodEndSheet} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPeriodEndSheet(false)} />
          <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 24 + insets.bottom }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>
              ✅ {t('when_period_end') || 'When did your period end?'}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 20 }}>
              {t('select_end_date') || 'Select the date your period ended'}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#10B981', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 }}
              onPress={async () => {
                const today = dayjs().format('YYYY-MM-DD')
                if (saveLog) await saveLog(today, { date: today, flow: 'none', periodStatus: 'ended' })
                setShowPeriodEndSheet(false)
              }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                ✅ {t('today')} — {dayjs().format('MMM D')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#D1FAE5', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1.5, borderColor: '#10B981' }}
              onPress={async () => {
                const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
                if (saveLog) await saveLog(yesterday, { date: yesterday, flow: 'none', periodStatus: 'ended' })
                setShowPeriodEndSheet(false)
              }}
            >
              <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 15 }}>
                📅 {t('yesterday') || 'Yesterday'} — {dayjs().subtract(1, 'day').format('MMM D')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: colors.white, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}
              onPress={() => { setShowPeriodEndSheet(false); navigation?.navigate('PeriodPicker') }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 15 }}>
                🗓 {t('pick_another_date') || 'Pick another date'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShowPeriodEndSheet(false)}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
  </>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  notifBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topBarRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: {
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroRingWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDaysNum: {
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 62,
  },
  heroDaysLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  heroPhaseLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countdownWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingText: { fontSize: 13, marginBottom: 4 },
  countdownLabel: { fontSize: 16 },
  countdownBig: { fontSize: 38, fontWeight: '800', letterSpacing: 1, marginVertical: 4 },
  countdownSub: { fontSize: 14, marginBottom: 18 },
  periodStartBtn: {
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 30,
  },
  periodStartBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },

  statsScroll: { marginBottom: 18 },
  statCard: {
    width: 130,
    height: 130,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
  },
  statCardLabel: { fontSize: 12, fontWeight: '800', lineHeight: 15 },
  ringWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ringNumber: { position: 'absolute', fontSize: 22, fontWeight: '800' },
  statCardTitle: { fontSize: 19, fontWeight: '800' },
  statCardSubLabel: { fontSize: 12, fontWeight: '500' },
  statCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },

  alert: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 12, alignItems: 'center' },
  alertWarning: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 12, alignItems: 'center' },
  alertText: { fontSize: 13, fontWeight: '600' },

  feelingCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  feelingTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  feelingSub: { fontSize: 13, marginBottom: 16 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  moodBtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5 },
  moodBtnText: { fontSize: 13, fontWeight: '500' },
  addSymptomBtn: {
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 26,
  },
  addSymptomBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  smallStatCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center' },
  statCardIcon: { fontSize: 22, marginBottom: 4 },
  smallStatValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  smallStatLabel: { fontSize: 10 },

  tipCard: { borderRadius: 16, padding: 16, borderLeftWidth: 4 },
  tipTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  tipText: { fontSize: 13, lineHeight: 19 },

  shortcutsWrap: { gap: 10 },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  shortcutIcon: { fontSize: 26 },
  shortcutTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  shortcutDesc: { fontSize: 11 },
  shortcutArrow: { fontSize: 18 },
})

export default Dashboard