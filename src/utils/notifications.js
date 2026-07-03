import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import dayjs from 'dayjs'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export const requestNotificationPermission = async () => {
  if (!Device.isDevice) return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export const getNotificationPermission = async () => {
  const { status } = await Notifications.getPermissionsAsync()
  return status
}

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

const scheduleNotification = async (id, title, body, triggerDate, data = {}) => {
  const now = new Date()
  if (triggerDate <= now) return
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, sound: true, data },
      trigger: { type: 'date', date: triggerDate },
    })
  } catch (err) {
    console.error('Schedule error:', err)
  }
}

export const scheduleAllReminders = async (cycleSettings, prefs) => {
  await cancelAllNotifications()
  const { cycleLength = 28, lastPeriodStart } = cycleSettings
  if (!lastPeriodStart) return
  const lpsDate = dayjs(lastPeriodStart)
  const today = dayjs()
  let nextPeriod = lpsDate.add(cycleLength, 'day')
  while (nextPeriod.isBefore(today, 'day')) {
    nextPeriod = nextPeriod.add(cycleLength, 'day')
  }
  const ovulationDate = lpsDate.add(cycleLength - 14, 'day')
  const fertileStart = ovulationDate.subtract(5, 'day')
  if (prefs.periodReminder) {
    await scheduleNotification('period-2days', '🩸 Period coming soon',
      `Your period is expected in 2 days on ${nextPeriod.format('MMMM D')}.`,
      nextPeriod.subtract(2, 'day').hour(8).minute(0).toDate(),
      { screen: 'Calendar', type: 'period' })
    await scheduleNotification('period-1day', '🩸 Period tomorrow',
      'Your period is expected tomorrow. Stock up on pads!',
      nextPeriod.subtract(1, 'day').hour(8).minute(0).toDate(),
      { screen: 'Calendar', type: 'period' })
    await scheduleNotification('period-today', '🩸 Period expected today',
      'Today is your expected period start date.',
      nextPeriod.hour(7).minute(0).toDate(),
      { screen: 'Calendar', type: 'period' })
  }
  if (prefs.ovulationReminder) {
    await scheduleNotification('ovulation-tomorrow', '✨ Ovulation tomorrow',
      'Tomorrow is your estimated ovulation day — most fertile day.',
      ovulationDate.subtract(1, 'day').hour(8).minute(0).toDate(),
      { screen: 'Calendar', type: 'ovulation' })
    await scheduleNotification('ovulation-today', '✨ Ovulation day!',
      'Today is your estimated ovulation day. Peak fertility!',
      ovulationDate.hour(7).minute(30).toDate(),
      { screen: 'Calendar', type: 'ovulation' })
  }
  if (prefs.fertileReminder) {
    await scheduleNotification('fertile-start', '🌱 Fertile window starts today',
      `Your fertile window has started. Lasts until ${ovulationDate.add(1, 'day').format('MMMM D')}.`,
      fertileStart.hour(8).minute(0).toDate(),
      { screen: 'Calendar', type: 'fertile' })
  }
  if (prefs.dailyReminder) {
    const hour = prefs.dailyReminderHour != null ? prefs.dailyReminderHour : (prefs.dailyReminderTime || 20)
    const minute = prefs.dailyReminderMinute || 0
    const reminderDate = today.hour(hour).minute(minute).second(0)
    await scheduleNotification('daily-log', '📝 Daily log reminder',
      "Don't forget to log your mood and symptoms today!",
      reminderDate.isAfter(today) ? reminderDate.toDate() : reminderDate.add(1, 'day').toDate(),
      { screen: 'Log', type: 'daily_log' })
  }
  if (prefs.waterReminder) {
    const waterHour = prefs.waterReminderHour != null ? prefs.waterReminderHour : 11
    const waterMinute = prefs.waterReminderMinute || 0
    const waterReminderDate = today.hour(waterHour).minute(waterMinute).second(0)
    await scheduleNotification('water-reminder', '💧 Stay hydrated',
      'Time to drink some water!',
      waterReminderDate.isAfter(today) ? waterReminderDate.toDate() : waterReminderDate.add(1, 'day').toDate(),
      { screen: 'Log', type: 'water' })
  }
}

export const scheduleMedicationReminders = async (medications) => {
  const perm = await getNotificationPermission()
  if (perm !== 'granted') return
  for (const med of medications) {
    if (!med.active || !med.reminderTime) continue
    const [hour, minute] = med.reminderTime.split(':').map(Number)
    const today = dayjs()
    const startDate = med.startDate ? dayjs(med.startDate) : today

    let t = startDate.hour(hour).minute(minute).second(0)
    // If the start date's reminder time has already passed today
    // (or the start date is in the past), push forward to the next
    // valid occurrence — either later today or tomorrow.
    if (t.isBefore(today)) {
      const todayAtTime = today.hour(hour).minute(minute).second(0)
      t = todayAtTime.isBefore(today) ? todayAtTime.add(1, 'day') : todayAtTime
    }

    await scheduleNotification(`med-${med.id}`,
      `💊 Time for your ${med.name}`,
      `Don't forget to take your ${med.name} today!`,
      t.toDate(),
      { screen: 'Medications', type: 'medication', medicationId: med.id })
  }
}

export const sendTestNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌸 My Cycle: Period Tracker notifications enabled!',
      body: 'You will receive period reminders and medication alerts.',
    },
    trigger: { type: 'timeInterval', seconds: 2, repeats: false },
  })
}

export const getUnreadNotificationCount = async () => {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync()
    return presented.length
  } catch (err) {
    console.error('Error getting presented notifications:', err)
    return 0
  }
}

export const clearUnreadNotifications = async () => {
  try {
    await Notifications.dismissAllNotificationsAsync()
  } catch (err) {
    console.error('Error clearing notifications:', err)
  }
}
