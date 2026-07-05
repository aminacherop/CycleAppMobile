import { useRef, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'

const ROW_HEIGHT = 52

// A themed bottom-sheet dropdown for picking a number from a range.
// Complements the sliders so users can tap-pick an exact value.
const NumberPickerModal = ({
  visible,
  title,
  min,
  max,
  value,
  unit = '',
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = makeStyles(colors)
  const scrollRef = useRef(null)

  const options = []
  for (let n = min; n <= max; n++) options.push(n)

  // Scroll so the current value sits near the middle when opened.
  useEffect(() => {
    if (visible && scrollRef.current) {
      const index = Math.max(0, value - min)
      const y = Math.max(0, index * ROW_HEIGHT - ROW_HEIGHT * 2)
      // defer until the list has laid out
      const id = setTimeout(() => {
        scrollRef.current?.scrollTo({ y, animated: false })
      }, 0)
      return () => clearTimeout(id)
    }
  }, [visible, value, min])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}>
              <View style={styles.handle} />
              <Text style={styles.title}>{title}</Text>
              <ScrollView
                ref={scrollRef}
                style={styles.list}
                showsVerticalScrollIndicator={false}
              >
                {options.map(n => {
                  const selected = n === value
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.row, selected && styles.rowSelected]}
                      activeOpacity={0.7}
                      onPress={() => {
                        onSelect(n)
                        onClose()
                      }}
                    >
                      <Text style={[styles.rowText, selected && styles.rowTextSelected]}>
                        {n}{unit ? ` ${unit}` : ''}
                      </Text>
                      {selected && <Text style={styles.check}>✓</Text>}
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
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
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  list: {
    marginTop: 4,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  rowSelected: {
    backgroundColor: colors.pinkLight,
  },
  rowText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rowTextSelected: {
    color: colors.pinkDark,
    fontWeight: '700',
  },
  check: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.pink,
  },
})

export default NumberPickerModal
