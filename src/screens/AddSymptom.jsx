import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import dayjs from 'dayjs'
import { useTheme } from '../context/ThemeContext'
import { SYMPTOM_CATEGORIES } from '../utils/symptomCategories'
import { loadData } from '../utils/storage'

const AddSymptom = ({ todayLog, saveLog, navigation }) => {
  const { colors } = useTheme()
  const [selected, setSelected] = useState(todayLog?.symptomsDetailed || [])
  const [recentSymptoms, setRecentSymptoms] = useState([])

  useEffect(() => {
    const loadRecent = async () => {
      const logs = await loadData('daily_logs', {})
      const allSymptoms = []
      Object.values(logs)
        .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
        .slice(0, 7)
        .forEach(log => {
          (log.symptomsDetailed || []).forEach(s => {
            if (!allSymptoms.includes(s)) allSymptoms.push(s)
          })
        })
      setRecentSymptoms(allSymptoms.slice(0, 6))
    }
    loadRecent()
  }, [])

  const toggleSymptom = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (saveLog) {
      await saveLog(dayjs().format('YYYY-MM-DD'), {
        ...todayLog,
        symptomsDetailed: selected,
      })
    }
    navigation.goBack()
  }

  const allItems = SYMPTOM_CATEGORIES.flatMap(c => c.items)
  const findItem = (id) => allItems.find(item => item.id === id)

  const styles = makeStyles(colors)

  const SymptomCell = ({ item }) => {
    const isSelected = selected.includes(item.id)
    return (
      <TouchableOpacity
        style={styles.cell}
        onPress={() => toggleSymptom(item.id)}
      >
        <View style={[
          styles.iconCircle,
          {
            backgroundColor: '#FCEFD9',
            borderColor: isSelected ? '#F97316' : 'transparent',
            borderWidth: isSelected ? 2.5 : 0,
          },
        ]}>
          <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
          {isSelected && (
            <View style={styles.starBadge}>
              <Text style={{ fontSize: 11 }}>⭐</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cellLabel, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.label}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 22, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Add Symptom
        </Text>
        <Text style={{ fontSize: 18 }}>✏️</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

        {/* Recently added */}
        {recentSymptoms.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.white }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent</Text>
            <View style={styles.grid}>
              {recentSymptoms.map(id => {
                const item = findItem(id)
                if (!item) return null
                return <SymptomCell key={id} item={item} />
              })}
            </View>
          </View>
        )}

        {/* Categories — all expanded */}
        {SYMPTOM_CATEGORIES.map(category => (
          <View key={category.id} style={[styles.card, { backgroundColor: colors.white }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {category.label}
            </Text>
            <View style={styles.grid}>
              {category.items.map(item => (
                <SymptomCell key={item.id} item={item} />
              ))}
            </View>
          </View>
        ))}

      </ScrollView>

      {/* Sticky save button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.pink }]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

    </View>
  )
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  card: { borderRadius: 20, padding: 18, marginBottom: 14 },
  cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  cell: { width: 72, alignItems: 'center', gap: 6 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  starBadge: {
    position: 'absolute',
    bottom: -2,
    alignSelf: 'center',
  },
  cellLabel: { fontSize: 12, textAlign: 'center', lineHeight: 15 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
})

export default AddSymptom