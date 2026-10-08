import { useState } from 'react'
import { Alert, Linking, View, StyleSheet } from 'react-native'
import { AdsConsent } from 'react-native-google-mobile-ads'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import { Screen, AppText, Card, FadeIn, Icon, ListGroup, ListRow } from '../../components/ui'
import { warningHaptic } from '../../utils/haptics'
import { BackHeader } from './shared'

const PRIVACY_URL = 'https://sites.google.com/view/cycleapp-privacy/home'

const Point = ({ icon, text }) => {
  const { colors } = useTheme()
  return (
    <View style={styles.point}>
      <Icon name={icon} size={18} color={colors.primary} />
      <AppText variant="caption" style={{ flex: 1 }}>{text}</AppText>
    </View>
  )
}

export default function PrivacyScreen({ navigation }) {
  const { t } = useLanguage()
  const app = useApp()
  const [deleting, setDeleting] = useState(false)

  const openAdChoices = async () => {
    try {
      await AdsConsent.showPrivacyOptionsForm()
    } catch (e) {
      Alert.alert(t('pf_ad_choices'), t('pf_ad_choices_unavailable'))
    }
  }

  const openPolicy = () => Linking.openURL(PRIVACY_URL).catch(() => {})

  const deleteAll = () => {
    warningHaptic()
    Alert.alert(t('delete_confirm_title'), t('pf_delete_body'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('pf_continue'),
        style: 'destructive',
        onPress: () => Alert.alert(t('pf_delete_sure_title'), t('pf_delete_sure_body'), [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('pf_delete_everything'),
            style: 'destructive',
            onPress: async () => {
              if (deleting) return
              setDeleting(true)
              try {
                await app.resetAllData()
              } catch (e) {
                console.warn('Reset failed', e)
                Alert.alert(t('pf_delete_failed'), t('pf_try_again'))
                setDeleting(false)
              }
            },
          },
        ]),
      },
    ])
  }

  return (
    <Screen header={<BackHeader navigation={navigation} title={t('pf_privacy')} />}>
      <FadeIn index={0}>
        <Card style={{ marginTop: 4, gap: 12 }}>
          <AppText variant="subheading">{t('pf_privacy_title')}</AppText>
          <Point icon="lock" text={t('pf_privacy_device')} />
          <Point icon="shield" text={t('pf_privacy_no_account')} />
          <Point icon="info" text={t('pf_privacy_ads')} />
        </Card>
      </FadeIn>

      <FadeIn index={1}>
        <ListGroup>
          <ListRow icon="target" tone="info" title={t('pf_ad_choices')} subtitle={t('pf_ad_choices_sub')} onPress={openAdChoices} />
          <ListRow icon="doc" tone="ovulation" title={t('privacy_policy')} onPress={openPolicy} />
        </ListGroup>
      </FadeIn>

      <FadeIn index={2}>
        <ListGroup footer={t('pf_delete_footer')}>
          <ListRow icon="trash" title={t('pf_delete_all')} destructive onPress={deleting ? undefined : deleteAll} />
        </ListGroup>
      </FadeIn>
    </Screen>
  )
}

const styles = StyleSheet.create({
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
})
