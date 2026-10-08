import { memo, useMemo, useState } from 'react'
import { View, StyleSheet, I18nManager, Pressable } from 'react-native'
import dayjs from 'dayjs'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { AppText, Icon, Tap } from '../../components/ui'
import { formatDate, weekdayInitials } from '../../utils/dates'
import { tapHaptic } from '../../utils/haptics'
import { RADIUS } from '../../theme/palette'

const MAX_BACK_MONTHS = 12

// Small single-date month calendar: past/today selectable, future disabled,
// pages back up to 12 months. `width` is the available width for the grid.
const MonthCalendar = ({ value, onChange, today, width, compact }) => {
  const { colors } = useTheme()
  const { t, language } = useLanguage()
  const todayD = useMemo(() => dayjs(today).startOf('day'), [today])
  const [offset, setOffset] = useState(0) // 0 = current month, -12 = oldest

  const month = todayD.startOf('month').add(offset, 'month')
  const cell = Math.max(32, Math.floor(width / 7))
  const cellH = Math.min(cell, compact ? 40 : 46)
  const dot = Math.min(cell - 6, cellH - 4, 42)
  const weekdays = useMemo(() => weekdayInitials(language), [language])
  const minDay = todayD.startOf('month').subtract(MAX_BACK_MONTHS, 'month')

  const weeks = useMemo(() => {
    const lead = month.day() // Sunday-first
    const count = month.daysInMonth()
    const cells = []
    for (let i = 0; i < lead; i++) cells.push(null)
    for (let d = 1; d <= count; d++) cells.push(month.date(d))
    while (cells.length % 7) cells.push(null)
    const rows = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [month.format('YYYY-MM')])

  const canPrev = offset > -MAX_BACK_MONTHS
  const canNext = offset < 0
  const flip = I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : null

  const NavBtn = ({ dir, enabled, label }) => (
    <Tap
      onPress={() => { if (enabled) setOffset((o) => o + dir) }}
      disabled={!enabled}
      haptic
      hitSlop={6}
      accessibilityLabel={label}
      style={[styles.nav, { backgroundColor: colors.surfaceAlt }]}
    >
      <Icon name={dir < 0 ? 'chevron-left' : 'chevron-right'} size={20} color={colors.text} style={flip} />
    </Tap>
  )

  return (
    <View>
      <View style={styles.head}>
        <NavBtn dir={-1} enabled={canPrev} label={t('ob_prev_month')} />
        <AppText variant="heading" center style={{ flex: 1, textTransform: 'capitalize' }} numberOfLines={1}>
          {formatDate(month, 'MMMM YYYY', language)}
        </AppText>
        <NavBtn dir={1} enabled={canNext} label={t('ob_next_month')} />
      </View>
      <View style={styles.row}>
        {weekdays.map((w, i) => (
          <View key={i} style={{ width: cell, alignItems: 'center', paddingVertical: 6 }}>
            <AppText variant="small" faint numberOfLines={1}>{w}</AppText>
          </View>
        ))}
      </View>
      {weeks.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((d, ci) => {
            if (!d) return <View key={ci} style={{ width: cell, height: cellH }} />
            const iso = d.format('YYYY-MM-DD')
            const future = d.isAfter(todayD, 'day')
            const tooOld = d.isBefore(minDay, 'day')
            const disabled = future || tooOld
            const selected = iso === value
            const isToday = d.isSame(todayD, 'day')
            return (
              <Pressable
                key={ci}
                disabled={disabled}
                onPress={() => { tapHaptic(); onChange?.(iso) }}
                accessibilityRole="button"
                accessibilityLabel={formatDate(d, 'dddd, MMMM D', language)}
                accessibilityState={{ selected, disabled }}
                style={{ width: cell, height: cellH, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: dot, height: dot, borderRadius: dot / 2, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: selected ? colors.primary : 'transparent',
                    borderWidth: isToday && !selected ? 1.5 : 0,
                    borderColor: colors.primary,
                  }}
                >
                  <AppText
                    variant="body"
                    color={selected ? colors.onPrimary : disabled ? colors.textFaint : colors.text}
                    style={{ fontWeight: selected || isToday ? '800' : '600', opacity: disabled ? 0.5 : 1 }}
                  >
                    {d.date()}
                  </AppText>
                </View>
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  nav: { width: 40, height: 40, borderRadius: RADIUS.sm + 2, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center' },
})

export default memo(MonthCalendar)
