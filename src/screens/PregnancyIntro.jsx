import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../context/ThemeContext'
import { saveData } from '../utils/storage'
import dayjs from 'dayjs'

const PregnancyIntro = ({ navigation }) => {
  const { colors } = useTheme()

  const handleContinue = async () => {
    await saveData('pregnancy_mode', true)
    await saveData('gestation_start', dayjs().format('YYYY-MM-DD'))
    navigation.replace('PregnancyMode')
  }

  const styles = makeStyles(colors)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Purple gradient header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: 'white' }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pregnancy mode</Text>

        <Text style={styles.congratsText}>
          Congratulations{'\n'}Mom-to-be!
        </Text>

        <View style={styles.babyWrap}>
          <Text style={{ fontSize: 18, position: 'absolute', top: 10, left: 40 }}>✨</Text>
          <Text style={{ fontSize: 18, position: 'absolute', top: 50, right: 30 }}>⭐</Text>
          <View style={styles.babyCloud}>
            <Text style={{ fontSize: 56 }}>👶</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.hereTitle, { color: colors.textPrimary }]}>Here you can:</Text>

        <View style={styles.featureRow}>
          <Text style={{ fontSize: 28 }}>⏳</Text>
          <Text style={[styles.featureText, { color: colors.textPrimary }]}>
            Count down the days until the birth of your baby
          </Text>
        </View>

        <View style={styles.featureRow}>
          <Text style={{ fontSize: 28 }}>❤️</Text>
          <Text style={[styles.featureText, { color: colors.textPrimary }]}>
            Track your weight & health data and share with your doctor
          </Text>
        </View>
      </View>

      <View style={styles.bottomWrap}>
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: colors.pink }]}
          onPress={handleContinue}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
          *Click continue to turn on your pregnancy mode.
        </Text>
      </View>

    </View>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: '#7C5CFC',
    paddingTop: 50,
    paddingBottom: 30,
    alignItems: 'center',
  },
  backBtn: { position: 'absolute', top: 50, left: 16 },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 20 },
  congratsText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 20,
  },
  babyWrap: { width: 160, height: 130, alignItems: 'center', justifyContent: 'center' },
  babyCloud: {
    width: 140,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, padding: 24 },
  hereTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 24 },
  featureText: { fontSize: 15, lineHeight: 22, flex: 1 },
  bottomWrap: { padding: 20, alignItems: 'center' },
  continueBtn: { width: '100%', paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginBottom: 12 },
  continueBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
  noteText: { fontSize: 12, textAlign: 'center' },
})

export default PregnancyIntro