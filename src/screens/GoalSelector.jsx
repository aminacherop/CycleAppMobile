import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { saveData } from '../utils/storage'

const { width } = Dimensions.get('window')
const CARD_SIZE = (width - 48) / 2

const GOAL_OPTIONS = [
  {
    id: 'conceive',
    emoji: '🧪',
    bg: '#F3E8FF',
    color: '#7C3AED',
  },
  {
    id: 'pregnancy',
    emoji: '🤰',
    bg: '#FCE7F3',
    color: '#DB2777',
  },
  {
    id: 'track_period',
    emoji: '📅',
    bg: '#E0F2FE',
    color: '#0284C7',
  },
  {
    id: 'wellbeing',
    emoji: '⚡',
    bg: '#DCFCE7',
    color: '#16A34A',
  },
]

const GoalSelector = ({ navigation, route }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const initialGoal = route?.params?.currentGoal || 'track_period'
  const [selectedGoals, setSelectedGoals] = useState([initialGoal])

  const goalLabels = {
    conceive: t('goal_conceive'),
    pregnancy: t('goal_pregnancy'),
    track_period: t('goal_track_period'),
    wellbeing: t('goal_wellbeing'),
  }

  const toggleGoal = (id) => {
    setSelectedGoals(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(g => g !== id) : prev
        : [...prev, id]
    )
  }

  const handleConfirm = async () => {
    // Primary goal is the first selected one
    const primaryGoal = selectedGoals[0]
    await saveData('user_goal', primaryGoal)
    await saveData('user_goals_all', selectedGoals)

    if (primaryGoal === 'pregnancy') {
      navigation.navigate('PregnancyIntro')
    } else {
      navigation.goBack()
    }
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('what_are_your_goals')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('choose_as_many')}
        </Text>

        {/* 2x2 card grid */}
        <View style={styles.grid}>
          {GOAL_OPTIONS.map(option => {
            const isSelected = selectedGoals.includes(option.id)
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: isSelected ? option.bg : colors.white,
                    borderColor: isSelected ? option.color : colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
                onPress={() => toggleGoal(option.id)}
                activeOpacity={0.8}
              >
                {/* Checkmark */}
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: option.color }]}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>✓</Text>
                  </View>
                )}

                {/* Illustration circle */}
                <View style={[styles.iconCircle, { backgroundColor: option.bg }]}>
                  <Text style={{ fontSize: 42 }}>{option.emoji}</Text>
                </View>

                <Text style={[
                  styles.cardLabel,
                  { color: isSelected ? option.color : colors.textPrimary }
                ]}>
                  {goalLabels[option.id]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.pink }]}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmBtnText}>{t('confirm_goals')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 19,
  },
  confirmBtn: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
})

export default GoalSelector
