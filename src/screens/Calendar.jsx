import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { SYMPTOM_CATEGORIES, getSymptomLabel as getLabel } from '../utils/symptomCategories'

const { width } = Dimensions.get('window')
const DAY_SIZE = (width - 32 - 12) / 7

const Calendar = ({ cycleSettings, setCycleSettings, dailyLogs, navigation }) => {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [selectedDay, setSelectedDay] = useState(null)
  const [viewMode, setViewMode] = useState('cycle')

  const cycleLength = cycleSettings?.cycleLength || 28
  const periodLength = cycleSettings?.periodLength || 5
  const lastPeriodStart = cycleSettings?.lastPeriodStart ||
    dayjs().subtract(14, 'day').format('YYYY-MM-DD')

  const today = dayjs()
  const isCurrentMonth = currentMonth.format('YYYY-MM') === today.format('YYYY-MM')
  const startDayOfWeek = currentMonth.startOf('month').day()
  const daysInMonth = currentMonth.daysInMonth()

  const lpsDate = dayjs(lastPeriodStart)
  const monthsDiff = currentMonth.diff(lpsDate, 'day')
  const cycleOffset = Math.floor(monthsDiff / cycleLength)

  const allPeriodDaysInMonth = new Set()
  const allOvulationDays = []
  const allFertileDays = []

  ;[-2, -1, 0, 1, 2, 3].forEach(offset => {
    const cycleStart = lpsDate.add((cycleOffset + offset) * cycleLength, 'day')
    const cycleOvulation = cycleStart.add(cycleLength - 14, 'day')
    const cycleFertileStart = cycleOvulation.subtract(5, 'day')
    const cycleFertileEnd = cycleOvulation.add(1, 'day')

    for (let i = 0; i < periodLength; i++) {
      const d = cycleStart.add(i, 'day')
      if (d.format('YYYY-MM') === currentMonth.format('YYYY-MM')) {
        allPeriodDaysInMonth.add(d.date())
      }
    }

    if (cycleOvulation.format('YYYY-MM') === currentMonth.format('YYYY-MM')) {
      allOvulationDays.push(cycleOvulation.date())
    }

    let fd = cycleFertileStart.clone()
    while (fd.isBefore(cycleFertileEnd) || fd.isSame(cycleFertileEnd, 'day')) {
      if (fd.format('YYYY-MM') === currentMonth.format('YYYY-MM')) {
        allFertileDays.push(fd.date())
      }
      fd = fd.add(1, 'day')
    }
  })

  const ovulationDayOfMonth = allOvulationDays.length > 0 ? allOvulationDays[0] : null
  const fertileDaysOfMonth = [...new Set(allFertileDays)].filter(
    d => !allPeriodDaysInMonth.has(d)
  )

  const relevantCycleStart = lpsDate.add(cycleOffset * cycleLength, 'day')
  const relevantOvulation = relevantCycleStart.add(cycleLength - 14, 'day')
  const relevantFertileStart = relevantOvulation.subtract(5, 'day')
  const relevantFertileEnd = relevantOvulation.add(1, 'day')

  let nextPeriodDate = lpsDate.add(cycleLength, 'day')
  while (nextPeriodDate.isBefore(today, 'day')) {
    nextPeriodDate = nextPeriodDate.add(cycleLength, 'day')
  }

  const cycleData = {
    fertileDays: fertileDaysOfMonth,
    ovulationDay: ovulationDayOfMonth,
    periodDays: [...allPeriodDaysInMonth],
  }

  const summary = {
    periodStart: relevantCycleStart.format('MMM D'),
    periodEnd: relevantCycleStart.add(periodLength - 1, 'day').format('MMM D'),
    ovulation: relevantOvulation.format('MMM D, YYYY'),
    fertileStart: relevantFertileStart.format('MMM D'),
    fertileEnd: relevantFertileEnd.format('MMM D'),
    nextPeriod: nextPeriodDate.format('MMM D, YYYY'),
    daysUntilNext: Math.max(0, nextPeriodDate.diff(today, 'day')),
  }

  const getDayType = (day) => {
    if (cycleData.periodDays.includes(day)) return 'period'
    if (cycleData.ovulationDay === day) return 'ovulation'
    if (cycleData.fertileDays.includes(day)) return 'fertile'
    return null
  }

  const getDayColors = (type) => {
    switch (type) {
      case 'period': return { bg: '#C2527A', text: 'white' }
      case 'ovulation': return { bg: '#FEF3C7', text: '#92400E' }
      case 'fertile': return { bg: '#D1FAE5', text: '#065F46' }
      default: return null
    }
  }

  const getConceptionPercent = (day) => {
    const ov = cycleData.ovulationDay
    if (ov === null) return { percent: 1, level: 'Minimal', color: '#D1D5DB' }
    const diff = Math.abs(day - ov)
    if (day === ov) return { percent: 33, level: 'Peak', color: '#EF4444' }
    if (diff === 1) return { percent: 28, level: 'Very High', color: '#EF4444' }
    if (diff === 2) return { percent: 20, level: 'High', color: '#F97316' }
    if (diff <= 4) return { percent: 12, level: 'Medium', color: '#F59E0B' }
    if (diff <= 5) return { percent: 5, level: 'Low', color: '#10B981' }
    return { percent: 1, level: 'Minimal', color: '#D1D5DB' }
  }

  const allDetailedSymptoms = SYMPTOM_CATEGORIES.flatMap(c => c.items)
  const getSymptomLabel = (id) => {
    const item = allDetailedSymptoms.find(s => s.id === id)
    return item ? `${item.emoji} ${getLabel(item, language)}` : id
  }

  const styles = makeStyles(colors)

  const weekDays = [
    t('weekday_short_sun'), t('weekday_short_mon'), t('weekday_short_tue'),
    t('weekday_short_wed'), t('weekday_short_thu'), t('weekday_short_fri'), t('weekday_short_sat'),
  ]

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {navigation && navigation.canGoBack && navigation.canGoBack() && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('calendar')}</Text>
      {(!dailyLogs || Object.keys(dailyLogs).length === 0) && (
        <View style={[styles.hintBanner, { backgroundColor: colors.pinkLight, borderColor: colors.pink }]}>
          <Text style={{ fontSize: 18 }}>👋</Text>
          <Text style={[styles.hintText, { color: colors.pinkDark }]}>
            Tap any day to add a log, or check the colors below to see your predicted period, fertile window, and ovulation day.
          </Text>
        </View>
      )}

      {/* View tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.white, borderColor: colors.border }]}>
        {[
          { id: 'cycle', label: '📅 ' + t('cycle_tab') },
          { id: 'conception', label: '🌱 ' + t('conception_tab') },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              viewMode === tab.id && { backgroundColor: colors.pinkLight },
            ]}
            onPress={() => { setViewMode(tab.id); setSelectedDay(null) }}
          >
            <Text style={[
              styles.tabText,
              { color: viewMode === tab.id ? colors.pinkDark : colors.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          style={[styles.monthBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
          onPress={() => { setCurrentMonth(p => p.subtract(1, 'month')); setSelectedDay(null) }}
        >
          <Text style={{ fontSize: 18, color: colors.textPrimary }}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthName, { color: colors.textPrimary }]}>
          {currentMonth.format('MMMM YYYY')}
        </Text>
        <TouchableOpacity
          style={[styles.monthBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
          onPress={() => { setCurrentMonth(p => p.add(1, 'month')); setSelectedDay(null) }}
        >
          <Text style={{ fontSize: 18, color: colors.textPrimary }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={styles.weekRow}>
        {weekDays.map(d => (
          <Text key={d} style={[styles.weekLabel, { color: colors.textSecondary, width: DAY_SIZE }]}>
            {d}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {[...Array(startDayOfWeek)].map((_, i) => (
          <View key={`empty-${i}`} style={{ width: DAY_SIZE, height: DAY_SIZE }} />
        ))}
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1
          const isToday = isCurrentMonth && today.date() === day
          const isSelected = selectedDay === day
          const type = getDayType(day)
          const dayColors = getDayColors(type)
          const conception = getConceptionPercent(day)

          let bgColor = colors.white
          let textColor = colors.textPrimary

          if (viewMode === 'conception') {
            if (conception.percent > 5) {
              bgColor = conception.color
              textColor = 'white'
            }
          } else if (dayColors) {
            bgColor = dayColors.bg
            textColor = dayColors.text
          }

          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayCell,
                {
                  width: DAY_SIZE,
                  height: DAY_SIZE,
                  backgroundColor: bgColor,
                  borderWidth: isToday ? 2 : isSelected ? 1.5 : 0,
                  borderColor: isToday ? colors.pink : colors.textPrimary,
                },
              ]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayNum, { color: textColor }]}>{day}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Legend */}
      {viewMode === 'cycle' && (
        <View style={styles.legend}>
          {[
            { color: '#C2527A', label: t('period') },
            { color: '#FEF3C7', label: t('ovulation') },
            { color: '#D1FAE5', label: t('fertile') },
          ].map(item => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Day detail */}
      {selectedDay && (() => {
        const selectedDate = currentMonth.date(selectedDay)
        const cycleDay = selectedDate.diff(lpsDate, 'day') + 1
        const type = getDayType(selectedDay)
        const conception = getConceptionPercent(selectedDay)
        const dateKey = selectedDate.format('YYYY-MM-DD')
        const savedLog = dailyLogs && dailyLogs[dateKey] ? dailyLogs[dateKey] : null

        return (
          <View style={[styles.dayDetail, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={[styles.dayDetailDate, { color: colors.textPrimary }]}>
              {selectedDate.format('dddd, MMMM D')}
            </Text>
            <Text style={[styles.dayDetailCycle, { color: colors.pink }]}>
              {cycleDay > 0 && cycleDay <= cycleLength
                ? `${t('cycle_day')} ${cycleDay}`
                : t('outside_cycle')}
            </Text>

            <View style={[styles.conceptionCard, { borderColor: conception.color + '40', backgroundColor: conception.color + '10' }]}>
              <Text style={[styles.conceptionLabel, { color: colors.textSecondary }]}>
                {t('chances_pregnant')}
              </Text>
              <Text style={[styles.conceptionLevel, { color: conception.color }]}>
                {conception.level} — {conception.percent}%
              </Text>

            </View>
            {savedLog ? (
              <View style={[styles.savedLogCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {savedLog.flow && savedLog.flow !== 'none' ? (
                  <View style={styles.savedLogRow}>
                    <Text style={[styles.savedLogLabel, { color: colors.textSecondary }]}>{t('period_flow')}</Text>
                    <Text style={[styles.savedLogValue, { color: colors.textPrimary }]}>{t(`flow_${savedLog.flow}`)}</Text>
                  </View>
                ) : null}
                {savedLog.moods && savedLog.moods.length > 0 ? (
                  <View style={styles.savedLogRow}>
                    <Text style={[styles.savedLogLabel, { color: colors.textSecondary }]}>{t('mood')}</Text>
                    <Text style={[styles.savedLogValue, { color: colors.textPrimary }]}>
                      {savedLog.moods.map(m => t(`mood_${m}`)).join(', ')}
                    </Text>
                  </View>
                ) : null}
                {(() => {
                  const flatSymptoms = (savedLog.symptoms || []).map(s => t(`symptom_${s}`))
                  const detailedSymptoms = (savedLog.symptomsDetailed || []).map(getSymptomLabel)
                  const allSymptoms = [...flatSymptoms, ...detailedSymptoms]
                  if (allSymptoms.length === 0) return null
                  return (
                    <View style={styles.savedLogRow}>
                      <Text style={[styles.savedLogLabel, { color: colors.textSecondary }]}>{t('symptoms')}</Text>
                      <Text style={[styles.savedLogValue, { color: colors.textPrimary }]}>{allSymptoms.join(', ')}</Text>
                    </View>
                  )
                })()}
                {savedLog.water > 0 ? (
                  <View style={styles.savedLogRow}>
                    <Text style={[styles.savedLogLabel, { color: colors.textSecondary }]}>{t('water_intake')}</Text>
                    <Text style={[styles.savedLogValue, { color: colors.textPrimary }]}>{savedLog.water}/8</Text>
                  </View>
                ) : null}
                {savedLog.sleep > 0 ? (
                  <View style={styles.savedLogRow}>
                    <Text style={[styles.savedLogLabel, { color: colors.textSecondary }]}>{t('sleep_hours')}</Text>
                    <Text style={[styles.savedLogValue, { color: colors.textPrimary }]}>{savedLog.sleep}h</Text>
                  </View>
                ) : null}
                {savedLog.notes ? (
                  <View style={styles.savedLogRow}>
                    <Text style={[styles.savedLogLabel, { color: colors.textSecondary }]}>{t('notes')}</Text>
                    <Text style={[styles.savedLogValue, { color: colors.textPrimary }]}>{savedLog.notes}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.noLogText, { color: colors.textSecondary }]}>
                {t('no_log')}
              </Text>
            )}
            </View>
        //   </View>
        )
      })()}

      {/* Cycle summary */}
      {viewMode === 'cycle' && !selectedDay && (
        <View style={[styles.summaryCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
            📊 {t('cycle_summary')}
          </Text>
          <View style={styles.summaryGrid}>
            {[
              { icon: '🩸', label: t('period'), value: `${summary.periodStart} – ${summary.periodEnd}` },
              { icon: '✨', label: t('ovulation'), value: summary.ovulation },
              { icon: '🌱', label: t('fertile_window'), value: `${summary.fertileStart} – ${summary.fertileEnd}` },
              { icon: '⏭️', label: t('next_period'), value: summary.nextPeriod, highlight: true },
              { icon: '⏳', label: t('days_until_next'), value: `${summary.daysUntilNext} days`, highlight: true },
            ].map((item, i) => (
              <View key={i} style={[styles.summaryItem, { backgroundColor: colors.background }]}>
                <Text style={styles.summaryIcon}>{item.icon}</Text>
                <Text style={[styles.summaryItemLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                <Text style={[
                  styles.summaryItemValue,
                  { color: item.highlight ? colors.pink : colors.textPrimary }
                ]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

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
  savedLogCard: { marginTop: 12, borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  savedLogRow: { flexDirection: 'row', justifyContent: 'space-between' },
  savedLogLabel: { fontSize: 12, fontWeight: '500' },
  savedLogValue: { fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
  noLogText: { marginTop: 12, fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 5,
    gap: 6,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthName: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
  },
  dayDetail: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  dayDetailDate: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  dayDetailCycle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  conceptionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  conceptionLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  conceptionLevel: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryItem: {
    width: '47%',
    borderRadius: 12,
    padding: 12,
    gap: 3,
  },
  summaryIcon: {
    fontSize: 18,
  },
  summaryItemLabel: {
    fontSize: 11,
  },
  summaryItemValue: {
    fontSize: 13,
    fontWeight: '700',
  },
})

export default Calendar