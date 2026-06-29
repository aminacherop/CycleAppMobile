import { useState, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { saveData } from '../utils/storage'

const ITEM_HEIGHT = 44
const VISIBLE_ROWS = 5
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const GestationDatePicker = ({ route, navigation }) => {
  const { colors } = useTheme()
  const initialDate = route?.params?.gestationStart
    ? dayjs(route.params.gestationStart)
    : dayjs()

  const currentYear = dayjs().year()
  const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i)

  const [selMonthIdx, setSelMonthIdx] = useState(initialDate.month())
  const [selDay, setSelDay] = useState(initialDate.date())
  const [selYear, setSelYear] = useState(initialDate.year())

  const monthScrollRef = useRef(null)
  const dayScrollRef = useRef(null)
  const yearScrollRef = useRef(null)

  const daysInSelectedMonth = dayjs(`${selYear}-${selMonthIdx + 1}-01`).daysInMonth()
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1)

  const selectedDate = dayjs(`${selYear}-${selMonthIdx + 1}-${Math.min(selDay, daysInSelectedMonth)}`)
  const today = dayjs()
  const diffDays = today.diff(selectedDate, 'day')
  const relativeLabel = diffDays === 0
    ? 'Today'
    : diffDays > 0
      ? `${diffDays} day${diffDays !== 1 ? 's' : ''} ago, ${selectedDate.format('dddd')}`
      : `In ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}, ${selectedDate.format('dddd')}`

  const handleScrollEnd = (e, setter, list) => {
    const y = e.nativeEvent.contentOffset.y
    const index = Math.round(y / ITEM_HEIGHT)
    const clamped = Math.max(0, Math.min(list.length - 1, index))
    setter(typeof list[clamped] === 'number' ? list[clamped] : clamped)
  }

  const handleSave = async () => {
    await saveData('gestation_start', selectedDate.format('YYYY-MM-DD'))
    navigation.goBack()
  }

  const styles = makeStyles(colors)

  const renderColumn = (items, selectedValue, scrollRef, onMomentumEnd, formatFn) => (
    <ScrollView
      ref={scrollRef}
      style={{ height: PICKER_HEIGHT, width: 90 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      contentContainerStyle={{
        paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2),
      }}
      onMomentumScrollEnd={onMomentumEnd}
    >
      {items.map((item, i) => {
        const isSelected = formatFn ? formatFn(item) === formatFn(selectedValue) : item === selectedValue
        return (
          <View key={i} style={{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{
              fontSize: 18,
              fontWeight: isSelected ? '700' : '400',
              color: isSelected ? colors.textPrimary : colors.border,
            }}>
              {formatFn ? formatFn(item) : item}
            </Text>
          </View>
        )
      })}
    </ScrollView>
  )

  return (
    <View style={styles.overlay}>
    <View style={[styles.container, { backgroundColor: colors.white }]}>

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Estimated start of gestation
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 20, color: colors.textPrimary }}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.pickerWrap, { height: PICKER_HEIGHT }]}>
        {/* Selection highlight band */}
        <View style={[
          styles.highlightBand,
          { backgroundColor: colors.pinkLight, top: ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2) },
        ]} />

        <View style={styles.columnsRow}>
          {/* Month column */}
          {renderColumn(
            MONTHS.map((_, i) => i),
            selMonthIdx,
            monthScrollRef,
            (e) => handleScrollEnd(e, setSelMonthIdx, MONTHS.map((_, i) => i)),
            (idx) => MONTHS[idx]
          )}
          {/* Day column */}
          {renderColumn(
            days,
            selDay,
            dayScrollRef,
            (e) => handleScrollEnd(e, setSelDay, days),
            (d) => String(d).padStart(2, '0')
          )}
          {/* Year column */}
          {renderColumn(
            years,
            selYear,
            yearScrollRef,
            (e) => handleScrollEnd(e, setSelYear, years)
          )}
        </View>
      </View>

      <Text style={[styles.relativeLabel, { color: colors.textSecondary }]}>
        {relativeLabel}
      </Text>

      <TouchableOpacity
        style={[styles.doneBtn, { backgroundColor: colors.pink }]}
        onPress={handleSave}
      >
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>

    </View>
    </View>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  pickerWrap: { position: 'relative', marginBottom: 16 },
  highlightBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    zIndex: -1,
  },
  columnsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  relativeLabel: { textAlign: 'center', fontSize: 14, marginBottom: 20 },
  doneBtn: { paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  doneBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
})

export default GestationDatePicker