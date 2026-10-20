import { useEffect, useMemo, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { AppText, Button, Chip, Icon, Sheet } from '../../components/ui'
import { formatDate } from '../../utils/dates'
import { addDays, diffDays, isValidDateStr } from '../../utils/cycleEngine'

const MAX_CHOICES = 15

/**
 * "When did your period end?" — confirms an early end before anything is
 * changed. The user picks the last bleeding day (period start … today);
 * onSave(date) is only called from the Save button.
 */
export default function EndPeriodSheet({ visible, onClose, onSave, start, expectedEnd, today, saving }) {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const [picked, setPicked] = useState(today)

  useEffect(() => { if (visible) setPicked(today) }, [visible, today])

  // Newest first: Today, Yesterday, then dates back to the period start.
  const choices = useMemo(() => {
    if (!isValidDateStr(start) || !isValidDateStr(today) || start > today) return [today]
    const out = []
    for (let d = today; d >= start && out.length < MAX_CHOICES; d = addDays(d, -1)) out.push(d)
    return out
  }, [start, today])

  const label = (d) => (d === today ? t('today')
    : d === addDays(today, -1) ? t('yesterday')
      : formatDate(d, 'ddd, MMM D', language))

  const hasExpected = isValidDateStr(start) && isValidDateStr(expectedEnd) && expectedEnd >= start

  return (
    <Sheet visible={visible} onClose={onClose} title={t('home_end_title')}>
      {hasExpected ? (
        <AppText variant="caption" muted>
          {t('home_end_expected', {
            start: formatDate(start, 'MMM D', language),
            end: formatDate(expectedEnd, 'MMM D', language),
            n: diffDays(start, expectedEnd) + 1,
          })}
        </AppText>
      ) : null}

      <View style={styles.chips}>
        {choices.map((d) => (
          <Chip key={d} label={label(d)} tone="period" selected={d === picked} onPress={() => setPicked(d)} />
        ))}
      </View>

      <View style={[styles.note, { backgroundColor: colors.surfaceAlt }]}>
        <Icon name="info" size={16} color={colors.textMuted} />
        <AppText variant="small" muted style={{ flex: 1, fontWeight: '500' }}>{t('home_end_explain')}</AppText>
      </View>

      <View style={styles.actions}>
        <Button title={t('home_still_bleeding')} variant="secondary" size="md" onPress={onClose} style={{ flex: 1 }} />
        <Button title={t('save')} icon="check" size="md" onPress={() => onSave(picked)} loading={saving} style={{ flex: 1 }} />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 12, marginTop: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
})
