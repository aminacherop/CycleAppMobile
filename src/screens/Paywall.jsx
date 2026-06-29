import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native'
import { useTheme } from '../context/ThemeContext'
import { usePremium } from '../context/PremiumContext'

const PRICES = {
  monthly: { KES: 350, USD: 2.99 },
  yearly: { KES: 3000, USD: 24.99 },
}

const Paywall = ({ visible, onClose, feature }) => {
  const { colors } = useTheme()
  const { activatePremium } = usePremium()
  const [plan, setPlan] = useState('monthly')
  const [step, setStep] = useState('plans')
  // plans | processing | success

  const currency = 'KES'
  const amount = PRICES[plan][currency]

  const handleSubscribe = () => {
    setStep('processing')
    // Placeholder — real payment integration (IntaSend/Stripe) goes here
    setTimeout(async () => {
      await activatePremium(plan, { amount, currency, transaction_id: 'demo' })
      setStep('success')
    }, 1800)
  }

  const handleClose = () => {
    setStep('plans')
    onClose()
  }

  const premiumFeatures = [
    { emoji: '🤖', label: 'AI health insights' },
    { emoji: '📄', label: 'PDF health report export' },
    { emoji: '👫', label: 'Partner sharing mode' },
    { emoji: '🧬', label: 'Condition tracking' },
    { emoji: '📊', label: 'Deep cycle analytics' },
    { emoji: '🚫', label: 'No ads' },
  ]

  const styles = makeStyles(colors)

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.white }]}>

          {step === 'plans' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Text style={{ fontSize: 16, color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>

              <View style={styles.header}>
                <Text style={{ fontSize: 40 }}>👑</Text>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Unlock Premium</Text>
                {feature && (
                  <Text style={[styles.featureHint, { color: colors.textSecondary }]}>
                    🔒 {feature} is a premium feature
                  </Text>
                )}
              </View>

              <View style={[styles.planToggle, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                  style={[styles.planBtn, plan === 'monthly' && { backgroundColor: colors.white }]}
                  onPress={() => setPlan('monthly')}
                >
                  <Text style={{ color: plan === 'monthly' ? colors.pink : colors.textSecondary, fontWeight: '600' }}>
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.planBtn, plan === 'yearly' && { backgroundColor: colors.white }]}
                  onPress={() => setPlan('yearly')}
                >
                  <Text style={{ color: plan === 'yearly' ? colors.pink : colors.textSecondary, fontWeight: '600' }}>
                    Yearly
                  </Text>
                  <View style={styles.saveBadge}>
                    <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }}>Save 29%</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.priceDisplay}>
                <Text style={[styles.priceNumber, { color: colors.pink }]}>
                  {currency} {amount.toLocaleString()}
                </Text>
                <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
                  /{plan === 'monthly' ? 'mo' : 'yr'}
                </Text>
              </View>

              <View style={[styles.featuresCard, { borderColor: colors.border }]}>
                {premiumFeatures.map((f, i) => (
                  <View key={i} style={[styles.featureRow, { borderBottomColor: colors.border }]}>
                    <Text style={{ fontSize: 16 }}>{f.emoji}</Text>
                    <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 13 }}>{f.label}</Text>
                    <Text style={{ color: colors.success, fontWeight: '700' }}>✓</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.subscribeBtn, { backgroundColor: colors.pink }]}
                onPress={handleSubscribe}
              >
                <Text style={styles.subscribeBtnText}>
                  Subscribe — {currency} {amount.toLocaleString()}/{plan === 'monthly' ? 'mo' : 'yr'}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.terms, { color: colors.textSecondary }]}>
                Cancel anytime. Secure payment.
              </Text>
            </ScrollView>
          )}

          {step === 'processing' && (
            <View style={styles.center}>
              <Text style={{ fontSize: 48 }}>🌸</Text>
              <Text style={[styles.processingText, { color: colors.textPrimary }]}>
                Processing payment...
              </Text>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.center}>
              <Text style={{ fontSize: 64 }}>🎉</Text>
              <Text style={[styles.title, { color: colors.textPrimary, marginTop: 12 }]}>
                Welcome to Premium!
              </Text>
              <Text style={[styles.featureHint, { color: colors.textSecondary, marginBottom: 20 }]}>
                Your {plan} subscription is now active.
              </Text>
              <TouchableOpacity
                style={[styles.subscribeBtn, { backgroundColor: colors.pink }]}
                onPress={handleClose}
              >
                <Text style={styles.subscribeBtnText}>Start using Premium →</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  closeBtn: { alignSelf: 'flex-end', padding: 6 },
  header: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  featureHint: { fontSize: 13, textAlign: 'center' },
  planToggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16, gap: 4 },
  planBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  saveBadge: { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  priceDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 16, gap: 4 },
  priceNumber: { fontSize: 36, fontWeight: '800' },
  pricePeriod: { fontSize: 14 },
  featuresCard: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1 },
  subscribeBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 8 },
  subscribeBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  terms: { fontSize: 11, textAlign: 'center', marginBottom: 10 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  processingText: { fontSize: 15, fontWeight: '600', marginTop: 16 },
})

export default Paywall