import { useCallback, useMemo } from 'react'
import { View, FlatList } from 'react-native'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { useApp } from '../../context/AppDataContext'
import { AppText, Card, EmptyState, FadeIn, ScreenHeader } from '../../components/ui'
import { CycleRow } from './InsightsView'
import { MAX_W, useGutter } from './parts'
import { tp } from './trackUtils'

export default function CycleHistoryScreen({ navigation }) {
  const app = useApp()
  const { t, language } = useLanguage()
  const { colors } = useTheme()
  const gutter = useGutter()

  const cycles = useMemo(() => {
    const list = Array.isArray(app.cycleHistory?.completed) ? app.cycleHistory.completed : []
    return list.filter((c) => c && c.start && Number(c.cycleLength) > 0).slice().reverse()
  }, [app.cycleHistory])
  const maxLen = useMemo(() => Math.max(1, ...cycles.map((c) => c.cycleLength || 0)), [cycles])

  const goBack = useCallback(() => {
    if (navigation?.canGoBack?.()) navigation.goBack()
    else navigation?.navigate?.('Track')
  }, [navigation])

  const wrap = { paddingHorizontal: gutter, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={wrap}>
        <ScreenHeader
          title={t('trk_cycle_history')}
          subtitle={cycles.length ? tp(t, 'trk_cycles_count', cycles.length) : undefined}
          onBack={goBack}
        />
      </View>
      <FlatList
        data={cycles}
        keyExtractor={(c) => c.start}
        contentContainerStyle={[wrap, { paddingTop: 4, paddingBottom: 32, gap: 10 }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        renderItem={({ item, index }) => (
          <FadeIn index={index}>
            <Card>
              <CycleRow cycle={item} maxLength={maxLen} language={language} t={t} />
            </Card>
          </FadeIn>
        )}
        ListHeaderComponent={cycles.length ? (
          <AppText variant="caption" muted style={{ marginBottom: 4 }}>{t('trk_history_hint')}</AppText>
        ) : null}
        ListEmptyComponent={(
          <Card>
            <EmptyState icon="history" title={t('trk_history_empty_title')} body={t('trk_history_empty_body')} />
          </Card>
        )}
      />
    </View>
  )
}
