import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Share,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { usePremium } from '../context/PremiumContext'
import Paywall from './Paywall'
import {
  createPairingCode,
  loadPairingCode,
  validatePairingCode,
  savePartnerPairing,
  loadPartnerPairing,
  removePartnerPairing,
  getDaysRemaining,
} from '../utils/partnerCode'

const PartnerInvite = ({ navigation, cycleSettings, userProfile }) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const { isPremium } = usePremium()
  const [mode, setMode] = useState('menu')
  const [showPaywall, setShowPaywall] = useState(false)
  // menu | generate | enter | view

  const [pairingData, setPairingData] = useState(null)
  const [partnerPairing, setPartnerPairing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const [enteredCode, setEnteredCode] = useState('')
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    const existing = await loadPairingCode()
    const partner = await loadPartnerPairing()
    setPairingData(existing)
    setPartnerPairing(partner)
    setLoading(false)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    const data = await createPairingCode(cycleSettings, userProfile)
    setPairingData(data)
    setMode('generate')
    setGenerating(false)
  }

  const handleCopy = async () => {
    await Clipboard.setStringAsync(pairingData.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const daysLeft = getDaysRemaining(pairingData.expiresAt)
    const message = `🌸 CycleApp Partner Invitation\n\nHey! I'm using CycleApp to share my cycle updates with you.\n\nYour pairing code: ${pairingData.code}\n\nSteps:\n1. Download CycleApp\n2. Tap "I have a partner code"\n3. Enter: ${pairingData.code}\n\n⏰ Expires in ${daysLeft} days.\n\nOnce paired, you'll see my current cycle phase, mood, and tips for supporting me — nothing sensitive is shared.`

    try {
      await Share.share({ message })
    } catch (err) {
      console.error('Share error:', err)
    }
  }

  const handleValidate = async () => {
    if (!enteredCode.trim()) {
      setError(t('enter_pairing_code_error'))
      return
    }
    setValidating(true)
    setError('')
    const result = await validatePairingCode(enteredCode.trim())
    if (result.valid) {
      await savePartnerPairing(result.data)
      setPartnerPairing(result.data)
      setMode('view')
    } else {
      setError(
        result.reason === 'Code has expired'
          ? t('code_expired_error')
          : t('invalid_code_error')
      )
    }
    setValidating(false)
  }

  const handleUnpair = async () => {
    await removePartnerPairing()
    setPartnerPairing(null)
    setMode('menu')
  }

  const styles = makeStyles(colors)

  if (loading) return null

  if (!isPremium) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', justifyContent: 'center', flexGrow: 1 }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ position: 'absolute', top: 16, left: 16 }}
        >
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>👫</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>
          {t('partner_sharing')}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 24 }}>
          {t('partner_unlock_desc')}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.pink, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 24 }}
          onPress={() => setShowPaywall(true)}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{t('unlock_premium')}</Text>
        </TouchableOpacity>
        <Paywall
          visible={showPaywall}
          feature="Partner Sharing"
          onClose={() => setShowPaywall(false)}
        />
      </ScrollView>
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
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('partner_sharing')}</Text>

      {/* ── MENU ── */}
      {mode === 'menu' && (
        <View>
          <View style={styles.heroWrap}>
            <Text style={styles.heroIcon}>👫</Text>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              {t('share_cycle_with_partner')}
            </Text>
            <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
              {t('partner_privacy_desc')}
            </Text>
          </View>

          <View style={[styles.privacyCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={[styles.privacyTitle, { color: colors.textPrimary }]}>{t('what_partner_sees')}</Text>
            {[
              { yes: true, text: t('current_cycle_phase') },
              { yes: true, text: t('general_mood_summary') },
              { yes: true, text: t('days_until_next_period') },
              { yes: false, text: t('detailed_symptoms_logs') },
              { yes: false, text: t('test_results_notes') },
            ].map((row, i) => (
              <View key={i} style={styles.privacyRow}>
                <Text style={{ fontSize: 16 }}>{row.yes ? '✅' : '❌'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>{row.text}</Text>
              </View>
            ))}
          </View>

          {partnerPairing ? (
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: colors.pink }]}
              onPress={() => setMode('view')}
            >
              <Text style={styles.btnPrimaryText}>{t('view_partners_cycle')}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.pink }]}
            onPress={pairingData ? () => setMode('generate') : handleGenerate}
            disabled={generating}
          >
            <Text style={styles.btnPrimaryText}>
              {generating ? t('generating_dots') : pairingData ? t('view_pairing_code') : t('generate_pairing_code')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSecondary, { borderColor: colors.border }]}
            onPress={() => setMode('enter')}
          >
            <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>
              {t('i_have_partner_code')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── GENERATE / SHOW CODE ── */}
      {mode === 'generate' && pairingData && (
        <View>
          <TouchableOpacity onPress={() => setMode('menu')} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('back_to_menu')}</Text>
          </TouchableOpacity>

          <View style={[styles.codeCard, { backgroundColor: colors.pinkLight, borderColor: colors.pinkMid }]}>
            <Text style={[styles.codeLabel, { color: colors.pinkDark }]}>{t('your_pairing_code')}</Text>
            <View style={[styles.codeDisplay, { backgroundColor: colors.white }]}>
              <Text style={[styles.codeText, { color: colors.pink }]}>{pairingData.code}</Text>
            </View>
            <Text style={[styles.codeExpiry, { color: colors.pinkDark }]}>
              {t('expires_in_days')} {getDaysRemaining(pairingData.expiresAt)} {t('days_label')} ·{' '}
              {dayjs(pairingData.expiresAt).format('MMM D, YYYY')}
            </Text>
          </View>

          <View style={[styles.instructionsCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={[styles.instructionsTitle, { color: colors.textPrimary }]}>
              {t('share_with_partner_title')}
            </Text>
            {[
              t('step_share_code'),
              t('step_download'),
              t('step_enter_code'),
              t('step_complete'),
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: colors.pinkLight }]}>
                  <Text style={{ color: colors.pinkDark, fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.shareRow}>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: '#E8F5E9' }]}
              onPress={handleShare}
            >
              <Text style={{ color: '#1B5E20', fontWeight: '600', fontSize: 13 }}>{t('share_btn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: copied ? '#D1FAE5' : colors.pinkLight }]}
              onPress={handleCopy}
            >
              <Text style={{ color: copied ? '#065F46' : colors.pinkDark, fontWeight: '600', fontSize: 13 }}>
                {copied ? t('copied_btn') : t('copy_code_btn')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btnSecondary, { borderColor: colors.border, marginTop: 12 }]}
            onPress={handleGenerate}
          >
            <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>
              {t('generate_new_code')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── ENTER CODE ── */}
      {mode === 'enter' && (
        <View>
          <TouchableOpacity onPress={() => setMode('menu')} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>← Back to menu</Text>
          </TouchableOpacity>

          <Text style={[styles.heroTitle, { color: colors.textPrimary, textAlign: 'left', marginBottom: 6 }]}>
            {t('enter_partner_code_title')}
          </Text>
          <Text style={[styles.heroDesc, { color: colors.textSecondary, textAlign: 'left', marginBottom: 20 }]}>
            {t('enter_partner_code_desc')}
          </Text>

          <View style={[styles.enterCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('pairing_code_label')}</Text>
            <TextInput
              style={[
                styles.codeInput,
                {
                  borderColor: error ? '#EF4444' : colors.border,
                  color: colors.pink,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="CYC-847291"
              placeholderTextColor={colors.textSecondary}
              value={enteredCode}
              onChangeText={t => { setEnteredCode(t.toUpperCase()); setError('') }}
              autoCapitalize="characters"
              maxLength={10}
            />
            {error && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>{error}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: enteredCode.trim() ? colors.pink : colors.border }]}
            onPress={handleValidate}
            disabled={validating || !enteredCode.trim()}
          >
            <Text style={styles.btnPrimaryText}>
              {validating ? t('checking_dots') : t('pair_with_partner')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── VIEW PARTNER'S CYCLE ── */}
      {mode === 'view' && partnerPairing && (() => {
        const { sharedData, userName } = partnerPairing
        const lps = dayjs(sharedData.lastPeriodStart)
        const today = dayjs()
        const cLen = sharedData.cycleLength || 28
        const pLen = sharedData.periodLength || 5
        const cycleDay = Math.max(1, today.diff(lps, 'day') + 1)

        let nextPeriod = lps.add(cLen, 'day')
        while (nextPeriod.isBefore(today, 'day')) nextPeriod = nextPeriod.add(cLen, 'day')

        const daysUntilPeriod = Math.max(0, nextPeriod.diff(today, 'day'))
        const ovulation = lps.add(cLen - 14, 'day')

        const phase =
          cycleDay <= pLen ? 'Menstrual' :
          cycleDay <= cLen - 16 ? 'Follicular' :
          cycleDay <= cLen - 12 ? 'Ovulation' : 'Luteal'

        const phaseColors = { Menstrual: '#C2527A', Follicular: '#7C3AED', Ovulation: '#F59E0B', Luteal: '#10B981' }
        const phaseTips = {
          Menstrual: '💗 Be extra patient. Offer comfort food and warmth.',
          Follicular: '🌟 Great time to plan dates and activities together.',
          Ovulation: '✨ She is energetic and confident — great for connection.',
          Luteal: '🧘 Give her space. Cravings and mood swings are hormonal.',
        }

        return (
          <View>
            <TouchableOpacity onPress={() => setMode('menu')} style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>← Back to menu</Text>
            </TouchableOpacity>

            <Text style={[styles.heroTitle, { color: colors.textPrimary, textAlign: 'left' }]}>
              {userName}'s Cycle
            </Text>
            <Text style={[styles.heroDesc, { color: colors.textSecondary, textAlign: 'left', marginBottom: 16 }]}>
              {t('safe_summary_only')}
            </Text>

            <View style={[styles.phaseCard, { backgroundColor: phaseColors[phase] + '15', borderColor: phaseColors[phase] + '40' }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('current_phase')}</Text>
              <Text style={{ color: phaseColors[phase], fontSize: 20, fontWeight: '700', marginVertical: 4 }}>
                {t(`phase_${phase.toLowerCase()}`)} {t('phase_suffix')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('day_of')} {cycleDay} {t('of')} {cLen}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: colors.white, borderColor: colors.border }]}>
                <Text style={{ color: colors.pink, fontSize: 20, fontWeight: '700' }}>{daysUntilPeriod}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{t('days_to_period')}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.white, borderColor: colors.border }]}>
                <Text style={{ color: '#F59E0B', fontSize: 20, fontWeight: '700' }}>{ovulation.format('MMM D')}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{t('ovulation_date')}</Text>
              </View>
            </View>

            <View style={[styles.tipCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13, marginBottom: 6 }}>
                {t('how_to_support')} {userName}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
                {t(`tip_${phase.toLowerCase()}`)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btnDanger, { borderColor: '#EF4444' }]}
              onPress={handleUnpair}
            >
              <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 14 }}>
                {t('disconnect_from')} {userName}
              </Text>
            </TouchableOpacity>
          </View>
        )
      })()}

    </ScrollView>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  backBtn: { paddingVertical: 8, marginBottom: 4 },
  backBtnText: { fontSize: 14 },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  heroWrap: { alignItems: 'center', marginBottom: 16 },
  heroIcon: { fontSize: 48, marginBottom: 10 },
  heroTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  heroDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  privacyCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  privacyTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  btnPrimary: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  btnPrimaryText: { color: 'white', fontSize: 15, fontWeight: '700' },
  btnSecondary: { paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, alignItems: 'center' },
  btnSecondaryText: { fontSize: 13, fontWeight: '600' },
  btnDanger: { paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', marginTop: 8 },
  codeCard: { borderRadius: 20, borderWidth: 1.5, padding: 24, alignItems: 'center', marginBottom: 16 },
  codeLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  codeDisplay: { borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24, marginBottom: 12 },
  codeText: { fontSize: 28, fontWeight: '800', letterSpacing: 3 },
  codeExpiry: { fontSize: 12, textAlign: 'center' },
  instructionsCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  instructionsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  shareRow: { flexDirection: 'row', gap: 8 },
  shareBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  enterCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  codeInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 3,
  },
  phaseCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center' },
  tipCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
})

export default PartnerInvite