import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'

const Timeline = ({ cycleSettings, dailyLogs, navigation }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const [search, setSearch] = useState('')

  const cycleLength = cycleSettings?.cycleLength || 28
  const periodLength = cycleSettings?.periodLength || 5
  const lastPeriodStart = cycleSettings?.lastPeriodStart || dayjs().format('YYYY-MM-DD')
  const lpsDate = dayjs(lastPeriodStart)

  // Build timeline events from real dailyLogs + calculated period starts/ends
  const buildEvents = () => {
    const events = []

    // Real logged events
    if (dailyLogs) {
      Object.entries(dailyLogs).forEach(([date, log]) => {
        if (log.pregnancyTest && log.pregnancyTest !== 'notaken') {
          events.push({
            date,
            label: `${t('pregnancy_test')}: ${t('test_' + log.pregnancyTest) || log.pregnancyTest}`,
            color: log.pregnancyTest === 'positive' ? '#10B981' : '#EF4444',
          })
        }
        if (log.mucus) {
          events.push({
            date,
            label: `💧 ${t('cervical_mucus')}: ${t('mucus_' + log.mucus) || log.mucus}`,
            color: '#0EA5E9',
          })
        }
        if (log.bbt) {
          events.push({
            date,
            label: `🌡️ ${t('bbt_temperature')}: ${log.bbt}°C`,
            color: '#F59E0B',
          })
        }
        if (log.periodStatus === 'started') {
          events.push({ date, label: t('period_starts'), color: colors.pink })
        }
        if (log.periodStatus === 'ended') {
          events.push({ date, label: t('period_ends'), color: colors.pink })
        }
        const allSymptoms = [
          ...(log.symptoms || []),
          ...(log.symptomsDetailed || []),
        ]
        if (allSymptoms.length > 0) {
          events.push({
            date,
            label: `${t('symptoms')}:`,
            desc: allSymptoms.map(s => `+ ${s}`).join('\n'),
            color: '#7C3AED',
          })
        }
        if (log.moods && log.moods.length > 0) {
          events.push({
            date,
            label: `${t('mood')}:`,
            desc: log.moods.map(m => t(`mood_${m}`)).join(', '),
            color: '#F59E0B',
          })
        }
      })
    }

    // Calculated period starts (going back several cycles) if not already logged
    const today = dayjs()
    let cursor = lpsDate
    const loggedDates = new Set(events.map(e => e.date))
    for (let i = 0; i < 6; i++) {
      const dateStr = cursor.format('YYYY-MM-DD')
      if (!loggedDates.has(dateStr) && cursor.isBefore(today.add(1, 'day'))) {
        events.push({ date: dateStr, label: t('period_starts'), color: colors.pink })
      }
      cursor = cursor.subtract(cycleLength, 'day')
    }

    return events
      .filter(e => e.label.toLowerCase().includes(search.toLowerCase()) || search === '')
      .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
  }

  const events = buildEvents()

  const styles = makeStyles(colors)

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('timeline')}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Log')}>
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Event list */}
      {events.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 40 }}>📍</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No events found
          </Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {events.map((event, i) => {
            const d = dayjs(event.date)
            return (
              <TouchableOpacity
                key={i}
                style={[styles.eventCard, { backgroundColor: colors.white, borderColor: colors.border }]}
                onPress={() => navigation?.getParent()?.navigate('Calendar', { initialDate: event.date })}
                activeOpacity={0.7}
              >
                <View style={[styles.dateBlock, { backgroundColor: event.color }]}>
                  <Text style={styles.dateDay}>{d.format('ddd')}</Text>
                  <Text style={styles.dateNum}>{d.format('DD')}</Text>
                  <Text style={styles.dateMonth}>{d.format('MMM')}</Text>
                </View>
                <View style={styles.eventContent}>
                  <Text style={[styles.eventLabel, { color: event.color }]}>
                    {event.label}
                  </Text>
                  {event.desc && (
                    <Text style={[styles.eventDesc, { color: colors.textSecondary }]}>
                      {event.desc}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
  },
  searchInput: { flex: 1, fontSize: 14 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 13 },
  eventCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 100,
  },
  dateBlock: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  dateDay: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 2 },
  dateNum: { color: 'white', fontSize: 28, fontWeight: '800', lineHeight: 32 },
  dateMonth: { color: 'white', fontSize: 14, fontWeight: '700', marginTop: 2 },
  eventContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 18 },
  eventLabel: { fontSize: 16, fontWeight: '600' },
  eventDesc: { fontSize: 13, marginTop: 4, lineHeight: 20 },
})

export default Timeline