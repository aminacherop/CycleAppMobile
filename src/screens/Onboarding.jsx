import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import Slider from '@react-native-community/slider'
import dayjs from 'dayjs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import LanguagePicker from '../components/LanguagePicker'
import CalendarDatePicker from '../components/CalendarDatePicker'
import NumberPickerModal from '../components/NumberPickerModal'

const Onboarding = ({ onComplete }) => {
  const { colors } = useTheme()
  const { t, language, languages } = useLanguage()
  const insets = useSafeAreaInsets()
  const currentLang = languages.find(l => l.code === language)
  const [step, setStep] = useState(1)
  const [showLangPicker, setShowLangPicker] = useState(false)

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
  const [showCyclePicker, setShowCyclePicker] = useState(false)
  const [showPeriodPicker, setShowPeriodPicker] = useState(false)

  const conditionOptions = [
    { id: 'none', label: t('cond_none'), emoji: '✅' },
    { id: 'pcos', label: t('cond_pcos'), emoji: '🔵' },
    { id: 'endo', label: t('cond_endo'), emoji: '🟠' },
    { id: 'peri', label: t('cond_peri'), emoji: '🟣' },
    { id: 'postpill', label: t('cond_postpill'), emoji: '💊' },
    { id: 'other', label: t('cond_other'), emoji: '⭕' },
  ]

  const validateStep = () => {
    const newErrors = {}
    if (step === 2 && !data.name.trim()) {
      newErrors.name = t('validate_name')
    }
    if (step === 3 && !data.lastPeriodStart) {
      newErrors.lastPeriodStart = t('validate_period')
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
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
    >
      {/* Progress bar */}
      {step > 1 && (
        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.pink }]} />
          </View>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{t('step_x_of_3', { n: step - 1 })}</Text>
        </View>
      )}

      {/* STEP 1 — WELCOME */}
      {step === 1 && (
        <View style={styles.center}>
          <TouchableOpacity
            style={[styles.langPill, { borderColor: colors.border, backgroundColor: colors.white }]}
            onPress={() => setShowLangPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 15 }}>{currentLang?.flag || '🌐'}</Text>
            <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
              {currentLang?.nativeName || 'English'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>▾</Text>
          </TouchableOpacity>

          <View style={[styles.welcomeCircle, { backgroundColor: colors.pinkLight }]}>
            <Text style={styles.welcomeEmoji}>🌸</Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('welcome_title')}
          </Text>

          <Text style={[styles.desc, { color: colors.textSecondary }]}>{t('welcome_desc_full')}</Text>

          <View style={styles.featuresWrap}>
            {[
              { icon: '📅', title: t('feat_track_title'), desc: t('feat_track_desc') },
              { icon: '😊', title: t('feat_log_title'), desc: t('feat_log_desc') },
              { icon: '🔒', title: t('feat_private_title'), desc: t('feat_private_desc') },
              { icon: '💊', title: t('feat_meds_title'), desc: t('feat_meds_desc') },
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
            <Text style={styles.btnPrimaryText}>{t('get_started')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleComplete}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('skip_setup')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP 2 — PERSONAL INFO */}
      {step === 2 && (
        <View>
          <Text style={styles.stepIcon}>👤</Text>
          <Text style={[styles.titleSmall, { color: colors.textPrimary }]}>{t('tell_us')}</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{t('onboarding_personalise')}</Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('your_name')} *</Text>
            <TextInput
              style={[styles.input, {
                borderColor: errors.name ? colors.danger : colors.border,
                color: colors.textPrimary,
                backgroundColor: colors.white,
              }]}
              placeholder={t('name_placeholder')}
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
            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('health_condition_optional')}</Text>
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
              <Text style={styles.btnPrimaryText}>{t('continue')} →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 3 — CYCLE SETUP */}
      {step === 3 && (
        <View>
          <Text style={styles.stepIcon}>🩸</Text>
          <Text style={[styles.titleSmall, { color: colors.textPrimary }]}>{t('setup_cycle')}</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{t('onboarding_calc_desc')}</Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              When did your last period start? *
            </Text>
            <TouchableOpacity
              style={[styles.pickerField, {
                borderColor: errors.lastPeriodStart ? colors.danger : colors.border,
                backgroundColor: colors.white,
              }]}
              activeOpacity={0.7}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.pickerIcon}>📅</Text>
              <Text style={[styles.pickerValue, {
                color: data.lastPeriodStart ? colors.textPrimary : colors.textSecondary,
              }]}>
                {data.lastPeriodStart
                  ? dayjs(data.lastPeriodStart).format('MMMM D, YYYY')
                  : 'Tap to select date'}
              </Text>
              <Text style={[styles.pickerChevron, { color: colors.textSecondary }]}>▾</Text>
            </TouchableOpacity>
            {errors.lastPeriodStart && (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {errors.lastPeriodStart}
              </Text>
            )}

            <CalendarDatePicker
              visible={showDatePicker}
              value={data.lastPeriodStart}
              maximumDate={new Date()}
              onClose={() => setShowDatePicker(false)}
              onSelect={(dateString) => {
                setData(prev => ({ ...prev, lastPeriodStart: dateString }))
                setErrors(prev => ({ ...prev, lastPeriodStart: '' }))
              }}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.sliderLabelRow}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('cycle_length')}</Text>
              <TouchableOpacity
                style={[styles.valuePill, { backgroundColor: colors.pinkLight }]}
                activeOpacity={0.7}
                onPress={() => setShowCyclePicker(true)}
              >
                <Text style={[styles.valuePillText, { color: colors.pinkDark }]}>
                  {data.cycleLength} {t('days') || 'days'}
                </Text>
                <Text style={[styles.valuePillChevron, { color: colors.pinkDark }]}>▾</Text>
              </TouchableOpacity>
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
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('period_length')}</Text>
              <TouchableOpacity
                style={[styles.valuePill, { backgroundColor: colors.pinkLight }]}
                activeOpacity={0.7}
                onPress={() => setShowPeriodPicker(true)}
              >
                <Text style={[styles.valuePillText, { color: colors.pinkDark }]}>
                  {data.periodLength} {t('days') || 'days'}
                </Text>
                <Text style={[styles.valuePillChevron, { color: colors.pinkDark }]}>▾</Text>
              </TouchableOpacity>
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

          <NumberPickerModal
            visible={showCyclePicker}
            title={t('cycle_length')}
            min={21}
            max={45}
            value={data.cycleLength}
            unit={t('days') || 'days'}
            onSelect={value => setData(prev => ({ ...prev, cycleLength: value }))}
            onClose={() => setShowCyclePicker(false)}
          />
          <NumberPickerModal
            visible={showPeriodPicker}
            title={t('period_length')}
            min={2}
            max={10}
            value={data.periodLength}
            unit={t('days') || 'days'}
            onSelect={value => setData(prev => ({ ...prev, periodLength: value }))}
            onClose={() => setShowPeriodPicker(false)}
          />

          {data.lastPeriodStart && (
            <View style={[styles.previewCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
              <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                📊 Your cycle preview
              </Text>
              <View style={styles.previewGrid}>
                <View style={[styles.previewItem, { backgroundColor: colors.background }]}>
                  <Text style={styles.previewEmoji}>✨</Text>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>{t('ovulation')}</Text>
                  <Text style={[styles.previewValue, { color: colors.textPrimary }]}>{ovulationDate}</Text>
                </View>
                <View style={[styles.previewItem, { backgroundColor: colors.pinkLight }]}>
                  <Text style={styles.previewEmoji}>⏭️</Text>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>{t('next_period')}</Text>
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
              <Text style={styles.btnPrimaryText}>{t('continue')} →</Text>
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

          <Text style={[styles.desc, { color: colors.textSecondary }]}>{t('cycle_setup_success')}</Text>

          {data.lastPeriodStart && (
            <View style={[styles.summaryCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
              {[
                { label: t('summ_next_period'), value: nextPeriod },
                { label: t('summ_ovulation'), value: ovulationDate },
                { label: t('summ_cycle_length'), value: `${data.cycleLength} days` },
                { label: t('summ_period_length'), value: `${data.periodLength} days` },
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
            <Text style={styles.btnPrimaryText}>{t('go_to_dashboard')}</Text>
          </TouchableOpacity>
        </View>
      )}
      <LanguagePicker visible={showLangPicker} onClose={() => setShowLangPicker(false)} />
    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 18,
  },
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
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: 12,
  },
  pickerIcon: {
    fontSize: 18,
  },
  pickerValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  pickerChevron: {
    fontSize: 14,
  },
  valuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  valuePillText: {
    fontSize: 15,
    fontWeight: '700',
  },
  valuePillChevron: {
    fontSize: 12,
    fontWeight: '700',
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
    alignItems: 'center',
    marginBottom: 10,
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