import { memo, useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, useWindowDimensions } from 'react-native'
import dayjs from 'dayjs'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { AppText, Button, IconButton, Sheet, Tap } from '../../components/ui'
import { formatDate, weekdayInitials } from '../../utils/dates'

// Compact month calendar in a bottom sheet. Future days are disabled.
// Period days get a tint, days with a log get a dot.
const DatePickerSheet = ({ visible, onClose, value, today, periodDays, dailyLogs, onPick }) => {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const { width } = useWindowDimensions()
  const [month, setMonth] = useState(() => dayjs(value || today).startOf('month'))

  useEffect(() => {
    if (visible) setMonth(dayjs(value || today).startOf('month'))
  }, [visible])

  const periodSet = useMemo(() => new Set(Array.isArray(periodDays) ? periodDays : []), [periodDays])
  const initials = useMemo(() => weekdayInitials(language), [language])

  const cells = useMemo(() => {
    if (!month.isValid()) return []
    const lead = month.day()
    const count = month.daysInMonth()
    const out = Array.from({ length: lead }, () => null)
    for (let i = 0; i < count; i++) out.push(month.add(i, 'day').format('YYYY-MM-DD'))
    while (out.length % 7) out.push(null)
    return out
  }, [month])

  const cell = Math.floor((Math.min(width, 520) - 36) / 7)
  const size = Math.min(44, cell - 4)
  const canNext = month.add(1, 'month').format('YYYY-MM-DD') <= today

  return (
    <Sheet visible={visible} onClose={onClose} title={t('trk_pick_date')}>
      <View style={styles.monthRow}>
        <IconButton name="chevron-left" size={40} onPress={() => setMonth((m) => m.subtract(1, 'month'))} accessibilityLabel={t('trk_prev_month')} />
        <AppText variant="subheading" center style={{ flex: 1 }}>{formatDate(month, 'MMMM YYYY', language)}</AppText>
        <View style={{ opacity: canNext ? 1 : 0.35 }} pointerEvents={canNext ? 'auto' : 'none'}>
          <IconButton name="chevron-right" size={40} onPress={() => setMonth((m) => m.add(1, 'month'))} accessibilityLabel={t('trk_next_month')} />
        </View>
      </View>
      <View style={styles.grid}>
        {initials.map((w, i) => (
          <View key={`w${i}`} style={{ width: cell, alignItems: 'center', paddingVertical: 4 }}>
            <AppText variant="small" faint>{w}</AppText>
          </View>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={`b${i}`} style={{ width: cell, height: size + 6 }} />
          const future = d > today
          const selected = d === value
          const isPeriod = periodSet.has(d)
          const logged = !!dailyLogs?.[d]
          const bg = selected ? colors.primary : isPeriod ? colors.periodSoft : 'transparent'
          const fg = selected ? colors.onPrimary : future ? colors.textFaint : isPeriod ? colors.period : colors.text
          return (
            <View key={d} style={{ width: cell, height: size + 6, alignItems: 'center', justifyContent: 'center' }}>
              <Tap
                onPress={() => onPick?.(d)}
                disabled={future}
                scaleTo={0.9}
                accessibilityLabel={formatDate(d, 'dddd, MMMM D', language)}
                accessibilityState={{ selected }}
                style={[styles.day, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
                  d === today && !selected && { borderWidth: 1.5, borderColor: colors.primary }]}
              >
                <AppText variant="caption" color={fg} style={{ fontWeight: selected ? '800' : '600' }}>{Number(d.slice(8))}</AppText>
                {logged && !selected ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
              </Tap>
            </View>
          )
        })}
      </View>
      <Button title={t('trk_go_today')} variant="soft" size="md" icon="calendar" onPress={() => onPick?.(today)} style={{ marginTop: 12 }} />
    </Sheet>
  )
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center' },
  day: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2 },
})

export default memo(DatePickerSheet)
