import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
} from 'react-native'
import dayjs from 'dayjs'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import {
  MEDICATION_TYPES,
  loadMedications,
  addMedication,
  updateMedication,
  deleteMedication,
  loadMedicationLogs,
  logMedicationTaken,
  calculateAdherence,
  calculateStreak,
} from '../utils/medications'
import {
  scheduleMedicationReminders,
  requestNotificationPermission,
} from '../utils/notifications'

const Medications = ({ navigation }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const [medications, setMedications] = useState([])
  const [todayLogs, setTodayLogs] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [adherenceData, setAdherenceData] = useState({})
  const [streakData, setStreakData] = useState({})

  const [newMed, setNewMed] = useState({
    type: 'birth_control',
    name: '',
    reminderTime: '08:00',
    dosage: '',
    startDate: dayjs().format('YYYY-MM-DD'),
  })
  const [showDatePicker, setShowDatePicker] = useState(false)

  const today = dayjs().format('YYYY-MM-DD')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      const meds = await loadMedications()
      const logs = await loadMedicationLogs()
      const medsArr = Array.isArray(meds) ? meds : []
      setMedications(medsArr)

      const todayStatus = {}
      medsArr.forEach(med => {
        todayStatus[med.id] = logs?.[`${med.id}_${today}`]?.taken || false
      })
      setTodayLogs(todayStatus)

      const adherence = {}
      const streaks = {}
      for (const med of medsArr) {
        adherence[med.id] = await calculateAdherence(med.id, 30)
        streaks[med.id] = await calculateStreak(med.id)
      }
      setAdherenceData(adherence)
      setStreakData(streaks)
    } catch (err) {
      console.error('Error loading medications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTaken = async (medId) => {
    const newStatus = !todayLogs[medId]
    await logMedicationTaken(medId, today, newStatus)
    setTodayLogs(prev => ({ ...prev, [medId]: newStatus }))
    await loadAll()
  }

  const handleAddMedication = async () => {
    if (!newMed.name.trim()) return
    const granted = await requestNotificationPermission()
    const updated = await addMedication(newMed)
    setMedications(Array.isArray(updated) ? updated : [])
    if (granted) await scheduleMedicationReminders(updated)
    setShowAddModal(false)
    setNewMed({ type: 'birth_control', name: '', reminderTime: '08:00', dosage: '', startDate: dayjs().format('YYYY-MM-DD') })
    await loadAll()
  }

  const handleDelete = async (medId) => {
    const updated = await deleteMedication(medId)
    setMedications(Array.isArray(updated) ? updated : [])
  }

  const handleToggleActive = async (medId, active) => {
    const updated = await updateMedication(medId, { active: !active })
    setMedications(Array.isArray(updated) ? updated : [])
    if (!active) await scheduleMedicationReminders(updated)
  }

  const getTypeInfo = (typeId) =>
    MEDICATION_TYPES.find(t => t.id === typeId) || MEDICATION_TYPES[MEDICATION_TYPES.length - 1]

  const activeMeds = medications.filter(m => m.active)
  const takenCount = activeMeds.filter(m => todayLogs[m.id]).length
  const allTaken = activeMeds.length > 0 && takenCount === activeMeds.length

  const styles = makeStyles(colors)

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 40 }}>💊</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>{t('loading')}</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <TouchableOpacity activeOpacity={0.6} style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>← {t('back')}</Text>
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('pills_supplements')}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        {activeMeds.length} {activeMeds.length !== 1 ? t('active_reminders_plural') : t('active_reminders')}
      </Text>

      {/* Today status */}
      {medications.length > 0 && (
        <View style={[styles.todayCard, { backgroundColor: allTaken ? colors.pinkLight : colors.white, borderColor: colors.border }]}>
          <Text style={{ fontSize: 30 }}>{allTaken ? '🎉' : '💊'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.todayTitle, { color: colors.textPrimary }]}>
              {allTaken ? t('all_done_today') : t('todays_medications')}
            </Text>
            <Text style={[styles.todayDesc, { color: colors.textSecondary }]}>
              {takenCount} {t('of')} {activeMeds.length} {t('taken_of')}
            </Text>
          </View>
        </View>
      )}

      {/* Empty state */}
      {medications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 48 }}>💊</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('no_medications_yet')}</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            {t('no_medications_desc')}
          </Text>
          <TouchableOpacity
            style={[styles.emptyAddBtn, { backgroundColor: colors.pink }]}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.emptyAddBtnText}>{t('add_first_medication')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 10, marginBottom: 16 }}>
          {medications.map(med => {
            const typeInfo = getTypeInfo(med.type)
            const taken = todayLogs[med.id]
            const adherence = adherenceData[med.id]
            const streak = streakData[med.id]

            return (
              <View
                key={med.id}
                style={[styles.medCard, { backgroundColor: colors.white, borderColor: colors.border, opacity: med.active ? 1 : 0.5 }]}
              >
                <View style={styles.medTop}>
                  <View style={[styles.medIcon, { backgroundColor: typeInfo.color + '20' }]}>
                    <Text style={{ fontSize: 20 }}>{typeInfo.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.medName, { color: colors.textPrimary }]}>{med.name}</Text>
                    <Text style={[styles.medMeta, { color: colors.textSecondary }]}>
                      {typeInfo.label}{med.dosage ? ` · ${med.dosage}` : ''} · ⏰ {dayjs(`2000-01-01T${med.reminderTime}`).format('h:mm A')}{med.startDate ? ` · from ${dayjs(med.startDate).format('MMM D')}` : ''}
                    </Text>
                  </View>
                  {med.active && (
                    <TouchableOpacity
                      style={[
                        styles.checkBtn,
                        { borderColor: colors.border, backgroundColor: taken ? '#10B981' : 'transparent' },
                      ]}
                      onPress={() => handleToggleTaken(med.id)}
                    >
                      {taken && <Text style={{ color: 'white', fontWeight: '700' }}>✓</Text>}
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.statsRow}>
                  {streak > 0 && (
                    <View style={[styles.statTag, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={{ color: '#92400E', fontSize: 11, fontWeight: '600' }}>🔥 {streak}{t('day_streak')}</Text>
                    </View>
                  )}
                  {adherence !== null && (
                    <View style={[styles.statTag, { backgroundColor: colors.pinkLight }]}>
                      <Text style={{ color: colors.pinkDark, fontSize: 11, fontWeight: '600' }}>📊 {adherence}%</Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                    onPress={() => handleToggleActive(med.id, med.active)}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {med.active ? t('pause') : t('resume')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#EF4444' }]}
                    onPress={() => handleDelete(med.id)}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 12 }}>🗑 {t('delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </View>
      )}

      <TouchableOpacity
        style={[styles.addBtn, { borderColor: colors.pinkMid, backgroundColor: colors.white }]}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={{ color: colors.pink, fontWeight: '600', fontSize: 14 }}>
          {t('add_pill_supplement')}
        </Text>
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.white }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('add_medication_title')}</Text>

              <View style={styles.typeGrid}>
                {MEDICATION_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeBtn,
                      {
                        borderColor: newMed.type === type.id ? type.color : colors.border,
                        backgroundColor: newMed.type === type.id ? type.color + '15' : colors.background,
                      },
                    ]}
                    onPress={() => setNewMed(prev => ({
                      ...prev, type: type.id, name: prev.name || type.label,
                    }))}
                  >
                    <Text style={{ fontSize: 18 }}>{type.emoji}</Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, textAlign: 'center' }}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('name_required')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                placeholder={t("name_med_placeholder")}
                placeholderTextColor={colors.textSecondary}
                value={newMed.name}
                onChangeText={t => setNewMed(prev => ({ ...prev, name: t }))}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('dosage')}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                placeholder={t("dosage_placeholder")}
                placeholderTextColor={colors.textSecondary}
                value={newMed.dosage}
                onChangeText={t => setNewMed(prev => ({ ...prev, dosage: t }))}
              />

              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('start_date')}</Text>
              <TouchableOpacity
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, justifyContent: 'center' }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                  {dayjs(newMed.startDate).format('MMM D, YYYY')}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dayjs(newMed.startDate).toDate()}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false)
                    if (selectedDate) {
                      const formatted = dayjs(selectedDate).format('YYYY-MM-DD')
                      setNewMed(prev => ({ ...prev, startDate: formatted }))
                    }
                  }}
                />
              )}

              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('reminder_time')}</Text>
              <TouchableOpacity
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, justifyContent: 'center' }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
                  {dayjs(`2000-01-01T${newMed.reminderTime}`).format('h:mm A')}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={dayjs(`2000-01-01T${newMed.reminderTime}`).toDate()}
                  mode="time"
                  is24Hour={false}
                  onChange={(event, selectedDate) => {
                    setShowTimePicker(false)
                    if (selectedDate) {
                      const formatted = dayjs(selectedDate).format('HH:mm')
                      setNewMed(prev => ({ ...prev, reminderTime: formatted }))
                    }
                  }}
                />
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancel, { borderColor: colors.border }]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={{ color: colors.textSecondary }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSave, { backgroundColor: newMed.name.trim() ? colors.pink : colors.border }]}
                  onPress={handleAddMedication}
                  disabled={!newMed.name.trim()}
                >
                  <Text style={{ color: 'white', fontWeight: '700' }}>{t('add_reminder_btn')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  backBtn: { paddingVertical: 8, marginBottom: 4 },
  backBtnText: { fontSize: 14 },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { fontSize: 13, marginBottom: 16, marginTop: 2 },
  todayCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16 },
  todayTitle: { fontSize: 14, fontWeight: '700' },
  todayDesc: { fontSize: 12 },
  emptyWrap: { alignItems: 'center', padding: 32, gap: 8 },
  emptyAddBtn: { paddingVertical: 13, paddingHorizontal: 24, borderRadius: 24, marginTop: 12 },
  emptyAddBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  medCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  medTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  medIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  medName: { fontSize: 14, fontWeight: '700' },
  medMeta: { fontSize: 11, marginTop: 1 },
  checkBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  statTag: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  addBtn: { paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', marginBottom: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: { width: '30%', alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 10 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  modalSave: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
})

export default Medications
