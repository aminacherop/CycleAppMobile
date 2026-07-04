import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'

// Bottom-sheet language selector used by Onboarding and Profile.
export default function LanguagePicker({ visible, onClose }) {
  const { colors } = useTheme()
  const { language, languages, changeLanguage, t } = useLanguage()
  const insets = useSafeAreaInsets()

  const handleSelect = async (code) => {
    const needsRestart = await changeLanguage(code)
    onClose?.()
    if (needsRestart) {
      Alert.alert(
        t('restart_required_title'),
        t('restart_required_desc'),
        [{ text: t('ok') || 'OK' }]
      )
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.white, paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('choose_language')}</Text>
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {languages.map((l) => {
              const active = language === l.code
              return (
                <TouchableOpacity
                  key={l.code}
                  style={[
                    styles.item,
                    { borderColor: active ? colors.pink : colors.border, backgroundColor: active ? colors.pinkLight : colors.white },
                  ]}
                  onPress={() => handleSelect(l.code)}
                >
                  <Text style={styles.flag}>{l.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.native, { color: active ? colors.pinkDark : colors.textPrimary }]}>{l.nativeName}</Text>
                    <Text style={[styles.name, { color: colors.textSecondary }]}>{l.name}</Text>
                  </View>
                  {active && <Text style={[styles.check, { color: colors.pink }]}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  flag: { fontSize: 26 },
  native: { fontSize: 15, fontWeight: '700' },
  name: { fontSize: 12, marginTop: 1 },
  check: { fontSize: 18, fontWeight: '800' },
})
