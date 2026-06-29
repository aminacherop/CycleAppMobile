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
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { getUnreadNotificationCount } from '../utils/notifications'

const Dashboard = ({ cycleSettings, userProfile, todayLog, saveLog, navigation }) => {
  const { colors, isDark, changeTheme } = useTheme()
  const [unreadCount, setUnreadCount] = useState(0)
  const welcomeOpacity = useRef(new Animated.Value(0)).current
  const welcomeTranslateY = useRef(new Animated.Value(-16)).current

  useEffect(() => {
    Animated.parallel([
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

  const name = userProfile?.name || ''

  const cycleLength = cycleSettings?.cycleLength || 28
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
  const progress = Math.min(100, (currentCycleDay / cycleLength) * 100)

  const moods = [
    { id: 'good', label: t('mood_good') || 'Good', emoji: '😊' },
    { id: 'tired', label: t('mood_tired') || 'Tired', emoji: '😴' },
    { id: 'cramps', label: t('mood_cramps') || 'Cramps', emoji: '😣' },
    { id: 'moody', label: t('mood_moody') || 'Moody', emoji: '😤' },
    { id: 'nausea', label: t('mood_nausea') || 'Nausea', emoji: '🤢' },
    { id: 'energetic', label: t('mood_energetic') || 'Energetic', emoji: '💪' },
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
      label: 'Next Period',
      date: nextPeriodDate.format('MMM D'),
      icon: '💧',
      bg: '#FCE7F3',
      iconBg: '#EC4899',
      goToCalendar: true,
    },
    {
      label: 'Next Fertile',
      date: fertileStart.format('MMM D'),
      icon: '🌱',
      bg: '#FEF3C7',
      iconBg: '#F59E0B',
      goToCalendar: true,
    },
    {
      label: 'Next Ovulation',
      date: ovulationDate.format('MMM D'),
      icon: '✨',
      bg: '#EDE9FE',
      iconBg: '#7C3AED',
      goToCalendar: true,
    },
    {
      label: 'Partner Mode',
      sub: 'Share your cycle',
      icon: '👫',
      bg: '#D1FAE5',
      iconBg: '#10B981',
      isAction: true,
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
            style={[styles.iconBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
            onPress={() => changeLanguage(language === 'en' ? 'sw' : 'en')}
          >
            <Text style={{ fontSize: 16 }}>{language === 'en' ? '🇰🇪' : '🇬🇧'}</Text>
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
        <Text style={[styles.greetingText, { color: colors.textSecondary }]}>
          {name ? `Hi, ${name} 👋` : 'Period'}
        </Text>
        <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>
          {currentPhase === 'Menstrual' ? 'Period' : 'Period'}
        </Text>
        <Text style={[styles.countdownBig, { color: colors.textPrimary }]}>
          {daysUntilPeriod === 0 ? 'TODAY' : `${daysUntilPeriod} DAYS LEFT`}
        </Text>
        <Text style={[styles.countdownSub, { color: colors.textSecondary }]}>
          {lpsDate.format('MMM D')} - Next Period {nextPeriodDate.format('MMM D')}
        </Text>

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
              if (card.isAction) navigation?.navigate('PartnerInvite')
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
        <View style={[styles.tipCard, { backgroundColor: colors.white, borderLeftColor: phase.color }]}>
          <Text style={[styles.tipTitle, { color: phase.color }]}>
            {phase.emoji} {currentPhase} phase
          </Text>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            {phase.tip}
          </Text>
        </View>
      </View>

      {/* Quick shortcuts */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Quick access
        </Text>
        <View style={styles.shortcutsWrap}>
          {[
            { icon: '📚', title: 'Health Articles', desc: 'Cycle, PCOS, fertility', screen: 'Articles' },
            { icon: '💊', title: 'Pills & Supplements', desc: 'Daily reminders', screen: 'Medications' },
            { icon: '👫', title: 'Partner sharing', desc: 'Share cycle summary', screen: 'PartnerInvite' },
            { icon: '🔔', title: 'Reminders', desc: 'Period & ovulation alerts', screen: 'Notifications' },
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