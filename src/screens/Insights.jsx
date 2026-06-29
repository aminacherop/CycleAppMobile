import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { LineChart, BarChart } from 'react-native-chart-kit'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'

const { width } = Dimensions.get('window')
const CHART_WIDTH = width - 64

const Insights = ({ cycleSettings, dailyLogs }) => {
  const { colors, isDark } = useTheme()
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('overview')

  const cycleLength = cycleSettings?.cycleLength || 28
  const periodLength = cycleSettings?.periodLength || 5
  const lastPeriodStart = cycleSettings?.lastPeriodStart ||
    dayjs().subtract(14, 'day').format('YYYY-MM-DD')
  const lpsDate = dayjs(lastPeriodStart)

  // Simulated 6-month cycle data
  const cycleData = Array.from({ length: 6 }, (_, i) => {
    const variation = Math.floor(Math.random() * 3) - 1
    return {
      month: lpsDate.subtract((5 - i) * cycleLength, 'day').format('MMM'),
      cycleLength: cycleLength + variation,
    }
  })

  const avgCycle = Math.round(
    cycleData.reduce((s, d) => s + d.cycleLength, 0) / cycleData.length
  )

  const currentCycleDay = dayjs().diff(lpsDate, 'day') + 1
  const currentPhase =
    currentCycleDay <= periodLength ? 'Menstrual' :
    currentCycleDay <= cycleLength - 16 ? 'Follicular' :
    currentCycleDay <= cycleLength - 12 ? 'Ovulation' : 'Luteal'

  const phaseColors = {
    Menstrual: '#C2527A',
    Follicular: '#7C3AED',
    Ovulation: '#F59E0B',
    Luteal: '#10B981',
  }

  const phaseColor = phaseColors[currentPhase]

  const symptomData = [
    { name: 'Cramps', count: 5 },
    { name: 'Headache', count: 3 },
    { name: 'Bloating', count: 4 },
    { name: 'Fatigue', count: 6 },
  ]

  const chartConfig = {
    backgroundColor: colors.white,
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(194, 82, 122, ${opacity})`,
    labelColor: (opacity = 1) => isDark
      ? `rgba(156, 163, 175, ${opacity})`
      : `rgba(107, 114, 128, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#C2527A' },
  }

  const styles = makeStyles(colors)

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('insights')}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        {t('based_on_cycles')} 6 {t('cycles')}
      </Text>

      {/* Current phase card */}
      <View style={[styles.phaseCard, { backgroundColor: phaseColor + '15', borderColor: phaseColor + '40' }]}>
        <Text style={[styles.phaseLabel, { color: colors.textSecondary }]}>{t('current_phase')}</Text>
        <Text style={[styles.phaseName, { color: phaseColor }]}>{currentPhase} phase</Text>
        <Text style={[styles.phaseDay, { color: colors.textSecondary }]}>
          Day {currentCycleDay} of {cycleLength}
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.white, borderColor: colors.border }]}>
        {[
          { id: 'overview', label: '📊 ' + t('overview') },
          { id: 'symptoms', label: '⚡ ' + t('symptoms') },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && { backgroundColor: colors.pinkLight },
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.id ? colors.pinkDark : colors.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'overview' && (
        <>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {[
              { icon: '🔄', value: avgCycle, label: t('avg_cycle') },
              { icon: '🩸', value: periodLength, label: t('avg_period') },
              { icon: '✨', value: `Day ${cycleLength - 14}`, label: t('avg_ovulation') },
              { icon: '🌱', value: '7 days', label: t('fertile_window_avg') },
            ].map((stat, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <Text style={[styles.statValue, { color: colors.pink }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Cycle trend chart */}
          <View style={[styles.chartCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
              🔄 {t('cycle_trend')}
            </Text>
            <LineChart
              data={{
                labels: cycleData.map(d => d.month),
                datasets: [{ data: cycleData.map(d => d.cycleLength) }],
              }}
              width={CHART_WIDTH}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        </>
      )}

      {activeTab === 'symptoms' && (
        <View style={[styles.chartCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
            ⚡ {t('common_symptoms')}
          </Text>
          <BarChart
            data={{
              labels: symptomData.map(d => d.name),
              datasets: [{ data: symptomData.map(d => d.count) }],
            }}
            width={CHART_WIDTH}
            height={180}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
          />
        </View>
      )}

    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { fontSize: 13, marginBottom: 16, marginTop: 2 },
  phaseCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  phaseLabel: { fontSize: 12, marginBottom: 4 },
  phaseName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  phaseDay: { fontSize: 12 },
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
  tabText: { fontSize: 13, fontWeight: '500' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '47%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, textAlign: 'center' },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  chart: { borderRadius: 12 },
})

export default Insights