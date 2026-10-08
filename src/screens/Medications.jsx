import { useCallback, useState } from 'react'
import { Alert, View, StyleSheet } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import {
  Screen, AppText, Button, Card, Chip, EmptyState, FadeIn, IconBadge, ListGroup, ListRow, Sheet, Tap, Icon,
} from '../components/ui'
import {
  MEDICATION_TYPES, loadMedications, addMedication, updateMedication, deleteMedication,
  loadMedicationLogs, logMedicationTaken, calculateAdherence, calculateStreak, syncMedicationReminders,
} from '../utils/medications'
import { requestNotificationPermission } from '../utils/notifications'
import { formatDate, parseDate } from '../utils/dates'
import { successHaptic, warningHaptic } from '../utils/haptics'
import { BackHeader, Field, formatTime, timeToDate, usePicker } from './profile/shared'

// Icon + tone per medication type (no emoji in the UI).
const TYPE_STYLE = {
  birth_control: { icon: 'pill', tone: 'primary', key: 'pf_med_birth_control' },
  folic_acid: { icon: 'leaf', tone: 'fertile', key: 'pf_med_folic_acid' },
  iron: { icon: 'drop', tone: 'period', key: 'pf_med_iron' },
  vitamin_d: { icon: 'sun', tone: 'warning', key: 'pf_med_vitamin_d' },
  calcium: { icon: 'bolt', tone: 'info', key: 'pf_med_calcium' },
  magnesium: { icon: 'moon', tone: 'ovulation', key: 'pf_med_magnesium' },
  painkiller: { icon: 'bolt', tone: 'success', key: 'pf_med_painkiller' },
  prenatal: { icon: 'baby', tone: 'primary', key: 'pf_med_prenatal' },
  other: { icon: 'pill', tone: 'info', key: 'pf_med_other' },
}
const typeStyle = (id) => TYPE_STYLE[id] || TYPE_STYLE.other
const TYPE_IDS = (MEDICATION_TYPES || []).map(m => m.id).filter(id => TYPE_STYLE[id])

const parseHHMM = (s) => {
  if (typeof s !== 'string' || !/^\d{1,2}:\d{1,2}$/.test(s)) return { hour: 8, minute: 0 }
  const [hour, minute] = s.split(':').map(Number)
  return { hour, minute }
}
const toHHMM = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

const blankMed = () => ({ type: 'birth_control', name: '', reminderTime: '08:00', dosage: '', startDate: dayjs().format('YYYY-MM-DD') })

const Medications = ({ navigation }) => {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const picker = usePicker()
  const [medications, setMedications] = useState([])
  const [todayLogs, setTodayLogs] = useState({})
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newMed, setNewMed] = useState(blankMed)
  const [nameTouched, setNameTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const today = dayjs().format('YYYY-MM-DD')

  const loadAll = useCallback(async () => {
    try {
      const [meds, logs] = await Promise.all([loadMedications(), loadMedicationLogs()])
      const list = (Array.isArray(meds) ? meds : []).filter(m => m && m.id != null)
      setMedications(list)
      const status = {}
      list.forEach(m => { status[m.id] = !!logs?.[`${m.id}_${today}`]?.taken })
      setTodayLogs(status)
      const entries = await Promise.all(list.map(async m => {
        const [adherence, streak] = await Promise.all([
          calculateAdherence(m.id, 30).catch(() => null),
          calculateStreak(m.id).catch(() => 0),
        ])
        return [m.id, { adherence, streak }]
      }))
      setStats(Object.fromEntries(entries))
    } catch (err) {
      console.error('Error loading medications:', err)
    } finally {
      setLoading(false)
    }
  }, [today])

  useFocusEffect(useCallback(() => { loadAll() }, [loadAll]))

  const resync = () => syncMedicationReminders(t).catch(() => {})

  const toggleTaken = async (id) => {
    const next = !todayLogs[id]
    setTodayLogs(prev => ({ ...prev, [id]: next }))
    if (next) successHaptic()
    try {
      await logMedicationTaken(id, today, next)
      loadAll()
    } catch (e) {
      console.warn('Log medication failed', e)
    }
  }

  const add = async () => {
    const name = newMed.name.trim()
    setNameTouched(true)
    if (!name) return
    setSaving(true)
    try {
      let granted = false
      try { granted = await requestNotificationPermission() } catch {}
      await addMedication({ ...newMed, name })
      if (granted) await resync()
      setShowAdd(false)
      setNewMed(blankMed())
      setNameTouched(false)
      await loadAll()
    } catch (e) {
      console.warn('Add medication failed', e)
    } finally {
      setSaving(false)
    }
  }

  // Pause/resume go through updateMedication, which cancels / re-arms the reminder.
  const toggleActive = async (med) => {
    try {
      await updateMedication(med.id, { active: !med.active })
      if (!med.active) await resync() // re-arm with localized text
      await loadAll()
    } catch (e) {
      console.warn('Pause/resume failed', e)
    }
  }

  // Delete goes through deleteMedication, which cancels the reminder.
  const remove = (med) => {
    warningHaptic()
    Alert.alert(t('pf_med_delete_title'), t('pf_med_delete_body', { name: med.name || '' }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try { await deleteMedication(med.id) } catch (e) { console.warn('Delete failed', e) }
          loadAll()
        },
      },
    ])
  }

  const activeMeds = medications.filter(m => m.active)
  const takenCount = activeMeds.filter(m => todayLogs[m.id]).length
  const allTaken = activeMeds.length > 0 && takenCount === activeMeds.length

  const openAdd = () => { setNewMed(blankMed()); setNameTouched(false); setShowAdd(true) }

  return (
    <Screen header={<BackHeader navigation={navigation} title={t('pf_pills')} subtitle={loading ? null : t('pf_med_active_n', { n: activeMeds.length })} />}>
      {loading ? null : medications.length === 0 ? (
        <FadeIn index={0}>
          <EmptyState
            icon="pill" tone="success"
            title={t('no_medications_yet')}
            body={t('no_medications_desc')}
            actionLabel={t('pf_med_add')}
            onAction={openAdd}
          />
        </FadeIn>
      ) : (
        <>
          {activeMeds.length > 0 ? (
            <FadeIn index={0}>
              <Card style={[{ marginTop: 4 }, allTaken && { backgroundColor: colors.successSoft, borderColor: colors.successSoft }]}>
                <View style={styles.row}>
                  <IconBadge name={allTaken ? 'check' : 'pill'} tone={allTaken ? 'success' : 'primary'} size={44} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="subheading">{allTaken ? t('all_done_today') : t('todays_medications')}</AppText>
                    <AppText variant="caption" muted>{t('pf_med_taken_n', { n: takenCount, total: activeMeds.length })}</AppText>
                  </View>
                </View>
              </Card>
            </FadeIn>
          ) : null}

          <View style={{ gap: 10, marginTop: 14 }}>
            {medications.map((med, i) => {
              const ts = typeStyle(med.type)
              const taken = !!todayLogs[med.id]
              const st = stats[med.id] || {}
              const meta = [
                med.dosage ? String(med.dosage) : null,
                formatTime(parseHHMM(med.reminderTime), language),
                parseDate(med.startDate) && med.startDate > today ? t('pf_med_from', { date: formatDate(med.startDate, 'MMM D', language) }) : null,
              ].filter(Boolean).join(' · ')
              return (
                <FadeIn key={med.id} index={i + 1}>
                  <Card style={!med.active && { opacity: 0.6 }}>
                    <View style={styles.row}>
                      <IconBadge name={ts.icon} tone={ts.tone} size={42} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText variant="subheading" numberOfLines={1}>{med.name || t(ts.key)}</AppText>
                        <AppText variant="caption" muted numberOfLines={2}>{meta}</AppText>
                      </View>
                      {med.active ? (
                        <Tap
                          onPress={() => toggleTaken(med.id)}
                          haptic
                          scaleTo={0.9}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: taken }}
                          accessibilityLabel={t('pf_med_mark_taken', { name: med.name || t(ts.key) })}
                          hitSlop={6}
                          style={[styles.check, { borderColor: taken ? colors.success : colors.border, backgroundColor: taken ? colors.success : 'transparent' }]}
                        >
                          {taken ? <Icon name="check" size={18} color={colors.onPrimary} /> : null}
                        </Tap>
                      ) : null}
                    </View>

                    {(st.streak > 0 || st.adherence != null || !med.active) ? (
                      <View style={styles.tags}>
                        {!med.active ? <Tag tone="neutral" text={t('pf_med_paused')} /> : null}
                        {st.streak > 0 ? <Tag tone="warning" text={t('pf_med_streak', { n: st.streak })} /> : null}
                        {st.adherence != null ? <Tag tone="primary" text={t('pf_med_adherence', { n: st.adherence })} /> : null}
                      </View>
                    ) : null}

                    <View style={styles.actions}>
                      <Button
                        title={med.active ? t('pf_med_pause') : t('pf_med_resume')}
                        variant="secondary" size="sm" icon={med.active ? 'clock' : 'refresh'}
                        onPress={() => toggleActive(med)} style={{ flex: 1 }}
                      />
                      <Button
                        title={t('delete')} variant="danger" size="sm" icon="trash"
                        onPress={() => remove(med)} style={{ flex: 1 }}
                      />
                    </View>
                  </Card>
                </FadeIn>
              )
            })}
          </View>

          <Button title={t('pf_med_add')} icon="plus" variant="soft" onPress={openAdd} style={{ marginTop: 16 }} />
        </>
      )}

      <Sheet visible={showAdd} onClose={() => setShowAdd(false)} title={t('pf_med_add')}>
        <AppText variant="overline" muted style={{ marginBottom: 8 }}>{t('pf_med_type')}</AppText>
        <View style={styles.types}>
          {TYPE_IDS.map(id => {
            const ts = typeStyle(id)
            return (
              <Chip
                key={id}
                label={t(ts.key)}
                icon={ts.icon}
                tone={ts.tone}
                selected={newMed.type === id}
                onPress={() => setNewMed(prev => {
                  // Prefill the name from the type unless the user typed their own.
                  const prevLabel = t(typeStyle(prev.type).key)
                  const name = !prev.name.trim() || prev.name === prevLabel ? (id === 'other' ? '' : t(ts.key)) : prev.name
                  return { ...prev, type: id, name }
                })}
              />
            )
          })}
        </View>
        <Field
          label={t('pf_med_name')}
          value={newMed.name}
          onChangeText={(v) => setNewMed(prev => ({ ...prev, name: v }))}
          placeholder={t('name_med_placeholder')}
          maxLength={40}
          error={nameTouched && !newMed.name.trim() ? t('pf_name_required') : null}
          style={{ marginTop: 14 }}
        />
        <Field
          label={t('pf_med_dosage')}
          value={newMed.dosage}
          onChangeText={(v) => setNewMed(prev => ({ ...prev, dosage: v }))}
          placeholder={t('dosage_placeholder')}
          maxLength={30}
          style={{ marginTop: 12 }}
        />
        <ListGroup style={{ marginTop: 14 }}>
          <ListRow
            icon="clock" tone="primary"
            title={t('pf_med_reminder_time')}
            value={formatTime(parseHHMM(newMed.reminderTime), language)}
            onPress={() => picker.open({
              mode: 'time',
              title: t('pf_med_reminder_time'),
              value: timeToDate(parseHHMM(newMed.reminderTime)),
              is24Hour: language !== 'en',
              onPick: (d) => setNewMed(prev => ({ ...prev, reminderTime: toHHMM(d) })),
            })}
          />
          <ListRow
            icon="calendar" tone="info"
            title={t('pf_med_start')}
            value={formatDate(newMed.startDate, 'MMM D, YYYY', language)}
            onPress={() => picker.open({
              mode: 'date',
              title: t('pf_med_start'),
              value: parseDate(newMed.startDate)?.toDate() || new Date(),
              minimumDate: dayjs().subtract(1, 'year').toDate(),
              maximumDate: dayjs().add(1, 'year').toDate(),
              onPick: (d) => setNewMed(prev => ({ ...prev, startDate: dayjs(d).format('YYYY-MM-DD') })),
            })}
          />
        </ListGroup>
        <Button title={t('pf_med_save')} onPress={add} loading={saving} style={{ marginTop: 18 }} />
        {picker.element}
      </Sheet>
    </Screen>
  )
}

const Tag = ({ text, tone }) => {
  const { colors } = useTheme()
  const fg = colors[tone] || colors.textMuted
  const bg = colors[`${tone}Soft`] || colors.surfaceAlt
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <AppText variant="small" color={fg}>{text}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})

export default Medications
