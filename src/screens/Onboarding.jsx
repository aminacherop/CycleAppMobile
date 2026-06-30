import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import Slider from '@react-native-community/slider'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'

const Onboarding = ({ onComplete }) => {
  const { colors } = useTheme()
  const [step, setStep] = useState(1)

  const [data, setData] = useState({
    name: '',
    dob: '',
    lastPeriodStart: '',
    cycleLength: 28,
    periodLength: 5,
    condition: 'none',
  })

  const [errors, setErrors] = useState({})
  const [showDatePicker, setShowDatePicker] = useState(false)

  const conditionOptions = [
    { id: 'none', label: 'None', emoji: '✅' },
    { id: 'pcos', label: 'PCOS', emoji: '🔵' },
    { id: 'endo', label: 'Endometriosis', emoji: '🟠' },
    { id: 'peri', label: 'Perimenopause', emoji: '🟣' },
    { id: 'postpill', label: 'Post-pill', emoji: '💊' },
    { id: 'other', label: 'Other', emoji: '⭕' },
  ]

  const validateStep = () => {
    const newErrors = {}
    if (step === 2 && !data.name.trim()) {
      newErrors.name = 'Please enter your name'
    }
    if (step === 3 && !data.lastPeriodStart) {
      newErrors.lastPeriodStart = 'Please enter your last period date'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!validateStep()) return
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleComplete = () => {
    onComplete({
      profile: {
        name: data.name,
        dob: data.dob,
        condition: data.condition,
      },
      cycleSettings: {
        lastPeriodStart: data.lastPeriodStart || dayjs().subtract(14, 'day').format('YYYY-MM-DD'),
        cycleLength: data.cycleLength,
        periodLength: data.periodLength,
      },
    })
  }

  const nextPeriod = data.lastPeriodStart
    ? dayjs(data.lastPeriodStart).add(data.cycleLength, 'day').format('MMMM D, YYYY')
    : null

  const ovulationDate = data.lastPeriodStart
    ? dayjs(data.lastPeriodStart).add(data.cycleLength - 14, 'day').format('MMMM D, YYYY')
    : null

  const progressWidth = `${((step - 1) / 3) * 100}%`

  const styles = makeStyles(colors)

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Progress bar */}
      {step > 1 && (
        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.pink }]} />
          </View>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            Step {step - 1} of 3
          </Text>
        </View>
      )}

      {/* STEP 1 — WELCOME */}
      {step === 1 && (
        <View style={styles.center}>
          <View style={[styles.welcomeCircle, { backgroundColor: colors.pinkLight }]}>
            <Text style={styles.welcomeEmoji}>🌸</Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Welcome to{'\n'}CycleApp 🌸
          </Text>

          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            Your personal period tracker for every woman.
            Private, offline-first, and designed around your body.
          </Text>

          <View style={styles.featuresWrap}>
            {[
              { icon: '📅', title: 'Track your cycle', desc: 'Predictions, fertile window, ovulation' },
              { icon: '😊', title: 'Log daily health', desc: 'Mood, symptoms, water, sleep' },
              { icon: '🔒', title: '100% private', desc: 'Data stays on your device' },
              { icon: '💊', title: 'Medication reminders', desc: 'Pills, supplements, and more' },
            ].map((f, i) => (
              <View key={i} style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{f.title}</Text>
                  <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.pink }]}
            onPress={handleNext}
          >
            <Text style={styles.btnPrimaryText}>Get started →</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleComplete}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              Skip setup — I'll configure later
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2 — PERSONAL INFO */}
      {step === 2 && (
        <View>
          <Text style={styles.stepIcon}>👤</Text>
          <Text style={[styles.titleSmall, { color: colors.textPrimary }]}>
            Tell us about yourself
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            This helps us personalise your experience.
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Your name *</Text>
            <TextInput
              style={[styles.input, {
                borderColor: errors.name ? colors.danger : colors.border,
                color: colors.textPrimary,
                backgroundColor: colors.white,
              }]}
              placeholder="e.g. Amina"
              placeholderTextColor={colors.textSecondary}
              value={data.name}
              onChangeText={text => {
                setData(prev => ({ ...prev, name: text }))
                setErrors(prev => ({ ...prev, name: '' }))
              }}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: colors.danger }]}>{errors.name}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Health condition (optional)
            </Text>
            <View style={styles.conditionGrid}>
              {conditionOptions.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.conditionBtn,
                    {
                      borderColor: data.condition === c.id ? colors.pink : colors.border,
                      backgroundColor: data.condition === c.id ? colors.pinkLight : colors.white,
                    },
                  ]}
                  onPress={() => setData(prev => ({ ...prev, condition: c.id }))}
                >
                  <Text>{c.emoji}</Text>
                  <Text style={[
                    styles.conditionLabel,
                    { color: data.condition === c.id ? colors.pinkDark : colors.textPrimary }
                  ]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor: colors.border }]}
              onPress={handleBack}
            >
              <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, styles.btnFlex, { backgroundColor: colors.pink }]}
              onPress={handleNext}
            >
              <Text style={styles.btnPrimaryText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 3 — CYCLE SETUP */}
      {step === 3 && (
        <View>
          <Text style={styles.stepIcon}>🩸</Text>
          <Text style={[styles.titleSmall, { color: colors.textPrimary }]}>
            Set up your cycle
          </Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            This is how we calculate your next period, ovulation, and fertile window.
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              When did your last period start? *
            </Text>
            <TouchableOpacity
              style={[styles.input, {
                borderColor: errors.lastPeriodStart ? colors.danger : colors.border,
                backgroundColor: colors.white,
              }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: data.lastPeriodStart ? colors.textPrimary : colors.textSecondary }}>
                {data.lastPeriodStart
                  ? dayjs(data.lastPeriodStart).format('MMMM D, YYYY')
                  : 'Tap to select date'}
              </Text>
            </TouchableOpacity>
            {errors.lastPeriodStart && (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {errors.lastPeriodStart}
              </Text>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={data.lastPeriodStart ? new Date(data.lastPeriodStart) : new Date()}
                mode="date"
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios')
                  if (selectedDate) {
                    setData(prev => ({
                      ...prev,
                      lastPeriodStart: dayjs(selectedDate).format('YYYY-MM-DD'),
                    }))
                    setErrors(prev => ({ ...prev, lastPeriodStart: '' }))
                  }
                }}
              />
            )}
          </View>

          <View style={styles.formGroup}>
            <View style={styles.sliderLabelRow}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Cycle length</Text>
              <Text style={[styles.sliderValue, { color: colors.pink }]}>
                {data.cycleLength} days
              </Text>
            </View>
            <Slider
              minimumValue={21}
              maximumValue={45}
              step={1}
              value={data.cycleLength}
              minimumTrackTintColor={colors.pink}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.pink}
              onValueChange={value => setData(prev => ({ ...prev, cycleLength: value }))}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.sliderLabelRow}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Period length</Text>
              <Text style={[styles.sliderValue, { color: colors.pink }]}>
                {data.periodLength} days
              </Text>
            </View>
            <Slider
              minimumValue={2}
              maximumValue={10}
              step={1}
              value={data.periodLength}
              minimumTrackTintColor={colors.pink}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.pink}
              onValueChange={value => setData(prev => ({ ...prev, periodLength: value }))}
            />
          </View>

          {data.lastPeriodStart && (
            <View style={[styles.previewCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
              <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                📊 Your cycle preview
              </Text>
              <View style={styles.previewGrid}>
                <View style={[styles.previewItem, { backgroundColor: colors.background }]}>
                  <Text style={styles.previewEmoji}>✨</Text>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Ovulation</Text>
                  <Text style={[styles.previewValue, { color: colors.textPrimary }]}>{ovulationDate}</Text>
                </View>
                <View style={[styles.previewItem, { backgroundColor: colors.pinkLight }]}>
                  <Text style={styles.previewEmoji}>⏭️</Text>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Next period</Text>
                  <Text style={[styles.previewValue, { color: colors.pink }]}>{nextPeriod}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor: colors.border }]}
              onPress={handleBack}
            >
              <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, styles.btnFlex, { backgroundColor: colors.pink }]}
              onPress={handleNext}
            >
              <Text style={styles.btnPrimaryText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 4 — ALL SET */}
      {step === 4 && (
        <View style={styles.center}>
          <View style={[styles.welcomeCircle, { backgroundColor: colors.pinkLight }]}>
            <Text style={styles.welcomeEmoji}>🎉</Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            You're all set,{'\n'}{data.name || 'welcome'}! 🌸
          </Text>

          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            Your cycle has been set up successfully.
          </Text>

          {data.lastPeriodStart && (
            <View style={[styles.summaryCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
              {[
                { label: '🩸 Next period', value: nextPeriod },
                { label: '✨ Ovulation', value: ovulationDate },
                { label: '🔄 Cycle length', value: `${data.cycleLength} days` },
                { label: '📅 Period length', value: `${data.periodLength} days` },
              ].map((row, i) => (
                <View key={i} style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.btnPrimary, styles.btnLarge, { backgroundColor: colors.pink }]}
            onPress={handleComplete}
          >
            <Text style={styles.btnPrimaryText}>Go to my dashboard 🏠</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
  },
  center: {
    alignItems: 'center',
  },
  welcomeCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  welcomeEmoji: {
    fontSize: 60,
  },
  stepIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 34,
  },
  titleSmall: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresWrap: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 14,
    borderWidth: 1.5,
    borderRadius: 12,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  conditionLabel: {
    fontSize: 12,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  previewGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  previewItem: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  previewEmoji: {
    fontSize: 16,
  },
  previewLabel: {
    fontSize: 10,
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnFlex: {
    flex: 1,
  },
  btnPrimary: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnLarge: {
    paddingVertical: 18,
  },
  skipText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
})

export default Onboarding