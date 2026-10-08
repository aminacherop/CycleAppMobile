import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { View, TextInput, SectionList, StyleSheet } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import { AppText, Chip, EmptyState, IconButton, ScreenHeader, SectionTitle, Tap } from '../../components/ui'
import { RADIUS } from '../../theme/palette'
import { formatDate } from '../../utils/dates'
import { SYMPTOM_CATEGORIES } from '../../utils/symptomCategories'
import { MAX_W, SavedIndicator, SearchIcon, useGutter } from './parts'
import { asList, sanitizeDate, toggleInList, tp } from './trackUtils'

const ChipGroup = memo(({ items, selected, onToggle }) => (
  <View style={styles.chips}>
    {items.map((it) => (
      <Chip key={it.id} label={it.label} tone="warning" selected={selected.includes(it.id)} onPress={() => onToggle(it.id)} />
    ))}
  </View>
))

export default function SymptomPickerScreen({ navigation, route }) {
  const app = useApp()
  const { t, language } = useLanguage()
  const { colors } = useTheme()
  const gutter = useGutter()
  const date = sanitizeDate(route?.params?.date, app.today)
  const [query, setQuery] = useState('')
  const [savedTick, setSavedTick] = useState(0)

  const raw = app.dailyLogs?.[date]
  const selected = asList(raw && typeof raw === 'object' ? raw.symptomsDetailed : null)
  const latest = useRef(selected)
  latest.current = selected

  const saveLog = app.saveLog
  const onToggle = useCallback((id) => {
    const next = toggleInList(latest.current, id)
    latest.current = next
    Promise.resolve(saveLog(date, { symptomsDetailed: next }))
      .then(() => setSavedTick((x) => x + 1))
      .catch((e) => console.warn('SymptomPicker: save failed', e))
  }, [date, saveLog])

  // Translated categories; search matches item or category label.
  const translated = useMemo(() => SYMPTOM_CATEGORIES.map((c) => ({
    id: c.id,
    title: t(c.labelKey),
    items: (c.items || []).map((i) => ({ id: i.id, label: t(i.labelKey) })),
  })), [t])

  const sections = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    return translated
      .map((c) => {
        const items = !q || c.title.toLocaleLowerCase().includes(q)
          ? c.items
          : c.items.filter((i) => i.label.toLocaleLowerCase().includes(q))
        return { key: c.id, title: c.title, data: items.length ? [items] : [] }
      })
      .filter((s) => s.data.length)
  }, [translated, query])

  const goBack = useCallback(() => {
    if (navigation?.canGoBack?.()) navigation.goBack()
    else navigation?.navigate?.('Track')
  }, [navigation])

  const wrap = { paddingHorizontal: gutter, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }
  const count = selected.length

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={wrap}>
        <ScreenHeader
          title={t('symptoms')}
          subtitle={`${formatDate(date, 'ddd, MMM D', language)} · ${tp(t, 'trk_selected', count)}`}
          onBack={goBack}
          right={(
            <View style={styles.headRight}>
              <SavedIndicator tick={savedTick} label={t('trk_saved')} />
              <Tap onPress={goBack} haptic accessibilityLabel={t('done')} style={[styles.done, { backgroundColor: colors.primary }]}>
                <AppText variant="caption" color={colors.onPrimary} style={{ fontWeight: '700' }}>{t('done')}</AppText>
              </Tap>
            </View>
          )}
        />
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SearchIcon size={18} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('trk_search_symptoms')}
            placeholderTextColor={colors.textFaint}
            accessibilityLabel={t('trk_search_symptoms')}
            maxFontSizeMultiplier={1.35}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.text }]}
          />
          {query ? (
            <IconButton name="close" size={32} onPress={() => setQuery('')} accessibilityLabel={t('trk_clear')} />
          ) : null}
        </View>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(_, i) => String(i)}
        renderSectionHeader={({ section }) => <SectionTitle style={{ marginTop: 16 }}>{section.title}</SectionTitle>}
        renderItem={({ item }) => <ChipGroup items={item} selected={selected} onToggle={onToggle} />}
        contentContainerStyle={[wrap, { paddingBottom: 40 }]}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        ListEmptyComponent={<EmptyState icon="bolt" tone="warning" title={t('trk_no_symptoms_found')} />}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  done: { paddingHorizontal: 16, minHeight: 40, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 12, minHeight: 48 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
})
