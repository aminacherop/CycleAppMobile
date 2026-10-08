import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, View, StyleSheet } from 'react-native'
import Animated, { ZoomIn } from 'react-native-reanimated'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { useApp } from '../context/AppDataContext'
import { AppText, Button, IconBadge, Sheet, isAnySheetOpen } from './ui'
import Icon from './ui/Icon'
import { isResumeFromAd } from '../ads/adCoordinator'
import { successHaptic } from '../utils/haptics'
import {
  recordVisit, shouldShowRating, markShown, markDismissed, markRated, openReview, onHappyMoment,
} from '../utils/ratingPrompt'

// "Enjoying My Cycle?" bottom sheet (design A). Mounted once in App.js.
// Shows a moment after a happy action, only when the rules in
// utils/ratingPrompt.js allow it and nothing else is on screen.

const STAR_COLOR = '#F5B301'
const SHOW_DELAY_MS = 1200
const WAIT_STEP_MS = 1000
const MAX_WAIT_MS = 20000

const Stars = () => (
  <View style={styles.stars} accessible={false} importantForAccessibility="no-hide-descendants">
    {[0, 1, 2, 3, 4].map((i) => (
      <Animated.View key={i} entering={ZoomIn.springify().damping(12).delay(250 + i * 80)}>
        <Icon name="star-fill" size={30} color={STAR_COLOR} />
      </Animated.View>
    ))}
  </View>
)

export default function RatingHost() {
  const { t } = useLanguage()
  const { colors } = useTheme()
  const app = useApp()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const timer = useRef(null)
  const onboarded = !!app?.isOnboarded

  // Count visits: this cold start, and returns after a while away.
  useEffect(() => {
    if (!onboarded) return
    recordVisit()
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') recordVisit() })
    return () => sub.remove()
  }, [onboarded])

  const tryShow = useCallback(async (waited = 0) => {
    if (!pending.current || visible) return
    // Wait while another sheet or a full-screen ad is on screen.
    if (isAnySheetOpen() || isResumeFromAd(4000) || AppState.currentState !== 'active') {
      if (waited < MAX_WAIT_MS) timer.current = setTimeout(() => tryShow(waited + WAIT_STEP_MS), WAIT_STEP_MS)
      else pending.current = false
      return
    }
    pending.current = false
    if (!(await shouldShowRating())) return
    await markShown()
    setVisible(true)
  }, [visible])

  useEffect(() => {
    if (!onboarded) return
    const off = onHappyMoment(() => {
      if (pending.current) return
      pending.current = true
      clearTimeout(timer.current)
      timer.current = setTimeout(() => tryShow(0), SHOW_DELAY_MS)
    })
    return () => { off(); clearTimeout(timer.current) }
  }, [onboarded, tryShow])

  const later = async () => {
    setVisible(false)
    await markDismissed()
  }

  const rate = async () => {
    if (busy) return
    setBusy(true)
    successHaptic()
    await markRated()
    setVisible(false)
    // Let the sheet slide away before Google's sheet / the store opens.
    setTimeout(() => { openReview().finally(() => setBusy(false)) }, 300)
  }

  if (!onboarded) return null
  return (
    <Sheet visible={visible} onClose={later}>
      <View style={styles.body}>
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <IconBadge name="heart-fill" tone="primary" size={76} iconSize={40} />
        </Animated.View>
        <AppText variant="title" center style={{ marginTop: 14 }}>{t('rate_title')}</AppText>
        <AppText variant="body" muted center style={{ marginTop: 6, maxWidth: 360 }}>{t('rate_body')}</AppText>
        <Stars />
        <Button title={t('rate_cta')} icon="heart" onPress={rate} loading={busy} style={{ alignSelf: 'stretch' }} />
        <Button title={t('rate_later')} variant="ghost" size="md" onPress={later} haptic={false} style={{ alignSelf: 'stretch', marginTop: 4 }} />
        <View style={{ height: 4, backgroundColor: colors.surface }} />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', paddingTop: 6, paddingBottom: 4 },
  stars: { flexDirection: 'row', gap: 8, marginVertical: 18 },
})
