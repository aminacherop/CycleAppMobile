import { useState } from 'react'
import { Alert, View, StyleSheet } from 'react-native'
// Loaded lazily: a binary without this native module must still start.
const loadDocumentPicker = () => {
  try { return require('expo-document-picker') } catch { return null }
}
import { File } from 'expo-file-system'
import { readAsStringAsync } from 'expo-file-system/legacy'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import { Screen, AppText, Button, Card, FadeIn, IconBadge } from '../../components/ui'
import { exportBackup, importBackup, validateBackup } from '../../utils/backup'
import { successHaptic, warningHaptic } from '../../utils/haptics'
import { BackHeader } from './shared'

const MAX_BYTES = 25 * 1024 * 1024

const readText = async (uri) => {
  try {
    return await new File(uri).text()
  } catch {
    return readAsStringAsync(uri)
  }
}

export default function BackupScreen({ navigation }) {
  const { t } = useLanguage()
  const app = useApp()
  const [busy, setBusy] = useState(null) // 'export' | 'import' | null

  const errorText = (code) => {
    const c = String(code || '')
    if (c === 'not_json' || c === 'not_a_backup') return t('pf_restore_not_backup')
    if (c === 'unsupported_format') return t('pf_restore_newer')
    return t('pf_restore_failed')
  }

  const doExport = async () => {
    setBusy('export')
    try {
      const res = await exportBackup()
      if (!res?.success) {
        warningHaptic()
        Alert.alert(t('pf_export_failed'), t('pf_try_again'))
      }
    } catch {
      Alert.alert(t('pf_export_failed'), t('pf_try_again'))
    } finally {
      setBusy(null)
    }
  }

  const doImport = async () => {
    setBusy('import')
    let text
    try {
      const DocumentPicker = loadDocumentPicker()
      if (!DocumentPicker?.getDocumentAsync) throw new Error('Document picker unavailable')
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true, multiple: false })
      const asset = res?.assets?.[0]
      if (res?.canceled || !asset?.uri) { setBusy(null); return }
      if (asset.size && asset.size > MAX_BYTES) throw new Error('not_a_backup')
      text = await readText(asset.uri)
    } catch (e) {
      setBusy(null)
      warningHaptic()
      Alert.alert(t('pf_restore_title'), errorText(e?.message === 'not_a_backup' ? 'not_a_backup' : 'read'))
      return
    }
    const check = validateBackup(text)
    if (!check.ok) {
      setBusy(null)
      warningHaptic()
      Alert.alert(t('pf_restore_title'), errorText(check.error))
      return
    }
    setBusy(null)
    Alert.alert(t('pf_restore_confirm_title'), t('pf_restore_confirm_body'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('pf_restore_btn'),
        style: 'destructive',
        onPress: async () => {
          setBusy('import')
          try {
            const r = await importBackup(text)
            if (!r?.success) {
              warningHaptic()
              Alert.alert(t('pf_restore_title'), errorText(r?.error))
              return
            }
            await app.reload()
            successHaptic()
            Alert.alert(t('pf_restore_done_title'), t('pf_restore_done_body'))
          } catch {
            Alert.alert(t('pf_restore_title'), t('pf_restore_failed'))
          } finally {
            setBusy(null)
          }
        },
      },
    ])
  }

  return (
    <Screen header={<BackHeader navigation={navigation} title={t('pf_backup_restore')} />}>
      <FadeIn index={0}>
        <Card style={{ marginTop: 4 }}>
          <View style={styles.row}>
            <IconBadge name="upload" tone="info" size={44} />
            <View style={{ flex: 1 }}>
              <AppText variant="subheading">{t('pf_export_title')}</AppText>
              <AppText variant="caption" muted style={{ marginTop: 2 }}>{t('pf_export_body')}</AppText>
            </View>
          </View>
          <Button
            title={t('pf_export_btn')} icon="share" size="md"
            loading={busy === 'export'} disabled={!!busy && busy !== 'export'}
            onPress={doExport} style={{ marginTop: 14 }}
          />
        </Card>
      </FadeIn>

      <FadeIn index={1}>
        <Card style={{ marginTop: 12 }}>
          <View style={styles.row}>
            <IconBadge name="download" tone="success" size={44} />
            <View style={{ flex: 1 }}>
              <AppText variant="subheading">{t('pf_restore_title')}</AppText>
              <AppText variant="caption" muted style={{ marginTop: 2 }}>{t('pf_restore_body')}</AppText>
            </View>
          </View>
          <Button
            title={t('pf_restore_pick')} icon="doc" size="md" variant="secondary"
            loading={busy === 'import'} disabled={!!busy && busy !== 'import'}
            onPress={doImport} style={{ marginTop: 14 }}
          />
        </Card>
      </FadeIn>

      <FadeIn index={2}>
        <View style={[styles.row, { marginTop: 18, paddingHorizontal: 4 }]}>
          <IconBadge name="lock" tone="primary" size={28} />
          <AppText variant="small" muted style={{ flex: 1, fontWeight: '500' }}>{t('pf_backup_private')}</AppText>
        </View>
      </FadeIn>
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
})
