import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'

const { width } = Dimensions.get('window')
const CHART_WIDTH = width - 64

const PHASE_CONTENT = {
  Menstrual: {
    title: 'Menstrual phase',
    desc: 'The uterine lining is shedding during this stage, resulting in menstrual bleeding. Hormone levels (estrogen and progesterone) are at their lowest point.',
    symptoms: 'You may experience cramps, fatigue, lower back pain, and mood changes due to hormonal shifts and the shedding process.',
  },
  Follicular: {
    title: 'Follicular phase',
    desc: 'The uterine lining is thick and nutrient-rich at this stage, and blood vessels are still growing inside the uterine lining. Estrogen is rising.',
    symptoms: 'You may begin to experience premenstrual syndrome (PMS) symptoms during this time due to hormonal changes.',
  },
  Ovulation: {
    title: 'Ovulation phase',
    desc: 'An egg is released from the ovary during this stage. Estrogen peaks and this is your most fertile window of the cycle.',
    symptoms: 'You may notice clear, stretchy discharge, slight pelvic pain, breast tenderness, or increased sex drive.',
  },
  Luteal: {
    title: 'Luteal phase',
    desc: 'The uterine lining is thick and nutrient-rich at this stage, and blood vessels are still growing inside the uterine lining.',
    symptoms: 'You may experience breast tenderness or sensitivity, mood swings, and abdominal discomfort due to hormonal changes.',
  },
}

const CycleDayDetail = ({ cycleSettings, navigation }) => {
  const { colors } = useTheme()
  const [showMore, setShowMore] = useState(true)

  const cycleLength = cycleSettings?.cycleLength || 28
  const periodLength = cycleSettings?.periodLength || 5
  const lutealLength = cycleSettings?.lutealLength || 14
  const lastPeriodStart = cycleSettings?.lastPeriodStart || dayjs().format('YYYY-MM-DD')
  const lpsDate = dayjs(lastPeriodStart)
  const today = dayjs()

  const cycleDay = Math.max(1, today.diff(lpsDate, 'day') + 1)
  const ovulationDay = cycleLength - lutealLength

  const currentPhase =
    cycleDay <= periodLength ? 'Menstrual' :
    cycleDay <= ovulationDay - 2 ? 'Follicular' :
    cycleDay <= ovulationDay + 2 ? 'Ovulation' : 'Luteal'

  const content = PHASE_CONTENT[currentPhase]

  // Build conception chance curve across the cycle
  const buildCurve = () => {
    const points = []
    for (let day = 1; day <= cycleLength; day++) {
      const diff = Math.abs(day - ovulationDay)
      let chance
      if (diff === 0) chance = 95
      else if (diff === 1) chance = 75
      else if (diff === 2) chance = 50
      else if (diff === 3) chance = 25
      else if (diff <= 5) chance = 10
      else chance = 3
      points.push({ day, chance })
    }
    return points
  }

  const curve = buildCurve()
  const chartHeight = 140
  const maxChance = 100

  const getX = (day) => (day / cycleLength) * CHART_WIDTH
  const getY = (chance) => chartHeight - (chance / maxChance) * chartHeight

  const polylinePoints = curve.map(p => `${getX(p.day)},${getY(p.chance)}`).join(' ')
  const todayX = getX(cycleDay)

  const currentChance = curve.find(p => p.day === cycleDay)?.chance || 0
  const conceptionLevel =
    currentChance >= 60 ? 'HIGH' :
    currentChance >= 25 ? 'MEDIUM' : 'LOW'
  const levelColor =
    conceptionLevel === 'HIGH' ? '#EF4444' :
    conceptionLevel === 'MEDIUM' ? '#F59E0B' : colors.pink

  const styles = makeStyles(colors)

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <TouchableOpacity
        style={[styles.closeBtn, { backgroundColor: colors.border }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={{ fontSize: 18, color: colors.textSecondary }}>✕</Text>
      </TouchableOpacity>

      <Text style={[styles.dayTitle, { color: colors.textPrimary }]}>
        Cycle Day {cycleDay}
      </Text>
      <Text style={[styles.phaseSub, { color: colors.textSecondary }]}>
        Current · {content.title}
      </Text>

      <Text style={[styles.descText, { color: colors.textSecondary }]}>
        {content.desc}
      </Text>

      {showMore && (
        <Text style={[styles.descText, { color: colors.textSecondary, marginTop: 12 }]}>
          {content.symptoms.split('.')[0]}.
          <Text
            style={{ color: '#5B4FE5', fontWeight: '600' }}
            onPress={() => setShowMore(false)}
          >
            {' '}Hide ↑
          </Text>
        </Text>
      )}
      {!showMore && (
        <TouchableOpacity onPress={() => setShowMore(true)}>
          <Text style={{ color: '#5B4FE5', fontWeight: '600', marginTop: 8 }}>
            Show more ↓
          </Text>
        </TouchableOpacity>
      )}

      {/* Possible symptoms card */}
      <View style={[styles.symptomsCard, { backgroundColor: '#D6E8F0' }]}>
        <Text style={styles.symptomsTitle}>Possible symptoms</Text>
        <Text style={styles.symptomsDesc}>{content.symptoms}</Text>
      </View>

      {/* Conception chart card */}
      <View style={[styles.chartCard, { backgroundColor: colors.pinkLight }]}>
        <Text style={[styles.chanceLevel, { color: levelColor }]}>{conceptionLevel}</Text>
        <Text style={[styles.chanceLabel, { color: colors.pink }]}>Chance of Conception</Text>

        <View style={styles.chartWrap}>
          <Svg width={CHART_WIDTH} height={chartHeight + 20}>
            {/* Grid lines */}
            <Line x1="0" y1={getY(75)} x2={CHART_WIDTH} y2={getY(75)} stroke="#F3B8CB" strokeDasharray="4,4" strokeWidth="1" />
            <Line x1="0" y1={getY(40)} x2={CHART_WIDTH} y2={getY(40)} stroke="#F3B8CB" strokeDasharray="4,4" strokeWidth="1" />
            <Line x1="0" y1={getY(0)} x2={CHART_WIDTH} y2={getY(0)} stroke="#E89BB3" strokeWidth="1" />

            {/* Today vertical line */}
            <Line x1={todayX} y1="0" x2={todayX} y2={chartHeight} stroke="#1A1A2E" strokeWidth="1.5" />

            {/* Curve */}
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={colors.pink}
              strokeWidth="3"
            />
          </Svg>

          <View style={[styles.todayBadge, { left: Math.max(0, todayX - 28) }]}>
            <Text style={styles.todayBadgeText}>Today</Text>
          </View>

          <Text style={[styles.axisLabel, styles.axisHigh, { color: colors.pink }]}>HIGH</Text>
          <Text style={[styles.axisLabel, styles.axisMedium, { color: colors.pink }]}>MEDIUM</Text>
          <Text style={[styles.axisLabel, styles.axisLow, { color: colors.pink }]}>LOW</Text>
        </View>

        <View style={styles.chartFooter}>
          <Text style={[styles.chartFooterText, { color: colors.textPrimary }]}>
            Cycle Day {cycleDay}
          </Text>
          <Text style={[styles.chartFooterText, { color: colors.pink }]}>
            Conception chance
          </Text>
        </View>
      </View>

    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dayTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  phaseSub: { fontSize: 15, textAlign: 'center', marginBottom: 20 },
  descText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  symptomsCard: { borderRadius: 18, padding: 20, marginTop: 24 },
  symptomsTitle: { fontSize: 19, fontWeight: '800', color: '#1A1A2E', marginBottom: 10 },
  symptomsDesc: { fontSize: 14, lineHeight: 21, color: '#4B5563' },
  chartCard: { borderRadius: 18, padding: 20, marginTop: 16 },
  chanceLevel: { fontSize: 24, fontWeight: '800' },
  chanceLabel: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  chartWrap: { position: 'relative', marginBottom: 12 },
  todayBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  todayBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  axisLabel: { position: 'absolute', right: 0, fontSize: 10, fontWeight: '600' },
  axisHigh: { top: -2 },
  axisMedium: { top: 60 },
  axisLow: { top: 122 },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  chartFooterText: { fontSize: 13, fontWeight: '600' },
})

export default CycleDayDetail