import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  AppState,
  Animated,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Svg, { Circle } from 'react-native-svg'
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { getUnreadNotificationCount } from '../utils/notifications'
import { getSmartPredictions } from '../utils/cyclePrediction'
import { getDailyInsight } from '../utils/dailyInsights'

const Dashboard = ({ cycleSettings, userProfile, todayLog, saveLog, dailyLogs, navigation }) => {
  const { colors, isDark, changeTheme } = useTheme()
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

  const { t, language, changeLanguage } = useLanguage()
  const [selectedMood, setSelectedMood] = useState(null)
  const [tipOffset, setTipOffset] = useState(0)

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
    Menstrual: { color: '#EC4899', bg: '#FCE7F3', emoji: '🌸', tip: 'Rest and be gentle with yourself today.' },
    Follicular: { color: '#7C3AED', bg: '#EDE9FE', emoji: '🌱', tip: 'Energy is rising — great time to start new things.' },
    Ovulation: { color: '#F59E0B', bg: '#FEF3C7', emoji: '✨', tip: 'You are at your most energetic and social today.' },
    Luteal: { color: '#10B981', bg: '#D1FAE5', emoji: '🍂', tip: 'Wind down and focus on self care this week.' },
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
      label: 'CYCLE DAY',
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
            style={[styles.iconBtn, { backgroundColor: colors.white, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10 }]}
            onPress={() => changeLanguage(language === 'en' ? 'sw' : 'en')}
          >
            <Text style={{ fontSize: 12 }}>🌍</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.pink }}>
              {language === 'en' ? 'EN' : 'SW'}
            </Text>
          </TouchableOpacity>
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
            {phase.emoji} {currentPhase} phase · Day {currentCycleDay}
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

        <TouchableOpacity
          style={[styles.periodStartBtn, { backgroundColor: colors.pink }]}
          onPress={() => navigation?.navigate('PeriodPicker')}
        >
          <Text style={styles.periodStartBtnText}>Period Starts</Text>
        </TouchableOpacity>
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
        <Text style={[styles.feelingSub, { color: colors.textSecondary }]}>
          Tell us more about your body to get analysis
        </Text>

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
          <Text style={styles.addSymptomBtnText}>Add Symptom</Text>
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
          ].map((stat, i) => (
            <View key={i} style={[styles.smallStatCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
              <Text style={styles.statCardIcon}>{stat.icon}</Text>
              <Text style={[styles.smallStatValue, { color: colors.textPrimary }]}>{stat.value}</Text>
              <Text style={[styles.smallStatLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
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
              {phase.emoji} {currentPhase} phase
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

    </ScrollView>
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