import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import dayjs from 'dayjs'
import * as Notifications from 'expo-notifications'
import { useTheme } from '../context/ThemeContext'
import { clearUnreadNotifications } from '../utils/notifications'

const TYPE_ICONS = {
  period: '🩸',
  ovulation: '✨',
  fertile: '🌱',
  daily_log: '📝',
  medication: '💊',
  water: '💧',
}

const NotificationHistory = ({ navigation }) => {
  const { colors } = useTheme()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    try {
      const presented = await Notifications.getPresentedNotificationsAsync()
      const sorted = [...presented].sort((a, b) =>
        (b.date || 0) - (a.date || 0)
      )
      setNotifications(sorted)
    } catch (err) {
      console.error('Error loading notification history:', err)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadNotifications()
      // Clear the unread badge once the user actually views this screen
      clearUnreadNotifications().then(() => {
        // Re-fetch is unnecessary since we already captured the list above,
        // but dismissing marks them as read for the badge count.
      })
    }, [])
  )

  const handleTapNotification = (item) => {
    const data = item.request?.content?.data
    if (!data?.screen) return

    if (data.screen === 'Medications') {
      navigation?.getParent()?.navigate('Home', { screen: 'Medications' })
    } else if (data.screen === 'Calendar') {
      navigation?.getParent()?.navigate('Calendar')
    } else if (data.screen === 'Log') {
      navigation?.getParent()?.navigate('Log')
    }
  }

  const styles = makeStyles(colors)

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Notifications
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('NotificationSettings')}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {loading ? null : notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 40 }}>🔔</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No notifications yet
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {notifications.map((item, i) => {
            const content = item.request?.content
            const data = content?.data
            const icon = TYPE_ICONS[data?.type] || '🔔'
            const date = item.date ? dayjs(item.date) : null

            return (
              <TouchableOpacity
                key={item.request?.identifier || i}
                style={[styles.notifCard, { backgroundColor: colors.white, borderColor: colors.border }]}
                onPress={() => handleTapNotification(item)}
                activeOpacity={data?.screen ? 0.7 : 1}
              >
                <Text style={{ fontSize: 24 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>
                    {content?.title || 'Notification'}
                  </Text>
                  <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>
                    {content?.body || ''}
                  </Text>
                  {date && (
                    <Text style={[styles.notifTime, { color: colors.textSecondary }]}>
                      {date.format('MMM D, h:mm A')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 13 },
  notifCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  notifTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  notifBody: { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  notifTime: { fontSize: 11 },
})

export default NotificationHistory