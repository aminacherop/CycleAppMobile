import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import dayjs from 'dayjs'
import { usePremium } from '../context/PremiumContext'
import { generateAndShareReport } from '../utils/healthReport'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'

const MyCycles = ({ cycleSettings, dailyLogs, userProfile, installDate, navigation }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const { isPremium } = usePremium()
  const [filter, setFilter] = useState('all')
  const [exporting, setExporting] = useState(false)

  const cycleLength = cycleSettings?.cycleLength || 28
  const periodLength = cycleSettings?.periodLength || 5
  const lutealLength = cycleSettings?.lutealLength || 14
  const lastPeriodStart = cycleSettings?.lastPeriodStart || dayjs().format('YYYY-MM-DD')
  const lpsDate = dayjs(lastPeriodStart)

  // Generate real cycles since install date (newest first)
  const generateCycles = () => {
    const start = installDate ? dayjs(installDate) : lpsDate
    const today = dayjs()
    const cycles = []
    let cursor = lpsDate
    while (cursor.isBefore(today)) {
      if (cursor.isAfter(start) || cursor.isSame(start, 'day')) {
        const periodEnd = cursor.add(periodLength - 1, 'day')
        const ovulation = cursor.add(cycleLength - lutealLength, 'day')
        cycles.push({
          year: cursor.format('YYYY'),
          dateRange: `${cursor.format('MMM D')} - ${periodEnd.format('MMM D')}`,
          periodLength,
          cycleLength,
          ovulationOffset: cycleLength - lutealLength,
        })
      }
      cursor = cursor.add(cycleLength, 'day')
    }
    return cycles.reverse()
  }

  const cycles = generateCycles()
  const avgPeriod = periodLength
  const avgCycle = cycleLength

  // Group cycles by year
  const groupedByYear = cycles.reduce((acc, c) => {
    if (!acc[c.year]) acc[c.year] = []
    acc[c.year].push(c)
    return acc
  }, {})

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'period', label: t('period') },
    { id: 'ovulation', label: t('ovulation') },
    { id: 'fertile', label: t('fertile') },
  ]


  const handleExportReport = async () => {
    if (!isPremium) {
      navigation.navigate('Paywall', { feature: 'Health report export' })
      return
    }
    setExporting(true)
    await generateAndShareReport({
      userProfile,
      cycleSettings,
      dailyLogs,
      installDate,
    })
    setExporting(false)
  }

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
          {t('my_logged_cycles')}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Summary card */}
      <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {t('my_logged_cycles')}
        </Text>
        <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>
          {cycles.length} cycles logged
        </Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.pinkLight }]}>
            <Text style={{ fontSize: 22 }}>🩸</Text>
            <Text style={[styles.statValue, { color: colors.pinkDark }]}>{avgPeriod} Days</Text>
            <Text style={[styles.statLabel, { color: colors.pink }]}>Average period</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={{ fontSize: 22 }}>🔄</Text>
            <Text style={[styles.statValue, { color: '#92400E' }]}>{avgCycle} Days</Text>
            <Text style={[styles.statLabel, { color: '#B45309' }]}>Average cycle</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addPeriodBtn, { backgroundColor: colors.pink }]}
          onPress={() => navigation.navigate('Log')}
        >
          <Text style={styles.addPeriodIcon}>+</Text>
          <Text style={styles.addPeriodText}>Add Period</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportBtn, { borderColor: colors.pink, backgroundColor: colors.pinkLight }]}
          onPress={handleExportReport}
          disabled={exporting}
        >
          <Text style={{ fontSize: 16 }}>{isPremium ? '📄' : '🔒'}</Text>
          <Text style={[styles.exportBtnText, { color: colors.pinkDark }]}>
            {exporting ? 'Generating PDF...' : 'Export Health Report'}
          </Text>
        </TouchableOpacity>

      </View>

      {/* History card */}
      <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 12 }]}>
          History
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {filterOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filter === option.id ? colors.pink : colors.background,
                  },
                ]}
                onPress={() => setFilter(option.id)}
              >
                <Text style={{
                  color: filter === option.id ? 'white' : colors.textSecondary,
                  fontWeight: filter === option.id ? '700' : '500',
                  fontSize: 13,
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {cycles.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No cycles logged yet
          </Text>
        ) : (
          Object.entries(groupedByYear).map(([year, yearCycles]) => (
            <View key={year} style={{ marginBottom: 16 }}>
              <Text style={[styles.yearLabel, { color: colors.textPrimary }]}>{year}</Text>
              {yearCycles.map((cycle, i) => {
                const periodPct = (cycle.periodLength / cycle.cycleLength) * 100
                const ovulationPct = (cycle.ovulationOffset / cycle.cycleLength) * 100

                return (
                  <View key={i} style={styles.cycleBlock}>
                    <View style={styles.cycleHeaderRow}>
                      <Text style={[styles.cycleDateRange, { color: colors.textPrimary }]}>
                        {cycle.dateRange}
                      </Text>
                      <Text style={[styles.cycleLengthText, { color: colors.textSecondary }]}>
                        {cycle.cycleLength}
                      </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: colors.pinkLight }]}>
                      <View style={[
                        styles.periodBar,
                        { width: `${periodPct}%`, backgroundColor: colors.pink },
                      ]}>
                        <Text style={styles.periodBarText}>{cycle.periodLength}</Text>
                      </View>
                      <View style={[
                        styles.ovulationDot,
                        { left: `${ovulationPct}%`, backgroundColor: '#F59E0B' },
                      ]} />
                    </View>
                  </View>
                )
              })}
            </View>
          ))
        )}
      </View>

    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardSubtext: { fontSize: 13, marginBottom: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  addPeriodBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, marginTop: 10 },
  exportBtnText: { fontSize: 14, fontWeight: '700' },
  addPeriodIcon: { color: 'white', fontSize: 18, fontWeight: '700' },
  addPeriodText: { color: 'white', fontSize: 15, fontWeight: '700' },
  filterChip: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 20 },
  emptyText: { fontSize: 12, fontStyle: 'italic' },
  yearLabel: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  cycleBlock: { marginBottom: 16 },
  cycleHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cycleDateRange: { fontSize: 14, fontWeight: '600' },
  cycleLengthText: { fontSize: 13 },
  barTrack: {
    height: 28,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  periodBar: {
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  periodBarText: { color: 'white', fontSize: 12, fontWeight: '700' },
  ovulationDot: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    top: 3,
    borderWidth: 3,
    borderColor: 'white',
  },
})

export default MyCycles