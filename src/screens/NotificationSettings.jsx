import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { saveData, loadData } from '../utils/storage'
import {
  requestNotificationPermission,
  getNotificationPermission,
  scheduleAllReminders,
  cancelAllNotifications,
  sendTestNotification,
  clearUnreadNotifications,
} from '../utils/notifications'

const DEFAULT_PREFS = {
  enabled: false,
  periodReminder: true,
  ovulationReminder: true,
  fertileReminder: true,
  dailyReminder: true,
  dailyReminderTime: 20,
}

const NotificationSettings = ({ navigation, cycleSettings }) => {
  const { colors } = useTheme()
  const [permission, setPermission] = useState('undetermined')
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [enabling, setEnabling] = useState(false)

  useEffect(() => {
    const load = async () => {
      const saved = await loadData('notification_prefs', DEFAULT_PREFS)
      setPrefs(saved)
      const perm = await getNotificationPermission()
      setPermission(perm)
      setLoading(false)
      await clearUnreadNotifications()
    }
    load()
  }, [])

  const handleToggleMain = async () => {
    if (prefs.enabled) {
      const newPrefs = { ...prefs, enabled: false }
      setPrefs(newPrefs)
      await saveData('notification_prefs', newPrefs)
      await cancelAllNotifications()
    } else {
      setEnabling(true)
      const granted = await requestNotificationPermission()
      setPermission(granted ? 'granted' : 'denied')
      if (granted) {
        const newPrefs = { ...prefs, enabled: true }
        setPrefs(newPrefs)
        await saveData('notification_prefs', newPrefs)
        if (cycleSettings?.lastPeriodStart) {
          await scheduleAllReminders(cycleSettings, newPrefs)
        }
        await sendTestNotification()
      }
      setEnabling(false)
    }
  }

  const updatePref = async (key, value) => {
    const newPrefs = { ...prefs, [key]: value }
    setPrefs(newPrefs)
    await saveData('notification_prefs', newPrefs)
    if (newPrefs.enabled && cycleSettings?.lastPeriodStart) {
      await scheduleAllReminders(cycleSettings, newPrefs)
    }
  }

  const reminderOptions = [
    { key: 'periodReminder', label: '🩸 Period reminder', desc: '2 days before, 1 day before, and on the day' },
    { key: 'ovulationReminder', label: '✨ Ovulation reminder', desc: 'Day before and on ovulation day' },
    { key: 'fertileReminder', label: '🌱 Fertile window alert', desc: 'When your fertile window starts' },
    { key: 'dailyReminder', label: '📝 Daily log reminder', desc: 'Reminder to log mood and symptoms' },
  ]

  const timeOptions = [7, 8, 9, 12, 18, 20, 21, 22]

  const getUpcomingReminders = () => {
    if (!cycleSettings?.lastPeriodStart) return []
    const lps = dayjs(cycleSettings.lastPeriodStart)
    const cycleLength = cycleSettings.cycleLength || 28
    const today = dayjs()

    let nextPeriod = lps.add(cycleLength, 'day')
    while (nextPeriod.isBefore(today, 'day')) {
      nextPeriod = nextPeriod.add(cycleLength, 'day')
    }

    const ovulation = lps.add(cycleLength - 14, 'day')
    const fertileStart = ovulation.subtract(5, 'day')

    return [
      { label: '🩸 Period reminder', date: nextPeriod.subtract(2, 'day').format('MMM D'), daysUntil: nextPeriod.subtract(2, 'day').diff(today, 'day'), active: prefs.periodReminder },
      { label: '✨ Ovulation', date: ovulation.format('MMM D'), daysUntil: ovulation.diff(today, 'day'), active: prefs.ovulationReminder },
      { label: '🌱 Fertile window', date: fertileStart.format('MMM D'), daysUntil: fertileStart.diff(today, 'day'), active: prefs.fertileReminder },
    ].filter(r => r.daysUntil >= 0).sort((a, b) => a.daysUntil - b.daysUntil)
  }

  const upcoming = getUpcomingReminders()
  const styles = makeStyles(colors)

  if (loading) return null

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <TouchableOpacity
        activeOpacity={0.6}
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>

      {/* Main toggle */}
      <View style={[styles.mainCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <View style={styles.mainRow}>
          <Text style={{ fontSize: 28 }}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>Push notifications</Text>
            <Text style={[styles.mainDesc, { color: colors.textSecondary }]}>
              {permission === 'denied'
                ? 'Blocked — enable in phone settings'
                : prefs.enabled
                ? 'Active — reminders are scheduled'
                : 'Get reminders for your cycle'}
            </Text>
          </View>
          <Switch
            value={prefs.enabled}
            onValueChange={handleToggleMain}
            disabled={enabling || permission === 'denied'}
            trackColor={{ false: colors.border, true: colors.pink }}
            thumbColor="white"
          />
        </View>

        {permission === 'denied' && (
          <View style={[styles.blockedNote, { backgroundColor: '#FEF3C7' }]}>
            <Text style={{ color: '#92400E', fontSize: 12 }}>
              ⚠️ Notifications are blocked. Enable them in your phone Settings → Apps → CycleApp → Notifications.
            </Text>
          </View>
        )}
      </View>

      {prefs.enabled && (
        <>
          {/* Reminder types */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Reminder types</Text>
          {reminderOptions.map(option => (
            <View key={option.key} style={[styles.itemRow, { backgroundColor: colors.white, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{option.label}</Text>
                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{option.desc}</Text>
              </View>
              <Switch
                value={prefs[option.key]}
                onValueChange={v => updatePref(option.key, v)}
                trackColor={{ false: colors.border, true: colors.pink }}
                thumbColor="white"
              />
            </View>
          ))}

          {/* Daily reminder time */}
          {prefs.dailyReminder && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Daily reminder time</Text>
              <View style={styles.timeGrid}>
                {timeOptions.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.timeBtn,
                      {
                        backgroundColor: prefs.dailyReminderTime === h ? colors.pinkLight : colors.white,
                        borderColor: prefs.dailyReminderTime === h ? colors.pink : colors.border,
                      },
                    ]}
                    onPress={() => updatePref('dailyReminderTime', h)}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: prefs.dailyReminderTime === h ? colors.pinkDark : colors.textPrimary,
                    }}>
                      {h > 12 ? `${h - 12}:00 PM` : `${h}:00 ${h === 12 ? 'PM' : 'AM'}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Upcoming reminders */}
          {upcoming.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Upcoming reminders</Text>
              {upcoming.map((r, i) => (
                <View
                  key={i}
                  style={[
                    styles.upcomingRow,
                    { backgroundColor: colors.white, borderColor: colors.border, opacity: r.active ? 1 : 0.5 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.upcomingLabel, { color: colors.textPrimary }]}>{r.label}</Text>
                    <Text style={[styles.upcomingDate, { color: colors.textSecondary }]}>{r.date}</Text>
                  </View>
                  <Text style={[styles.upcomingDays, { color: colors.pink }]}>
                    {r.daysUntil === 0 ? 'Today' : `In ${r.daysUntil}d`}
                  </Text>
                </View>
              ))}
            </>
          )}
        </>
      )}

      <View style={[styles.noteCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
          💡 Notifications work even when the app is closed since they are scheduled
          on your device using your phone's notification system.
        </Text>
      </View>

    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  backBtn: { paddingVertical: 8, marginBottom: 4 },
  backBtnText: { fontSize: 14 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  mainCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mainTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  mainDesc: { fontSize: 12 },
  blockedNote: { borderRadius: 10, padding: 10, marginTop: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  itemLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemDesc: { fontSize: 11 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  timeBtn: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  upcomingLabel: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  upcomingDate: { fontSize: 12 },
  upcomingDays: { fontSize: 13, fontWeight: '700' },
  noteCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 8 },
})

export default NotificationSettings