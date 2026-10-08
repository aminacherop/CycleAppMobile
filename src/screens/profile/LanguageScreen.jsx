import { useState } from 'react'
import { Alert, View } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { Screen, AppText, FadeIn, ListGroup, Tap, Icon } from '../../components/ui'
import { t as translate } from '../../utils/translations'
import { BackHeader, useSavedFlash } from './shared'

export default function LanguageScreen({ navigation }) {
  const { colors } = useTheme()
  const { t, language, changeLanguage, languages } = useLanguage()
  const [saved, flash] = useSavedFlash()
  const [busy, setBusy] = useState(false)
  const list = Array.isArray(languages) ? languages : []

  const choose = async (code) => {
    if (code === language || busy) return
    setBusy(true)
    try {
      const needsRestart = await changeLanguage(code)
      flash()
      if (needsRestart) {
        // Read the strings in the NEW language (t still points at the old one this render).
        Alert.alert(translate(code, 'pf_restart_title'), translate(code, 'pf_restart_body'), [{ text: translate(code, 'ok') }])
      }
    } catch (e) {
      console.warn('Language change failed', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen header={<BackHeader navigation={navigation} title={t('language')} saved={saved} />}>
      <FadeIn index={0}>
        <ListGroup style={{ marginTop: 4 }}>
          {list.map(l => {
            const on = l.code === language
            return (
              <Tap
                key={l.code}
                onPress={() => choose(l.code)}
                scaleTo={0.985}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={l.nativeName}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, minHeight: 56, gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="body" style={{ fontWeight: on ? '700' : '600' }} color={on ? colors.primary : colors.text} numberOfLines={1}>
                      {l.nativeName}
                    </AppText>
                    {l.name !== l.nativeName ? <AppText variant="small" muted style={{ fontWeight: '500' }}>{l.name}</AppText> : null}
                  </View>
                  {on ? <Icon name="check" size={20} color={colors.primary} /> : null}
                </View>
              </Tap>
            )
          })}
        </ListGroup>
      </FadeIn>
    </Screen>
  )
}
