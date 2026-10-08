import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import dayjs from 'dayjs'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import {
  Screen, AppText, Button, Chip, FadeIn, ListGroup, ListRow, SectionTitle,
} from '../../components/ui'
import { formatDate, parseDate } from '../../utils/dates'
import { successHaptic } from '../../utils/haptics'
import { BackHeader, Field, ageFromDob, usePicker } from './shared'
import { CONDITION_KEYS } from './ProfileScreen'

const MAX_NAME = 40
const MIN_AGE = 8

export default function EditProfileScreen({ navigation }) {
  const { t, language } = useLanguage()
  const app = useApp()
  const picker = usePicker()
  const p = app.userProfile || {}

  const [name, setName] = useState(typeof p.name === 'string' ? p.name : '')
  const [dob, setDob] = useState(parseDate(p.dob) ? dayjs(p.dob).format('YYYY-MM-DD') : '')
  const [condition, setCondition] = useState(CONDITION_KEYS[p.condition] ? p.condition : 'none')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const maxDob = dayjs().subtract(MIN_AGE, 'year').toDate()
  const minDob = dayjs().subtract(100, 'year').toDate()
  const age = ageFromDob(dob)

  const pickDob = () => picker.open({
    mode: 'date',
    title: t('date_of_birth'),
    value: parseDate(dob)?.toDate() || dayjs().subtract(25, 'year').toDate(),
    minimumDate: minDob,
    maximumDate: maxDob,
    onPick: (d) => setDob(dayjs(d).format('YYYY-MM-DD')),
  })

  const save = async () => {
    const clean = name.trim().replace(/\s+/g, ' ')
    if (!clean) { setError(t('pf_name_required')); return }
    setSaving(true)
    try {
      await app.updateProfile(prev => ({ ...(prev || {}), name: clean.slice(0, MAX_NAME), dob, condition }))
      successHaptic()
      navigation.goBack()
    } catch (e) {
      console.warn('Profile save failed', e)
      setSaving(false)
    }
  }

  return (
    <Screen header={<BackHeader navigation={navigation} title={t('edit_profile')} />}>
      <FadeIn index={0}>
        <Field
          label={t('full_name')}
          value={name}
          onChangeText={(v) => { setName(v); if (error) setError(null) }}
          placeholder={t('your_name')}
          maxLength={MAX_NAME}
          autoCapitalize="words"
          returnKeyType="done"
          error={error}
          accessibilityLabel={t('full_name')}
          style={{ marginTop: 8 }}
        />
      </FadeIn>

      <FadeIn index={1}>
        <ListGroup>
          <ListRow
            icon="calendar" tone="info"
            title={t('date_of_birth')}
            value={dob ? formatDate(dob, 'MMM D, YYYY', language) : t('pf_not_set')}
            subtitle={age != null ? t('pf_age_years', { n: age }) : null}
            onPress={pickDob}
          />
        </ListGroup>
        {dob ? (
          <Button title={t('pf_remove_dob')} variant="ghost" size="sm" onPress={() => setDob('')} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
        ) : null}
      </FadeIn>

      <FadeIn index={2}>
        <SectionTitle>{t('health_condition')}</SectionTitle>
        <View style={styles.chips}>
          {Object.entries(CONDITION_KEYS).map(([id, key]) => (
            <Chip key={id} label={t(key)} selected={condition === id} onPress={() => setCondition(id)} />
          ))}
        </View>
        <AppText variant="small" muted style={{ marginTop: 8, fontWeight: '500' }}>{t('pf_condition_hint')}</AppText>
      </FadeIn>

      <FadeIn index={3}>
        <Button title={t('save')} onPress={save} loading={saving} style={{ marginTop: 28 }} />
      </FadeIn>
      {picker.element}
    </Screen>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
