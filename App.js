import 'react-native-gesture-handler'
import { useEffect } from 'react'
import { NavigationContainer, createNavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { View } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'

import { ThemeProvider, useTheme } from './src/context/ThemeContext'
import { LanguageProvider, useLanguage } from './src/context/LanguageContext'
import { AppDataProvider, useApp } from './src/context/AppDataContext'
import ErrorBoundary, { withBoundary } from './src/components/ErrorBoundary'
import AnimatedSplash from './src/components/AnimatedSplash'
import TabBar from './src/components/TabBar'
import RatingHost from './src/components/RatingSheet'
import { AdsProvider, maybeShowInterstitial } from './src/ads'
import { applySystemBars } from './src/utils/systemBars'

import OnboardingScreen from './src/screens/onboarding/OnboardingScreen'
import HomeScreen from './src/screens/home/HomeScreen'
import CalendarScreen from './src/screens/calendar/CalendarScreen'
import EditPeriodScreen from './src/screens/calendar/EditPeriodScreen'
import TrackScreen from './src/screens/track/TrackScreen'
import SymptomPickerScreen from './src/screens/track/SymptomPickerScreen'
import CycleHistoryScreen from './src/screens/track/CycleHistoryScreen'
import ProfileScreen from './src/screens/profile/ProfileScreen'
import EditProfileScreen from './src/screens/profile/EditProfileScreen'
import CycleSettingsScreen from './src/screens/profile/CycleSettingsScreen'
import GoalScreen from './src/screens/profile/GoalScreen'
import PregnancyScreen from './src/screens/profile/PregnancyScreen'
import RemindersScreen from './src/screens/profile/RemindersScreen'
import AppearanceScreen from './src/screens/profile/AppearanceScreen'
import LanguageScreen from './src/screens/profile/LanguageScreen'
import BackupScreen from './src/screens/profile/BackupScreen'
import PrivacyScreen from './src/screens/profile/PrivacyScreen'
import Articles from './src/screens/Articles'
import Medications from './src/screens/Medications'
import NotificationHistory from './src/screens/NotificationHistory'

SplashScreen.preventAutoHideAsync().catch(() => {})

const navigationRef = createNavigationContainerRef()
const Root = createStackNavigator()
const Tab = createBottomTabNavigator()
const HomeStack = createStackNavigator()
const CalendarStack = createStackNavigator()
const TrackStack = createStackNavigator()
const ProfileStack = createStackNavigator()

// Every screen gets its own error boundary, so a bug in one screen shows a
// "Try again" card there instead of taking the whole app down.
const S = {
  Onboarding: withBoundary(OnboardingScreen, 'Onboarding'),
  Home: withBoundary(HomeScreen, 'Home'),
  Calendar: withBoundary(CalendarScreen, 'Calendar'),
  EditPeriod: withBoundary(EditPeriodScreen, 'EditPeriod'),
  Track: withBoundary(TrackScreen, 'Track'),
  SymptomPicker: withBoundary(SymptomPickerScreen, 'SymptomPicker'),
  CycleHistory: withBoundary(CycleHistoryScreen, 'CycleHistory'),
  Profile: withBoundary(ProfileScreen, 'Profile'),
  EditProfile: withBoundary(EditProfileScreen, 'EditProfile'),
  CycleSettings: withBoundary(CycleSettingsScreen, 'CycleSettings'),
  Goal: withBoundary(GoalScreen, 'Goal'),
  Pregnancy: withBoundary(PregnancyScreen, 'Pregnancy'),
  Reminders: withBoundary(RemindersScreen, 'Reminders'),
  Appearance: withBoundary(AppearanceScreen, 'Appearance'),
  Language: withBoundary(LanguageScreen, 'Language'),
  Backup: withBoundary(BackupScreen, 'Backup'),
  Privacy: withBoundary(PrivacyScreen, 'Privacy'),
  Articles: withBoundary(Articles, 'Articles'),
  Medications: withBoundary(Medications, 'Medications'),
  NotificationHistory: withBoundary(NotificationHistory, 'NotificationHistory'),
}

const stackOptions = {
  headerShown: false,
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  gestureEnabled: true,
}

const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={stackOptions}>
    <HomeStack.Screen name="Home" component={S.Home} />
    <HomeStack.Screen name="Articles" component={S.Articles} />
  </HomeStack.Navigator>
)

const CalendarStackNavigator = () => (
  <CalendarStack.Navigator screenOptions={stackOptions}>
    <CalendarStack.Screen name="Calendar" component={S.Calendar} />
    <CalendarStack.Screen
      name="EditPeriod"
      component={S.EditPeriod}
      options={{ cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS }}
    />
  </CalendarStack.Navigator>
)

const TrackStackNavigator = () => (
  <TrackStack.Navigator screenOptions={stackOptions}>
    <TrackStack.Screen name="Track" component={S.Track} />
    <TrackStack.Screen name="SymptomPicker" component={S.SymptomPicker} />
    <TrackStack.Screen name="CycleHistory" component={S.CycleHistory} />
    <TrackStack.Screen name="Articles" component={S.Articles} />
  </TrackStack.Navigator>
)

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={stackOptions}>
    <ProfileStack.Screen name="Profile" component={S.Profile} />
    <ProfileStack.Screen name="EditProfile" component={S.EditProfile} />
    <ProfileStack.Screen name="CycleSettings" component={S.CycleSettings} />
    <ProfileStack.Screen name="Goal" component={S.Goal} />
    <ProfileStack.Screen name="Pregnancy" component={S.Pregnancy} />
    <ProfileStack.Screen name="Reminders" component={S.Reminders} />
    <ProfileStack.Screen name="Appearance" component={S.Appearance} />
    <ProfileStack.Screen name="Language" component={S.Language} />
    <ProfileStack.Screen name="Backup" component={S.Backup} />
    <ProfileStack.Screen name="Privacy" component={S.Privacy} />
    <ProfileStack.Screen name="Medications" component={S.Medications} />
    <ProfileStack.Screen name="NotificationHistory" component={S.NotificationHistory} />
    <ProfileStack.Screen name="Articles" component={S.Articles} />
  </ProfileStack.Navigator>
)

const MainTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <TabBar {...props} />}
    screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true }}
    screenListeners={{
      // Aggressive: attempt an interstitial on tab switches. The manager's
      // frequency cap (every Nth action + time cooldown) throttles it so
      // it stays policy-safe.
      tabPress: () => { maybeShowInterstitial() },
    }}
  >
    <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
    <Tab.Screen name="CalendarTab" component={CalendarStackNavigator} />
    <Tab.Screen name="TrackTab" component={TrackStackNavigator} />
    <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} />
  </Tab.Navigator>
)

// Notification taps carry { screen } in their data payload.
const routeForNotification = (screen) => {
  switch (screen) {
    case 'Medications': return ['Main', { screen: 'ProfileTab', params: { screen: 'Medications', initial: false } }]
    case 'Calendar': return ['Main', { screen: 'CalendarTab' }]
    case 'Log':
    case 'Track': return ['Main', { screen: 'TrackTab', params: { screen: 'Track', params: { view: 'log' } } }]
    case 'Notifications': return ['Main', { screen: 'ProfileTab', params: { screen: 'NotificationHistory', initial: false } }]
    default: return ['Main', { screen: 'HomeTab' }]
  }
}

const AppContent = () => {
  const appData = useApp()
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const { loading: langLoading } = useLanguage()

  const navigateFromNotificationData = (data) => {
    if (!data) return
    const tryNavigate = (attemptsLeft) => {
      if (!navigationRef.isReady()) {
        if (attemptsLeft > 0) setTimeout(() => tryNavigate(attemptsLeft - 1), 300)
        return
      }
      try {
        const [name, params] = routeForNotification(data.screen)
        navigationRef.navigate(name, params)
      } catch (err) {
        console.warn('Notification navigation failed', err)
      }
    }
    tryNavigate(10)
  }

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response?.notification) navigateFromNotificationData(response.notification.request.content.data)
      })
      .catch(() => {})
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotificationData(response?.notification?.request?.content?.data)
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {})
  }, [])

  useEffect(() => {
    applySystemBars({ isDark, background: colors.bg })
  }, [isDark, colors.bg])

  if (appData.loading || langLoading) {
    return <AnimatedSplash />
  }

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.bg,
      card: colors.surface,
      primary: colors.primary,
      text: colors.text,
      border: colors.border,
    },
  }

  return (
    <AdsProvider suppressAppOpen={!appData.isOnboarded}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            {!appData.isOnboarded ? (
              <Root.Screen name="Onboarding" component={S.Onboarding} />
            ) : (
              <Root.Screen name="Main" component={MainTabs} />
            )}
          </Root.Navigator>
        </NavigationContainer>
        <RatingHost />
      </View>
    </AdsProvider>
  )
}

const ThemedBoundary = ({ children }) => {
  const { isDark } = useTheme()
  return <ErrorBoundary scope="root" dark={isDark}>{children}</ErrorBoundary>
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary scope="providers">
        <ThemeProvider>
          <ThemedBoundary>
            <LanguageProvider>
              <AppDataProvider>
                <AppContent />
              </AppDataProvider>
            </LanguageProvider>
          </ThemedBoundary>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  )
}
