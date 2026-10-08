import { useState, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import * as Notifications from 'expo-notifications'
import { useLanguage } from '../context/LanguageContext'
import { Screen, AppText, Card, EmptyState, FadeIn, IconBadge, IconButton } from '../components/ui'
import { clearUnreadNotifications } from '../utils/notifications'
import { formatDate } from '../utils/dates'
import { BackHeader } from './profile/shared'

const TYPE_STYLE = {
  period: { icon: 'drop', tone: 'period' },
  ovulation: { icon: 'egg', tone: 'ovulation' },
  fertile: { icon: 'leaf', tone: 'fertile' },
  daily_log: { icon: 'note', tone: 'primary' },
  medication: { icon: 'pill', tone: 'success' },
  water: { icon: 'water', tone: 'info' },
}

// Notification titles carry a leading emoji; the icon badge replaces it here.
const isDecor = (c) => c <= 32 || (c >= 0x2000 && c <= 0x33ff) || (c >= 0xd800 && c <= 0xdfff) || c === 0xfe0f
const stripEmoji = (s) => {
  const str = String(s || '')
  let i = 0
  while (i < str.length && isDecor(str.charCodeAt(i))) i++
  return str.slice(i).trim()
}

const NotificationHistory = ({ navigation }) => {
  const { t, language } = useLanguage()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    let alive = true
    ;(async () => {
      try {
        const presented = await Notifications.getPresentedNotificationsAsync()
        const sorted = (Array.isArray(presented) ? presented : []).slice().sort((a, b) => (b?.date || 0) - (a?.date || 0))
        if (alive) setItems(sorted)
      } catch (err) {
        console.error('Error loading notification history:', err)
      } finally {
        if (alive) setLoading(false)
      }
      // Viewing the list marks them as read.
      clearUnreadNotifications().catch(() => {})
    })()
    return () => { alive = false }
  }, []))

  const open = (data) => {
    const screen = data?.screen
    try {
      if (screen === 'Medications') navigation.navigate('Medications')
      else if (screen === 'Calendar') navigation.navigate('CalendarTab', { screen: 'Calendar' })
      else if (screen === 'Log' || screen === 'Track') navigation.navigate('TrackTab', { screen: 'Track', params: { view: 'log' } })
    } catch (e) {
      console.warn('Notification navigation failed', e)
    }
  }

  return (
    <Screen
      header={(
        <BackHeader
          navigation={navigation}
          title={t('pf_recent_notifications')}
          right={<IconButton name="gear" onPress={() => navigation.navigate('Reminders')} accessibilityLabel={t('reminders_label')} />}
        />
      )}
    >
      {loading ? null : items.length === 0 ? (
        <FadeIn index={0}>
          <EmptyState icon="bell" title={t('no_notifications_yet')} body={t('pf_history_empty')} />
        </FadeIn>
      ) : (
        <View style={{ gap: 10, marginTop: 4 }}>
          {items.map((item, i) => {
            const content = item?.request?.content || {}
            const data = content.data || {}
            const ts = TYPE_STYLE[data.type] || { icon: 'bell', tone: 'primary' }
            const tappable = ['Medications', 'Calendar', 'Log', 'Track'].includes(data.screen)
            const when = item?.date ? formatDate(item.date, 'MMM D, HH:mm', language) : ''
            const title = stripEmoji(content.title) || t('notification_default')
            return (
              <FadeIn key={item?.request?.identifier || i} index={i}>
                <Card
                  onPress={tappable ? () => open(data) : undefined}
                  accessibilityLabel={[title, content.body, when].filter(Boolean).join('. ')}
                >
                  <View style={styles.row}>
                    <IconBadge name={ts.icon} tone={ts.tone} size={40} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText variant="subheading" numberOfLines={1}>{title}</AppText>
                      {content.body ? <AppText variant="caption" muted numberOfLines={2} style={{ marginTop: 2 }}>{content.body}</AppText> : null}
                      {when ? <AppText variant="small" faint style={{ marginTop: 4 }}>{when}</AppText> : null}
                    </View>
                  </View>
                </Card>
              </FadeIn>
            )
          })}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
})

export default NotificationHistory
