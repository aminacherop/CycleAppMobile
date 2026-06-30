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
import { useLanguage } from '../context/LanguageContext'

const { width } = Dimensions.get('window')
const CHART_WIDTH = width - 64

const getPhaseContent = (t) => ({
  Menstrual: {
    title: t('menstrual_phase_title'),
    desc: t('menstrual_phase_desc'),
    symptoms: t('menstrual_phase_symptoms'),
  },
  Follicular: {
    title: t('follicular_phase_title'),
    desc: t('follicular_phase_desc'),
    symptoms: t('follicular_phase_symptoms'),
  },
  Ovulation: {
    title: t('ovulation_phase_title'),
    desc: t('ovulation_phase_desc'),
    symptoms: t('ovulation_phase_symptoms'),
  },
  Luteal: {
    title: t('luteal_phase_title'),
    desc: t('luteal_phase_desc'),
    symptoms: t('luteal_phase_symptoms'),
  },
})

const CycleDayDetail = ({ cycleSettings, navigation }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
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

  const PHASE_CONTENT = getPhaseContent(t)
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
  const conceptionLevelKey =
    currentChance >= 60 ? 'level_high' :
    currentChance >= 25 ? 'level_medium' : 'level_low'
  const levelColor =
    conceptionLevelKey === 'level_high' ? '#EF4444' :
    conceptionLevelKey === 'level_medium' ? '#F59E0B' : colors.pink

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
        {t('cycle_day_title')} {cycleDay}
      </Text>
      <Text style={[styles.phaseSub, { color: colors.textSecondary }]}>
        {t('current_dot')} {content.title}
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
            {' '}{t('hide_arrow')}
          </Text>
        </Text>
      )}
      {!showMore && (
        <TouchableOpacity onPress={() => setShowMore(true)}>
          <Text style={{ color: '#5B4FE5', fontWeight: '600', marginTop: 8 }}>
            {t('show_more_arrow')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Possible symptoms card */}
      <View style={[styles.symptomsCard, { backgroundColor: '#D6E8F0' }]}>
        <Text style={styles.symptomsTitle}>{t('possible_symptoms')}</Text>
        <Text style={styles.symptomsDesc}>{content.symptoms}</Text>
      </View>

      {/* Conception chart card */}
      <View style={[styles.chartCard, { backgroundColor: colors.pinkLight }]}>
        <Text style={[styles.chanceLevel, { color: levelColor }]}>{t(conceptionLevelKey)}</Text>
        <Text style={[styles.chanceLabel, { color: colors.pink }]}>{t('chance_of_conception')}</Text>

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
            <Text style={styles.todayBadgeText}>{t('today')}</Text>
          </View>

          <Text style={[styles.axisLabel, styles.axisHigh, { color: colors.pink }]}>{t('level_high')}</Text>
          <Text style={[styles.axisLabel, styles.axisMedium, { color: colors.pink }]}>{t('level_medium')}</Text>
          <Text style={[styles.axisLabel, styles.axisLow, { color: colors.pink }]}>{t('level_low')}</Text>
        </View>

        <View style={styles.chartFooter}>
          <Text style={[styles.chartFooterText, { color: colors.textPrimary }]}>
            {t('cycle_day_title')} {cycleDay}
          </Text>
          <Text style={[styles.chartFooterText, { color: colors.pink }]}>
            {t('conception_chance')}
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