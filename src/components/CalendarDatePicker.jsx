import { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'

// A sleek, on-brand calendar picker used in place of the platform-native
// DateTimePicker. Tap a day to highlight it, then Confirm.
const CalendarDatePicker = ({
  visible,
  value,          // 'YYYY-MM-DD' or ''
  onSelect,       // (dateString: 'YYYY-MM-DD') => void
  onClose,
  maximumDate,    // Date | undefined — days after this are disabled
}) => {
  const { colors } = useTheme()
  const { t } = useLanguage()
  const styles = makeStyles(colors)

  const initial = value ? dayjs(value) : dayjs()
  const [viewMonth, setViewMonth] = useState(initial.startOf('month'))
  const [picked, setPicked] = useState(value ? dayjs(value) : null)

  // Re-sync when the sheet is (re)opened with a possibly-changed value.
  useEffect(() => {
    if (visible) {
      const base = value ? dayjs(value) : dayjs()
      setViewMonth(base.startOf('month'))
      setPicked(value ? dayjs(value) : null)
    }
  }, [visible, value])

  const maxDay = maximumDate ? dayjs(maximumDate).endOf('day') : null
  const today = dayjs()

  const startDayOfWeek = viewMonth.day()
  const daysInMonth = viewMonth.daysInMonth()

  const weekDays = [
    t('weekday_short_sun'), t('weekday_short_mon'), t('weekday_short_tue'),
    t('weekday_short_wed'), t('weekday_short_thu'), t('weekday_short_fri'),
    t('weekday_short_sat'),
  ]

  const canGoNext = maxDay
    ? viewMonth.endOf('month').isBefore(maxDay)
    : true

  const handleConfirm = () => {
    if (picked) onSelect(picked.format('YYYY-MM-DD'))
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Selected-date header */}
              <Text style={styles.headerLabel}>{t('selected_date') || 'Selected'}</Text>
              <Text style={styles.headerDate}>
                {picked ? picked.format('ddd, MMMM D, YYYY') : t('tap_select_date') || 'Tap a day below'}
              </Text>

              {/* Month navigator */}
              <View style={styles.monthNav}>
                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => setViewMonth(m => m.subtract(1, 'month'))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.navArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthName}>{viewMonth.format('MMMM YYYY')}</Text>
                <TouchableOpacity
                  style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
                  disabled={!canGoNext}
                  onPress={() => setViewMonth(m => m.add(1, 'month'))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.navArrow, !canGoNext && styles.navArrowDisabled]}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Weekday labels */}
              <View style={styles.weekRow}>
                {weekDays.map((d, i) => (
                  <Text key={i} style={styles.weekLabel}>{d}</Text>
                ))}
              </View>

              {/* Day grid */}
              <View style={styles.grid}>
                {[...Array(startDayOfWeek)].map((_, i) => (
                  <View key={`empty-${i}`} style={styles.cell} />
                ))}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1
                  const date = viewMonth.date(day)
                  const isSelected = picked && date.isSame(picked, 'day')
                  const isToday = date.isSame(today, 'day')
                  const isDisabled = maxDay ? date.isAfter(maxDay, 'day') : false

                  return (
                    <TouchableOpacity
                      key={day}
                      style={styles.cell}
                      activeOpacity={0.7}
                      disabled={isDisabled}
                      onPress={() => setPicked(date)}
                    >
                      <View
                        style={[
                          styles.dayInner,
                          isSelected && styles.dayInnerSelected,
                          !isSelected && isToday && styles.dayInnerToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNum,
                            isSelected && styles.dayNumSelected,
                            isDisabled && styles.dayNumDisabled,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Today shortcut */}
              <TouchableOpacity
                style={styles.todayBtn}
                onPress={() => {
                  setViewMonth(today.startOf('month'))
                  setPicked(today)
                }}
              >
                <Text style={styles.todayBtnText}>{t('today') || 'Today'}</Text>
              </TouchableOpacity>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>{t('cancel') || 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, !picked && styles.confirmBtnDisabled]}
                  disabled={!picked}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmText}>{t('confirm') || 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  headerDate: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.pink,
    marginTop: 4,
    marginBottom: 16,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.pinkLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navArrow: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.pinkDark,
  },
  navArrowDisabled: {
    color: colors.textSecondary,
  },
  monthName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayInner: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerSelected: {
    backgroundColor: colors.pink,
  },
  dayInnerToday: {
    borderWidth: 1.5,
    borderColor: colors.pinkMid,
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dayNumSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayNumDisabled: {
    color: colors.textSecondary,
    opacity: 0.35,
  },
  todayBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.pink,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.pink,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})

export default CalendarDatePicker
