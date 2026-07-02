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
import { SYMPTOM_CATEGORIES, getSymptomLabel } from '../utils/symptomCategories'
import { useLanguage } from '../context/LanguageContext'

const LogToday = ({ saveLog, todayLog, navigation }) => {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const allDetailedSymptoms = SYMPTOM_CATEGORIES.flatMap(c => c.items)
  const today = dayjs().format('dddd, MMMM D YYYY')

  const [flow, setFlow] = useState(todayLog?.flow || null)
  const [moods, setMoods] = useState(todayLog?.moods || [])

  const [water, setWater] = useState(todayLog?.water || 0)
  const [sleep, setSleep] = useState(todayLog?.sleep || 7)
  const [notes, setNotes] = useState(todayLog?.notes || '')
  const [saved, setSaved] = useState(false)

  const flowOptions = [
    { id: 'none', label: t('flow_none'), emoji: '⬜', color: '#9CA3AF' },
    { id: 'spotting', label: t('flow_spotting'), emoji: '🩸', color: '#F5B7B1' },
    { id: 'light', label: t('flow_light'), emoji: '💧', color: '#E59896' },
    { id: 'medium', label: t('flow_medium'), emoji: '💧💧', color: '#C2527A' },
    { id: 'heavy', label: t('flow_heavy'), emoji: '💧💧💧', color: '#9A3A5C' },
  ]

  const moodOptions = [
    { id: 'happy', label: t('mood_happy'), emoji: '😊' },
    { id: 'sad', label: t('mood_sad'), emoji: '😢' },
    { id: 'anxious', label: t('mood_anxious'), emoji: '😰' },
    { id: 'calm', label: t('mood_calm'), emoji: '😌' },
    { id: 'tired', label: t('mood_tired'), emoji: '😴' },
    { id: 'irritable', label: t('mood_irritable'), emoji: '😤' },
    { id: 'energetic', label: t('mood_energetic'), emoji: '💪' },
    { id: 'moody', label: t('mood_moody'), emoji: '🌊' },
  ]



  const toggleItem = (id, list, setList) => {
    setList(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    const logEntry = {
      date: dayjs().format('YYYY-MM-DD'),
      flow,
      moods,
      water,
      sleep,
      notes,
    }
    if (saveLog) {
      await saveLog(dayjs().format('YYYY-MM-DD'), logEntry)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const styles = makeStyles(colors)

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('log_today')}</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{today}</Text>
      </View>

      {/* Period Flow */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>🩸 {t('period_flow')}</Text>
        <View style={styles.flowRow}>
          {flowOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.flowBtn,
                {
                  backgroundColor: flow === option.id ? option.color + '20' : colors.white,
                  borderColor: flow === option.id ? option.color : colors.border,
                },
              ]}
              onPress={() => setFlow(option.id)}
            >
              <Text style={styles.flowEmoji}>{option.emoji}</Text>
              <Text style={[
                styles.flowLabel,
                { color: flow === option.id ? option.color : colors.textPrimary }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Mood */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          😊 {t('mood')} <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('select_all')}</Text>
        </Text>
        <View style={styles.tagGrid}>
          {moodOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.tagBtn,
                {
                  backgroundColor: moods.includes(option.id) ? colors.pinkLight : colors.white,
                  borderColor: moods.includes(option.id) ? colors.pink : colors.border,
                },
              ]}
              onPress={() => toggleItem(option.id, moods, setMoods)}
            >
              <Text style={[
                styles.tagText,
                { color: moods.includes(option.id) ? colors.pinkDark : colors.textPrimary }
              ]}>
                {option.emoji} {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Symptoms */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          ⚡ {t('symptoms')}
        </Text>
        <TouchableOpacity
          style={[styles.addSymptomsBtn, { borderColor: colors.pink }]}
          onPress={() => navigation?.navigate('AddSymptom')}
        >
          <Text style={{ color: colors.pink, fontWeight: '600', fontSize: 14 }}>
            ⚡ {t('add_symptoms')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Water Intake */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>💧 {t('water_intake')}</Text>
        <View style={styles.waterRow}>
          {[...Array(8)].map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.waterGlass,
                { opacity: i < water ? 1 : 0.25 },
              ]}
              onPress={() => setWater(i + 1)}
            >
              <Text style={{ fontSize: 22 }}>💧</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.waterCount, { color: colors.textSecondary }]}>
          {water} of 8 glasses
        </Text>
      </View>

      {/* Sleep */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>😴 {t('sleep_hours')}</Text>
        <View style={styles.sleepRow}>
          {[4, 5, 6, 7, 8, 9, 10].map(h => (
            <TouchableOpacity
              key={h}
              style={[
                styles.sleepBtn,
                {
                  backgroundColor: sleep === h ? colors.pink : colors.white,
                  borderColor: sleep === h ? colors.pink : colors.border,
                },
              ]}
              onPress={() => setSleep(h)}
            >
              <Text style={{
                color: sleep === h ? 'white' : colors.textPrimary,
                fontSize: 13,
                fontWeight: '600',
              }}>
                {h}h
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>📝 {t('notes')}</Text>
        <TextInput
          style={[styles.notesInput, {
            backgroundColor: colors.white,
            borderColor: colors.border,
            color: colors.textPrimary,
          }]}
          placeholder="How are you feeling today?"
          placeholderTextColor={colors.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[
          styles.saveBtn,
          { backgroundColor: saved ? colors.success : colors.pink },
        ]}
        onPress={handleSave}
      >
        <Text style={styles.saveBtnText}>
          {saved ? '✅ ' + t('saved') : t('save_log')}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  date: { fontSize: 13 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  hint: { fontSize: 11, fontWeight: '400' },
  flowRow: { flexDirection: 'row', gap: 8 },
  flowBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  flowEmoji: { fontSize: 16 },
  flowLabel: { fontSize: 10, fontWeight: '600' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  tagText: { fontSize: 13, fontWeight: '500' },
  addSymptomsBtn: { paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', marginTop: 4 },
  waterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  waterGlass: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterCount: { fontSize: 12, textAlign: 'center' },
  sleepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sleepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
})

export default LogToday