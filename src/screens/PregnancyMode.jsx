import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { saveData, loadData } from '../utils/storage'

const PregnancyMode = ({ navigation }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const [gestationStart, setGestationStart] = useState(dayjs().format('YYYY-MM-DD'))
  const [showTurnOffModal, setShowTurnOffModal] = useState(false)
  const [showHomepageModal, setShowHomepageModal] = useState(false)
  const [homepageDisplay, setHomepageDisplay] = useState('since_pregnancy')
  // 'days_to_baby' | 'since_pregnancy'

  useEffect(() => {
    const load = async () => {
      const saved = await loadData('gestation_start', dayjs().format('YYYY-MM-DD'))
      const display = await loadData('pregnancy_homepage_display', 'since_pregnancy')
      setGestationStart(saved)
      setHomepageDisplay(display)
    }
    load()
  }, [])

  const start = dayjs(gestationStart)
  const today = dayjs()
  const totalDays = today.diff(start, 'day')
  const weeks = Math.floor(totalDays / 7)
  const days = totalDays % 7

  // Estimate due date as 280 days (40 weeks) from gestation start
  const dueDate = start.add(280, 'day')
  const daysToBaby = Math.max(0, dueDate.diff(today, 'day'))

  const homepageLabel = homepageDisplay === 'days_to_baby'
    ? `${daysToBaby} ${t('days_to_baby_suffix')}`
    : `${weeks}W${days}D ${t('since_pregnancy_suffix')}`

  const handleNoLongerPregnant = async () => {
    await saveData('pregnancy_mode', false)
    await saveData('pregnancy_ended_reason', 'no_longer_pregnant')
    setShowTurnOffModal(false)
    navigation.goBack()
  }

  const handleTurnedOnByMistake = async () => {
    await saveData('pregnancy_mode', false)
    await saveData('user_goal', 'track_period')
    setShowTurnOffModal(false)
    navigation.goBack()
  }

  const handleBabyBorn = async () => {
    await saveData('pregnancy_mode', false)
    await saveData('baby_born_date', today.format('YYYY-MM-DD'))
    navigation.goBack()
  }

  const handleSaveHomepageChoice = async () => {
    await saveData('pregnancy_homepage_display', homepageDisplay)
    setShowHomepageModal(false)
  }

  const styles = makeStyles(colors)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('pregnancy_title')}</Text>
        <TouchableOpacity
          style={[styles.checkBtn, { backgroundColor: colors.pink }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>✓</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 16 }}>

        {/* Estimated start of gestation */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.white }]}
          onPress={() => navigation.navigate('GestationDatePicker', { gestationStart })}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {t('estimated_gestation_start')}
          </Text>
          <Text style={{ color: '#5B4FE5', fontSize: 16, fontWeight: '700' }}>
            {start.format('MMM D, YYYY')}
          </Text>
        </TouchableOpacity>

        {/* Display on homepage */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.white }]}
          onPress={() => setShowHomepageModal(true)}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {t('display_on_homepage')}
          </Text>
          <Text style={{ color: '#5B4FE5', fontSize: 16, fontWeight: '700' }}>
            {homepageLabel}
          </Text>
        </TouchableOpacity>

        {/* Turn off */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.white }]}
          onPress={() => setShowTurnOffModal(true)}
        >
          <Text style={{ color: colors.pink, fontSize: 16, fontWeight: '700' }}>
            {t('turn_off_pregnancy_mode')}
          </Text>
        </TouchableOpacity>

      </View>

      {/* My baby was born */}
      <View style={styles.bottomWrap}>
        <TouchableOpacity
          style={[styles.babyBornBtn, { backgroundColor: colors.pink }]}
          onPress={handleBabyBorn}
        >
          <Text style={styles.babyBornBtnText}>{t('my_baby_was_born')}</Text>
        </TouchableOpacity>
      </View>

      {/* Turn off confirmation bottom sheet */}
      <Modal visible={showTurnOffModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowTurnOffModal(false)}
          />
          <View style={[styles.sheet, { backgroundColor: colors.white }]}>
            <TouchableOpacity
              style={styles.closeX}
              onPress={() => setShowTurnOffModal(false)}
            >
              <Text style={{ fontSize: 20, color: colors.textPrimary }}>✕</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetBtnPrimary, { backgroundColor: colors.pink }]}
              onPress={handleNoLongerPregnant}
            >
              <Text style={styles.sheetBtnPrimaryText}>{t('no_longer_pregnant')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetBtnSecondary}
              onPress={handleTurnedOnByMistake}
            >
              <Text style={styles.sheetBtnSecondaryText}>{t('turned_on_by_mistake')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Display on homepage choice bottom sheet */}
      <Modal visible={showHomepageModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowHomepageModal(false)}
          />
          <View style={[styles.sheet, { backgroundColor: colors.white }]}>
            <View style={styles.homepageHeaderRow}>
              <Text style={[styles.homepageTitle, { color: colors.textPrimary }]}>
                {t('choose_homepage_option')}
              </Text>
              <TouchableOpacity onPress={() => setShowHomepageModal(false)}>
                <Text style={{ fontSize: 20, color: colors.textPrimary }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setHomepageDisplay('days_to_baby')}
            >
              <View style={[
                styles.radioOuter,
                { borderColor: homepageDisplay === 'days_to_baby' ? colors.pink : colors.border },
              ]}>
                {homepageDisplay === 'days_to_baby' && (
                  <View style={[styles.radioInner, { backgroundColor: colors.pink }]} />
                )}
              </View>
              <Text style={[styles.radioLabel, { color: colors.textPrimary }]}>
                {daysToBaby} {t('days_to_baby_suffix')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setHomepageDisplay('since_pregnancy')}
            >
              <View style={[
                styles.radioOuter,
                { borderColor: homepageDisplay === 'since_pregnancy' ? colors.pink : colors.border },
              ]}>
                {homepageDisplay === 'since_pregnancy' && (
                  <View style={[styles.radioInner, { backgroundColor: colors.pink }]} />
                )}
              </View>
              <Text style={[styles.radioLabel, { color: colors.textPrimary }]}>
                {weeks}W{days}D {t('since_pregnancy_suffix')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetBtnPrimary, { backgroundColor: colors.pink, marginTop: 16 }]}
              onPress={handleSaveHomepageChoice}
            >
              <Text style={styles.sheetBtnPrimaryText}>{t('done_btn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  checkBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16, padding: 18, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  bottomWrap: { position: 'absolute', bottom: 24, left: 16, right: 16 },
  babyBornBtn: { paddingVertical: 18, borderRadius: 30, alignItems: 'center' },
  babyBornBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 16,
  },
  closeX: { alignSelf: 'flex-end', marginBottom: 16 },
  sheetBtnPrimary: { paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginBottom: 12 },
  sheetBtnPrimaryText: { color: 'white', fontSize: 16, fontWeight: '700' },
  sheetBtnSecondary: { backgroundColor: '#E3EEFB', paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  sheetBtnSecondaryText: { color: '#3B6FAE', fontSize: 16, fontWeight: '600' },

  homepageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  homepageTitle: { fontSize: 17, fontWeight: '700', flex: 1, lineHeight: 23 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  radioLabel: { fontSize: 15, fontWeight: '500' },
})

export default PregnancyMode