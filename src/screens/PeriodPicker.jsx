import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'

const PeriodPicker = ({ cycleSettings, setCycleSettings, navigation }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const [currentMonth, setCurrentMonth] = useState(dayjs())

  const lastPeriodStart = cycleSettings?.lastPeriodStart || dayjs().format('YYYY-MM-DD')
  const periodLength = cycleSettings?.periodLength || 5

  // Selected days are stored as 'YYYY-MM-DD' strings, in tap order
  const [selectedDates, setSelectedDates] = useState(() => {
    const start = dayjs(lastPeriodStart)
    const dates = []
    for (let i = 0; i < periodLength; i++) {
      dates.push(start.add(i, 'day').format('YYYY-MM-DD'))
    }
    return dates
  })

  const today = dayjs()
  const startDayOfWeek = currentMonth.startOf('month').day()
  const daysInMonth = currentMonth.daysInMonth()
  const weekDays = [
    t('weekday_short_sun'), t('weekday_short_mon'), t('weekday_short_tue'),
    t('weekday_short_wed'), t('weekday_short_thu'), t('weekday_short_fri'), t('weekday_short_sat'),
  ]

  const toggleDate = (dateStr) => {
    setSelectedDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr)
      }
      return [...prev, dateStr].sort()
    })
  }

  const handleSave = async () => {
    if (selectedDates.length === 0) {
      navigation.goBack()
      return
    }
    const sorted = [...selectedDates].sort()
    const newStart = sorted[0]
    const newLength = sorted.length

    await setCycleSettings(prev => ({
      ...prev,
      lastPeriodStart: newStart,
      periodLength: newLength,
    }))
    navigation.goBack()
  }

  const styles = makeStyles(colors)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Week day labels */}
      <View style={styles.weekRow}>
        {weekDays.map(d => (
          <Text key={d} style={[styles.weekLabel, { color: colors.textSecondary }]}>
            {d}
          </Text>
        ))}
      </View>

      {/* Hint banner */}
      <View style={[styles.hintBanner, { backgroundColor: colors.background }]}>
        <Text style={[styles.hintText, { color: colors.textPrimary }]}>
            {t('tap_to_adjust_period')}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>

        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setCurrentMonth(p => p.subtract(1, 'month'))}>
            <Text style={{ fontSize: 18, color: colors.textSecondary }}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthName, { color: colors.textPrimary }]}>
            {currentMonth.format('MMM')}
          </Text>
          <TouchableOpacity onPress={() => setCurrentMonth(p => p.add(1, 'month'))}>
            <Text style={{ fontSize: 18, color: colors.textSecondary }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <View style={styles.grid}>
          {[...Array(startDayOfWeek)].map((_, i) => (
            <View key={`empty-${i}`} style={styles.dayCellWrap} />
          ))}
          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1
            const dateObj = currentMonth.date(day)
            const dateStr = dateObj.format('YYYY-MM-DD')
            const isToday = dateObj.isSame(today, 'day')
            const isSelected = selectedDates.includes(dateStr)
            const orderNum = isSelected
              ? [...selectedDates].sort().indexOf(dateStr) + 1
              : null

            return (
              <View key={day} style={styles.dayCellWrap}>
                {isToday && (
                  <Text style={[styles.todayLabel, { color: colors.textPrimary }]}>{t('today').toUpperCase()}</Text>
                )}
                <Text style={[
                  styles.dayNum,
                  { color: isSelected ? colors.pink : colors.textPrimary },
                  isToday && { fontWeight: '700' },
                ]}>
                  {day}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dayCircle,
                    {
                      borderColor: colors.border,
                      backgroundColor: isSelected ? colors.pink : 'transparent',
                    },
                  ]}
                  onPress={() => toggleDate(dateStr)}
                >
                  {isSelected && (
                    <>
                      <Text style={styles.checkMark}>✓</Text>
                      <View style={styles.orderBadge}>
                        <Text style={styles.orderBadgeText}>{orderNum}</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )
          })}
        </View>

      </ScrollView>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.pink }]}
        onPress={handleSave}
      >
        <Text style={styles.saveBtnText}>{t('save')}</Text>
      </TouchableOpacity>

    </View>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { paddingHorizontal: 16, marginBottom: 16 },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  hintBanner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  hintText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 16,
  },
  monthName: { fontSize: 17, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  dayCellWrap: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  todayLabel: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  dayNum: { fontSize: 16, fontWeight: '500', marginBottom: 6 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkMark: { color: 'white', fontSize: 16, fontWeight: '700' },
  orderBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: { color: 'white', fontSize: 9, fontWeight: '700' },
  saveBtn: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
})

export default PeriodPicker