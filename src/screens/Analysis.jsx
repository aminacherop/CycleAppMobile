import { useState, useEffect } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Modal,
} from 'react-native'
import dayjs from 'dayjs'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { saveData, loadData } from '../utils/storage'
import { usePremium } from '../context/PremiumContext'
import Paywall from './Paywall'
import {
  requestNotificationPermission,
  getNotificationPermission,
  scheduleAllReminders,
  cancelAllNotifications,
} from '../utils/notifications'

const DEFAULT_REMINDERS = {
  enabled: false,
  periodStarts: true,
  periodEnds: true,
  periodInput: true,
  fertility: true,
  ovulation: true,
  medicine: false,
  water: false,
  dailyLog: true,
  dailyLogTime: '20:00',
  waterReminderTime: '11:00',
}

const Analysis = ({ cycleSettings, setCycleSettings, dailyLogs, installDate, navigation }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const { isPremium } = usePremium()
  const [showPaywall, setShowPaywall] = useState(false)

  const [goal, setGoal] = useState('track_period')
  const [trackPregnancy, setTrackPregnancy] = useState(false)
  const [reminders, setReminders] = useState(DEFAULT_REMINDERS)
  const [permission, setPermission] = useState('undetermined')
  const [showRemindersModal, setShowRemindersModal] = useState(false)
  const [showDailyTimePicker, setShowDailyTimePicker] = useState(false)
  const [showWaterTimePicker, setShowWaterTimePicker] = useState(false)
  const [showPredictionModal, setShowPredictionModal] = useState(false)
  const [draftSettings, setDraftSettings] = useState({
    cycleLength: cycleSettings?.cycleLength || 28,
    periodLength: cycleSettings?.periodLength || 5,
    lutealLength: 14,
  })
  const [loading, setLoading] = useState(true)

  const cycleLength = cycleSettings?.cycleLength || 28
  const periodLength = cycleSettings?.periodLength || 5
  const lutealLength = cycleSettings?.lutealLength || 14
  const lastPeriodStart = cycleSettings?.lastPeriodStart || dayjs().format('YYYY-MM-DD')
  const lpsDate = dayjs(lastPeriodStart)

  useEffect(() => {
    const load = async () => {
      const savedGoal = await loadData('user_goal', 'track_period')
      const savedPregnancy = await loadData('track_pregnancy', false)
      const savedReminders = await loadData('analysis_reminders', DEFAULT_REMINDERS)
      const perm = await getNotificationPermission()
      setGoal(savedGoal)
      setTrackPregnancy(savedPregnancy)
      setReminders(savedReminders)
      setPermission(perm)
      setLoading(false)
    }
    load()
  }, [])

  useFocusEffect(
    useCallback(() => {
      const reloadGoalData = async () => {
        const savedGoal = await loadData('user_goal', 'track_period')
        setGoal(savedGoal)
      }
      reloadGoalData()
    }, [])
  )


  const handleSelectGoal = async (newGoal) => {
    setGoal(newGoal)
    await saveData('user_goal', newGoal)
    if (newGoal === 'pregnancy') {
      navigation?.navigate('PregnancyIntro')
    }
  }

  const handleTogglePregnancy = async (value) => {
    setTrackPregnancy(value)
    await saveData('track_pregnancy', value)
  }

  const [gestationStart, setGestationStart] = useState(null)

  useEffect(() => {
    const loadGestation = async () => {
      const saved = await loadData('gestation_start', null)
      setGestationStart(saved)
    }
    loadGestation()
  }, [goal])

  const gestStartDate = gestationStart ? dayjs(gestationStart) : dayjs()
  const pregnancyTotalDays = gestationStart ? dayjs().diff(gestStartDate, 'day') : 0
  const pregnancyWeeks = Math.max(0, Math.floor(pregnancyTotalDays / 7))
  const pregnancyDays = Math.max(0, pregnancyTotalDays % 7)

  const handleBabyBornToggle = async (value) => {
    if (value) {
      await saveData('pregnancy_mode', false)
      await saveData('baby_born_date', dayjs().format('YYYY-MM-DD'))
      setGoal('track_period')
      await saveData('user_goal', 'track_period')
    }
  }


  const handleToggleMain = async () => {
    if (reminders.enabled) {
      const updated = { ...reminders, enabled: false }
      setReminders(updated)
      await saveData('analysis_reminders', updated)
      await cancelAllNotifications()
    } else {
      const granted = await requestNotificationPermission()
      setPermission(granted ? 'granted' : 'denied')
      if (granted) {
        const updated = { ...reminders, enabled: true }
        setReminders(updated)
        await saveData('analysis_reminders', updated)
        if (cycleSettings?.lastPeriodStart) {
          const [dailyHour, dailyMinute] = (updated.dailyLogTime || '20:00').split(':').map(Number)
          const [waterHour, waterMinute] = (updated.waterReminderTime || '11:00').split(':').map(Number)
          await scheduleAllReminders(cycleSettings, {
            periodReminder: updated.periodStarts || updated.periodEnds,
            ovulationReminder: updated.ovulation,
            fertileReminder: updated.fertility,
            dailyReminder: updated.dailyLog,
            dailyReminderHour: dailyHour,
            dailyReminderMinute: dailyMinute,
            waterReminder: updated.water,
            waterReminderHour: waterHour,
            waterReminderMinute: waterMinute,
          })
        }
      }
    }
  }

  const updateReminder = async (key, value) => {
    const updated = { ...reminders, [key]: value }
    setReminders(updated)
    await saveData('analysis_reminders', updated)
    if (updated.enabled && cycleSettings?.lastPeriodStart) {
      const [dailyHour, dailyMinute] = (updated.dailyLogTime || '20:00').split(':').map(Number)
      const [waterHour, waterMinute] = (updated.waterReminderTime || '11:00').split(':').map(Number)
      await scheduleAllReminders(cycleSettings, {
        periodReminder: updated.periodStarts || updated.periodEnds,
        ovulationReminder: updated.ovulation,
        fertileReminder: updated.fertility,
        dailyReminder: updated.dailyLog,
        dailyReminderHour: dailyHour,
        dailyReminderMinute: dailyMinute,
        waterReminder: updated.water,
        waterReminderHour: waterHour,
        waterReminderMinute: waterMinute,
      })
    }
  }

  const updateDailyLogTime = async (timeString) => {
    const updated = { ...reminders, dailyLogTime: timeString }
    setReminders(updated)
    await saveData('analysis_reminders', updated)
    if (updated.enabled && cycleSettings?.lastPeriodStart) {
      const [dailyHour, dailyMinute] = timeString.split(':').map(Number)
      const [waterHour, waterMinute] = (updated.waterReminderTime || '11:00').split(':').map(Number)
      await scheduleAllReminders(cycleSettings, {
        periodReminder: updated.periodStarts || updated.periodEnds,
        ovulationReminder: updated.ovulation,
        fertileReminder: updated.fertility,
        dailyReminder: updated.dailyLog,
        dailyReminderHour: dailyHour,
        dailyReminderMinute: dailyMinute,
        waterReminder: updated.water,
        waterReminderHour: waterHour,
        waterReminderMinute: waterMinute,
      })
    }
  }

  const updateWaterReminderTime = async (timeString) => {
    const updated = { ...reminders, waterReminderTime: timeString }
    setReminders(updated)
    await saveData('analysis_reminders', updated)
    if (updated.enabled && cycleSettings?.lastPeriodStart) {
      const [dailyHour, dailyMinute] = (updated.dailyLogTime || '20:00').split(':').map(Number)
      const [waterHour, waterMinute] = timeString.split(':').map(Number)
      await scheduleAllReminders(cycleSettings, {
        periodReminder: updated.periodStarts || updated.periodEnds,
        ovulationReminder: updated.ovulation,
        fertileReminder: updated.fertility,
        dailyReminder: updated.dailyLog,
        dailyReminderHour: dailyHour,
        dailyReminderMinute: dailyMinute,
        waterReminder: updated.water,
        waterReminderHour: waterHour,
        waterReminderMinute: waterMinute,
      })
    }
  }


  const handleSavePredictions = async () => {
    await setCycleSettings(prev => ({
      ...prev,
      cycleLength: draftSettings.cycleLength,
      periodLength: draftSettings.periodLength,
      lutealLength: draftSettings.lutealLength,
    }))
    setShowPredictionModal(false)
  }

  // Generate real logged cycles since install date
  const generateLoggedCycles = () => {
    if (!installDate) return []
    const start = dayjs(installDate)
    const today = dayjs()
    const cycles = []
    let cursor = lpsDate
    while (cursor.isBefore(today)) {
      if (cursor.isAfter(start) || cursor.isSame(start, 'day')) {
        cycles.push({
          start: cursor.format('MMM D, YYYY'),
          end: cursor.add(periodLength - 1, 'day').format('MMM D, YYYY'),
          ovulation: cursor.add(cycleLength - lutealLength, 'day').format('MMM D'),
        })
      }
      cursor = cursor.add(cycleLength, 'day')
    }
    return cycles
  }

  const loggedCycles = generateLoggedCycles()

  const avgPeriod = loggedCycles.length > 0 ? periodLength : periodLength
  const avgCycle = loggedCycles.length > 0 ? cycleLength : cycleLength

  // Build timeline events from dailyLogs + cycle data
  const buildTimeline = () => {
    const events = []
    if (dailyLogs) {
      Object.entries(dailyLogs).forEach(([date, log]) => {
        if (log.pregnancyTest && log.pregnancyTest !== 'notaken') {
          events.push({
            date,
            type: 'pregnancy_test',
            label: `${t('pregnancy_test_label')}: ${log.pregnancyTest}`,
            icon: '🤰',
          })
        }
        if (log.periodStatus === 'started') {
          events.push({ date, type: 'period_start', label: t('period_starts'), icon: '🩸' })
        }
        if (log.periodStatus === 'ended') {
          events.push({ date, type: 'period_end', label: t('period_ends'), icon: '✅' })
        }
      })
    }
    return events.sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
  }

  const timelineEvents = buildTimeline()

  const goalOptions = [
    { id: 'track_period', label: t('goal_track_period') },
    { id: 'conceive', label: t('goal_conceive') },
    { id: 'pregnancy', label: t('goal_pregnancy') },
  ]

  const reminderOptions = [
    { key: 'periodStarts', emoji: '🩸', label: t('period_starts') },
    { key: 'periodEnds', emoji: '✅', label: t('period_ends') },
    { key: 'periodInput', emoji: '📝', label: t('period_input_reminder') },
    { key: 'fertility', emoji: '🌱', label: t('fertility_reminder') },
    { key: 'ovulation', emoji: '✨', label: t('ovulation_reminder_label') },
    { key: 'medicine', emoji: '💊', label: t('add_medicine') },
    { key: 'water', emoji: '💧', label: t('drink_water') },
    { key: 'dailyLog', emoji: '📋', label: t('daily_log_reminder') },
  ]

  const styles = makeStyles(colors)

  if (loading) return null

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation?.navigate('Profile')}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('analysis')}</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* ── ICON ROW: Settings | Reminders | Feedback ── */}
      <View style={styles.iconRow}>
        <TouchableOpacity style={styles.iconBtnWrap} onPress={() => navigation?.navigate('Profile')}>
          <View style={[styles.iconCircle, { backgroundColor: colors.pinkLight }]}>
            <Text style={{ fontSize: 22 }}>⚙️</Text>
          </View>
          <Text style={[styles.iconLabel, { color: colors.textSecondary }]}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtnWrap} onPress={() => setShowRemindersModal(true)}>
          <View style={[styles.iconCircle, { backgroundColor: colors.pinkLight }]}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </View>
          <Text style={[styles.iconLabel, { color: colors.textSecondary }]}>Reminders</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtnWrap} onPress={() => setShowPaywall(true)}>
          <View style={[styles.iconCircle, { backgroundColor: isPremium ? '#FEF3C7' : colors.pinkLight }]}>
            <Text style={{ fontSize: 22 }}>👑</Text>
          </View>
          <Text style={[styles.iconLabel, { color: colors.textSecondary }]}>
            {isPremium ? t('premium') : t('upgrade')}
          </Text>
        </TouchableOpacity>
      </View>
      {(!dailyLogs || Object.keys(dailyLogs).length === 0) && (
        <View style={[styles.hintBanner, { backgroundColor: colors.pinkLight, borderColor: colors.pink }]}>
          <Text style={{ fontSize: 18 }}>💡</Text>
          <Text style={[styles.hintText, { color: colors.pinkDark }]}>
            New here? Pick a goal below, then check Prediction Settings to fine-tune your cycle length for more accurate predictions.
          </Text>
        </View>
      )}

      {/* ── GOAL CARD ── */}
      <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}>
          <Text style={{ fontSize: 18 }}>🎯</Text>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('my_goal')}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {goalOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.goalChip,
                  {
                    backgroundColor: goal === option.id ? colors.pink : colors.pinkLight,
                  },
                ]}
                onPress={() => handleSelectGoal(option.id)}
              >
                <Text style={{
                  color: goal === option.id ? 'white' : colors.pinkDark,
                  fontWeight: goal === option.id ? '700' : '500',
                  fontSize: 13,
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {goal === 'pregnancy' ? (
          <>
            {/* Pregnancy settings row */}
            <TouchableOpacity
              style={[styles.settingsRow, { borderTopColor: colors.border }]}
              onPress={() => navigation?.navigate('PregnancyMode')}
            >
              <Text style={{ fontSize: 18 }}>🤰</Text>
              <Text style={[styles.settingsRowTitle, { color: colors.textPrimary, flex: 1 }]}>
                Pregnancy settings
              </Text>
              <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 13, textAlign: 'right' }}>
                {pregnancyWeeks} Weeks{'\n'}{pregnancyDays} Days
              </Text>
            </TouchableOpacity>

            {/* My baby was born toggle */}
            <View style={[styles.settingsRow, { borderTopColor: colors.border }]}>
              <Text style={{ fontSize: 18 }}>🌱</Text>
              <Text style={[styles.settingsRowTitle, { color: colors.textPrimary, flex: 1 }]}>
                My baby was born!
              </Text>
              <Switch
                value={false}
                onValueChange={handleBabyBornToggle}
                trackColor={{ false: colors.border, true: colors.pink }}
                thumbColor="white"
              />
            </View>
          </>
        ) : (
          <>
            {/* Prediction settings row */}
            <TouchableOpacity
              style={[styles.settingsRow, { borderTopColor: colors.border }]}
              onPress={() => {
                setDraftSettings({ cycleLength, periodLength, lutealLength })
                setShowPredictionModal(true)
              }}
            >
              <Text style={{ fontSize: 18 }}>🔮</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingsRowTitle, { color: colors.textPrimary }]}>
                  {t('prediction_settings')}
                </Text>
                <Text style={[styles.settingsRowSub, { color: colors.textSecondary }]}>
                  For period, cycle, and ovulation
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>›</Text>
            </TouchableOpacity>

            {/* Pregnancy toggle row */}
            <View style={[styles.settingsRow, { borderTopColor: colors.border }]}>
              <Text style={{ fontSize: 18 }}>🤰</Text>
              <Text style={[styles.settingsRowTitle, { color: colors.textPrimary, flex: 1 }]}>
                {t('goal_pregnancy')}
              </Text>
              <Switch
                value={trackPregnancy}
                onValueChange={handleTogglePregnancy}
                trackColor={{ false: colors.border, true: colors.pink }}
                thumbColor="white"
              />
            </View>
          </>
        )}
      </View>

      {/* ── MY CYCLES CARD ── */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}
        onPress={() => navigation?.navigate('MyCycles')}
        activeOpacity={0.7}
      >
        <View style={styles.cardTitleRow}>
          <Text style={{ fontSize: 18 }}>🔄</Text>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, flex: 1 }]}>
            {t('my_logged_cycles')}
          </Text>
          <Text style={{ fontSize: 18, color: colors.textSecondary }}>›</Text>
        </View>
        <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>
          {loggedCycles.length} cycles logged
        </Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.pinkLight }]}>
            <Text style={{ fontSize: 20 }}>🩸</Text>
            <Text style={[styles.statValue, { color: colors.pinkDark }]}>{avgPeriod} Days</Text>
            <Text style={[styles.statLabel, { color: colors.pink }]}>Average period</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={{ fontSize: 20 }}>🔄</Text>
            <Text style={[styles.statValue, { color: '#92400E' }]}>{avgCycle} Days</Text>
            <Text style={[styles.statLabel, { color: '#B45309' }]}>Average cycle</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── TIMELINE CARD ── */}
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}
        onPress={() => navigation?.navigate('Timeline')}
        activeOpacity={0.7}
      >
        <View style={styles.cardTitleRow}>
          <Text style={{ fontSize: 18 }}>📍</Text>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('timeline')}</Text>
        </View>
        {timelineEvents.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No events logged yet
          </Text>
        ) : (
          <View style={{ gap: 10, marginTop: 8 }}>
            {timelineEvents.map((event, i) => (
              <View key={i} style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: colors.pink }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timelineLabel, { color: colors.textPrimary }]}>
                    {event.icon} {event.label}
                  </Text>
                  <Text style={[styles.timelineDate, { color: colors.textSecondary }]}>
                    {dayjs(event.date).format('MMM D, YYYY')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* ── REMINDERS MODAL ── */}
      <Modal visible={showRemindersModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.white }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.cardHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>🔔 Reminders</Text>
                <Switch
                  value={reminders.enabled}
                  onValueChange={handleToggleMain}
                  disabled={permission === 'denied'}
                  trackColor={{ false: colors.border, true: colors.pink }}
                  thumbColor="white"
                />
              </View>

              {permission === 'denied' && (
                <Text style={{ color: '#92400E', fontSize: 12, marginBottom: 8 }}>
                  ⚠️ Notifications blocked. Enable in phone settings.
                </Text>
              )}

              {reminders.enabled && (
                <View style={{ gap: 4, marginTop: 8 }}>
                  {reminderOptions.map(option => (
                    <View key={option.key} style={[styles.reminderRow, { borderBottomColor: colors.border }]}>
                      <Text style={{ fontSize: 15 }}>{option.emoji}</Text>
                      <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 13 }}>{option.label}</Text>
                      <Switch
                        value={reminders[option.key]}
                        onValueChange={v => updateReminder(option.key, v)}
                        trackColor={{ false: colors.border, true: colors.pink }}
                        thumbColor="white"
                      />
                    </View>
                  ))}
                  {reminders.dailyLog && (
                    <TouchableOpacity
                      style={[styles.reminderRow, { borderBottomColor: colors.border }]}
                      onPress={() => setShowDailyTimePicker(true)}
                    >
                      <Text style={{ fontSize: 15 }}>⏰</Text>
                      <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 13 }}>
                        Daily log time
                      </Text>
                      <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 13 }}>
                        {dayjs(`2000-01-01T${reminders.dailyLogTime || '20:00'}`).format('h:mm A')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {showDailyTimePicker && (
                    <DateTimePicker
                      value={dayjs(`2000-01-01T${reminders.dailyLogTime || '20:00'}`).toDate()}
                      mode="time"
                      is24Hour={false}
                      onChange={(event, selectedDate) => {
                        setShowDailyTimePicker(false)
                        if (selectedDate) {
                          const formatted = dayjs(selectedDate).format('HH:mm')
                          updateDailyLogTime(formatted)
                        }
                      }}
                    />
                  )}
                  {reminders.water && (
                    <TouchableOpacity
                      style={[styles.reminderRow, { borderBottomColor: colors.border }]}
                      onPress={() => setShowWaterTimePicker(true)}
                    >
                      <Text style={{ fontSize: 15 }}>💧</Text>
                      <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 13 }}>
                        Drink water time
                      </Text>
                      <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 13 }}>
                        {dayjs(`2000-01-01T${reminders.waterReminderTime || '11:00'}`).format('h:mm A')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {showWaterTimePicker && (
                    <DateTimePicker
                      value={dayjs(`2000-01-01T${reminders.waterReminderTime || '11:00'}`).toDate()}
                      mode="time"
                      is24Hour={false}
                      onChange={(event, selectedDate) => {
                        setShowWaterTimePicker(false)
                        if (selectedDate) {
                          const formatted = dayjs(selectedDate).format('HH:mm')
                          updateWaterReminderTime(formatted)
                        }
                      }}
                    />
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.pink }]}
                onPress={() => setShowRemindersModal(false)}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── PREDICTION EDIT MODAL ── */}
      <Modal visible={showPredictionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.white }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              🔮 {t('prediction_settings')}
            </Text>

            {[
              { key: 'periodLength', label: t('period_length'), min: 2, max: 10 },
              { key: 'cycleLength', label: t('cycle_length'), min: 21, max: 45 },
              { key: 'lutealLength', label: t('luteal_phase_length'), min: 10, max: 18 },
            ].map(field => (
              <View key={field.key} style={{ marginBottom: 16 }}>
                <View style={styles.sliderLabelRow}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>{field.label}</Text>
                  <Text style={{ color: colors.pink, fontWeight: '700' }}>
                    {draftSettings[field.key]} days
                  </Text>
                </View>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { borderColor: colors.border }]}
                    onPress={() => setDraftSettings(prev => ({
                      ...prev,
                      [field.key]: Math.max(field.min, prev[field.key] - 1),
                    }))}
                  >
                    <Text style={{ fontSize: 18, color: colors.textPrimary }}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, minWidth: 40, textAlign: 'center' }}>
                    {draftSettings[field.key]}
                  </Text>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { borderColor: colors.border }]}
                    onPress={() => setDraftSettings(prev => ({
                      ...prev,
                      [field.key]: Math.min(field.max, prev[field.key] + 1),
                    }))}
                  >
                    <Text style={{ fontSize: 18, color: colors.textPrimary }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setShowPredictionModal(false)}
              >
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: colors.pink }]}
                onPress={handleSavePredictions}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Paywall
        visible={showPaywall}
        feature="Premium features"
        onClose={() => setShowPaywall(false)}
      />

    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  hintText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  iconRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  iconBtnWrap: { alignItems: 'center', gap: 6 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  iconLabel: { fontSize: 11, fontWeight: '500' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtext: { fontSize: 12, marginBottom: 10 },
  goalChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, marginTop: 8 },
  settingsRowTitle: { fontSize: 14, fontWeight: '600' },
  settingsRowSub: { fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  emptyText: { fontSize: 12, fontStyle: 'italic' },
  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLabel: { fontSize: 13, fontWeight: '600' },
  timelineDate: { fontSize: 11, marginTop: 2 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalCloseBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  stepperBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  modalSave: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
})

export default Analysis