import 'react-native-gesture-handler'
import { useRef, useEffect } from 'react'
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'

SplashScreen.preventAutoHideAsync().catch(() => {})

const navigationRef = createNavigationContainerRef()
import { ThemeProvider, useTheme } from './src/context/ThemeContext'
import { LanguageProvider, useLanguage } from './src/context/LanguageContext'
import useAppData from './src/hooks/useAppData'
import AnimatedSplash from './src/components/AnimatedSplash'
import { AdsProvider, maybeShowInterstitial } from './src/ads'
import Onboarding from './src/screens/Onboarding'
import Dashboard from './src/screens/Dashboard'
import PeriodPicker from './src/screens/PeriodPicker'
import CycleDayDetail from './src/screens/CycleDayDetail'
import AddSymptom from './src/screens/AddSymptom'
import PregnancyIntro from './src/screens/PregnancyIntro'
import PregnancyMode from './src/screens/PregnancyMode'
import GestationDatePicker from './src/screens/GestationDatePicker'
import GoalSelector from './src/screens/GoalSelector'
import Calendar from './src/screens/Calendar'
import LogToday from './src/screens/LogToday'
import Analysis from './src/screens/Analysis'
import MyCycles from './src/screens/MyCycles'
import Timeline from './src/screens/Timeline'
import Profile from './src/screens/Profile'
import Articles from './src/screens/Articles'
import Medications from './src/screens/Medications'
import NotificationSettings from './src/screens/NotificationSettings'
import NotificationHistory from './src/screens/NotificationHistory'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()
const HomeStack = createStackNavigator()
const LogStack = createStackNavigator()
const ProfileStack = createStackNavigator()
const AnalysisStack = createStackNavigator()

const ICONS = {
  Home: '🏠',
  Calendar: '📅',
  Log: '➕',
  Analysis: '📊',
  Profile: '👤',
}

// ── Home tab gets its OWN stack so Dashboard can push detail screens ──
const HomeStackNavigator = ({ appData }) => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="DashboardMain">
      {({ navigation }) => (
        <Dashboard
          cycleSettings={appData.cycleSettings}
          setCycleSettings={appData.updateCycleSettings}
          updateCycleSettings={appData.updateCycleSettings}
          userProfile={appData.userProfile}
          todayLog={appData.getTodayLog()}
          saveLog={appData.saveLog}
          dailyLogs={appData.dailyLogs}
          navigation={navigation}
        />
      )}
    </HomeStack.Screen>
    <HomeStack.Screen name="PeriodPicker">
      {({ navigation }) => (
        <PeriodPicker
          cycleSettings={appData.cycleSettings}
          setCycleSettings={appData.updateCycleSettings}
          navigation={navigation}
        />
      )}
    </HomeStack.Screen>
    <HomeStack.Screen name="CycleDayDetail">
      {({ navigation }) => (
        <CycleDayDetail
          cycleSettings={appData.cycleSettings}
          navigation={navigation}
        />
      )}
    </HomeStack.Screen>
    <HomeStack.Screen name="AddSymptom">
      {({ navigation }) => (
        <AddSymptom
          todayLog={appData.getTodayLog()}
          saveLog={appData.saveLog}
          navigation={navigation}
        />
      )}
    </HomeStack.Screen>
    <HomeStack.Screen name="Articles">
      {({ navigation }) => <Articles navigation={navigation} />}
    </HomeStack.Screen>
    <HomeStack.Screen name="Medications">
      {({ navigation }) => <Medications navigation={navigation} />}
    </HomeStack.Screen>

    <HomeStack.Screen name="NotificationSettings">
      {({ navigation }) => (
        <NotificationSettings navigation={navigation} cycleSettings={appData.cycleSettings} />
      )}
    </HomeStack.Screen>
    <HomeStack.Screen name="Notifications">
      {({ navigation }) => (
        <NotificationHistory navigation={navigation} />
      )}
    </HomeStack.Screen>
  </HomeStack.Navigator>
)

// ── Profile tab gets its OWN stack too, for the same shortcuts ──
const ProfileStackNavigator = ({ appData }) => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileMain">
      {({ navigation }) => (
        <Profile
          cycleSettings={appData.cycleSettings}
          setCycleSettings={appData.updateCycleSettings}
          userProfile={appData.userProfile}
          setUserProfile={appData.updateProfile}
          resetAllData={appData.resetAllData}
          navigation={navigation}
        />
      )}
    </ProfileStack.Screen>
    <ProfileStack.Screen name="Articles">
      {({ navigation }) => <Articles navigation={navigation} />}
    </ProfileStack.Screen>
    <ProfileStack.Screen name="Medications">
      {({ navigation }) => <Medications navigation={navigation} />}
    </ProfileStack.Screen>

    <ProfileStack.Screen name="NotificationSettings">
      {({ navigation }) => (
        <NotificationSettings navigation={navigation} cycleSettings={appData.cycleSettings} />
      )}
    </ProfileStack.Screen>
  </ProfileStack.Navigator>
)

// ── Analysis tab gets its OWN stack for MyCycles detail screen ──
const AnalysisStackNavigator = ({ appData }) => (
  <AnalysisStack.Navigator screenOptions={{ headerShown: false }}>
    <AnalysisStack.Screen name="AnalysisMain">
      {({ navigation }) => (
        <Analysis
          cycleSettings={appData.cycleSettings}
          setCycleSettings={appData.updateCycleSettings}
          dailyLogs={appData.dailyLogs}
          installDate={appData.installDate}
          navigation={navigation}
        />
      )}
    </AnalysisStack.Screen>
    <AnalysisStack.Screen name="MyCycles">
      {({ navigation }) => (
        <MyCycles
          cycleSettings={appData.cycleSettings}
          dailyLogs={appData.dailyLogs}
          userProfile={appData.userProfile}
          installDate={appData.installDate}
          navigation={navigation}
        />
      )}
    </AnalysisStack.Screen>
    <AnalysisStack.Screen name="Timeline">
      {({ navigation }) => (
        <Timeline
          cycleSettings={appData.cycleSettings}
          dailyLogs={appData.dailyLogs}
          navigation={navigation}
        />
      )}
    </AnalysisStack.Screen>

    <AnalysisStack.Screen name="PregnancyIntro">
      {({ navigation }) => <PregnancyIntro navigation={navigation} />}
    </AnalysisStack.Screen>
    <AnalysisStack.Screen name="PregnancyMode">
      {({ navigation }) => <PregnancyMode navigation={navigation} />}
    </AnalysisStack.Screen>
    <AnalysisStack.Screen name="GestationDatePicker">
      {({ route, navigation }) => (
        <GestationDatePicker route={route} navigation={navigation} />
      )}
    </AnalysisStack.Screen>
    <AnalysisStack.Screen name="GoalSelector">
      {({ route, navigation }) => (
        <GoalSelector route={route} navigation={navigation} />
      )}
    </AnalysisStack.Screen>
  </AnalysisStack.Navigator>
)


const TabNavigator = ({ appData }) => {
  const insets = useSafeAreaInsets()
  // Reserve the real system nav-bar / home-indicator inset SEPARATELY from a
  // fixed content height, so the icon + label always get the same room on every
  // phone and can never be clipped behind the gesture/button navigation bar.
  const CONTENT_HEIGHT = 52
  const TOP_PAD = 6
  const bottomInset = Math.max(insets.bottom, 10)

  return (
  <Tab.Navigator
    screenListeners={{
      // Aggressive: attempt an interstitial on tab switches. The manager's
      // frequency cap (every Nth action + time cooldown) throttles it so
      // it stays policy-safe.
      tabPress: () => { maybeShowInterstitial() },
    }}
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: [
        styles.tabBar,
        {
          height: CONTENT_HEIGHT + TOP_PAD + bottomInset,
          paddingTop: TOP_PAD,
          paddingBottom: bottomInset,
        },
      ],
      tabBarActiveTintColor: '#C2527A',
      tabBarInactiveTintColor: '#6B7280',
      tabBarLabelStyle: styles.tabLabel,
      tabBarIconStyle: styles.tabIcon,
      tabBarAllowFontScaling: false,
      tabBarIcon: () => (
        <Text allowFontScaling={false} style={{ fontSize: route.name === 'Log' ? 28 : 22 }}>
          {ICONS[route.name]}
        </Text>
      ),
    })}
  >
    <Tab.Screen name="Home">
      {() => <HomeStackNavigator appData={appData} />}
    </Tab.Screen>
    <Tab.Screen name="Calendar">
      {({ navigation, route }) => (
        <Calendar
          cycleSettings={appData.cycleSettings}
          dailyLogs={appData.dailyLogs}
          setCycleSettings={appData.updateCycleSettings}
          navigation={navigation}
          route={route}
        />
      )}
    </Tab.Screen>
    <Tab.Screen name="Log">
      {() => (
        <LogStack.Navigator screenOptions={{ headerShown: false }}>
          <LogStack.Screen name="LogMain">
            {({ navigation }) => (
              <LogToday
                saveLog={appData.saveLog}
                todayLog={appData.getTodayLog()}
                navigation={navigation}
              />
            )}
          </LogStack.Screen>
          <LogStack.Screen name="AddSymptom">
            {({ navigation }) => (
              <AddSymptom
                navigation={navigation}
                dailyLogs={appData.dailyLogs}
                saveLog={appData.saveLog}
              />
            )}
          </LogStack.Screen>
        </LogStack.Navigator>
      )}
    </Tab.Screen>
    <Tab.Screen name="Analysis">
      {() => <AnalysisStackNavigator appData={appData} />}
    </Tab.Screen>
    <Tab.Screen name="Profile">
      {() => <ProfileStackNavigator appData={appData} />}
    </Tab.Screen>
  </Tab.Navigator>
  )
}

const AppContent = () => {
  const appData = useAppData()
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const { loading: langLoading } = useLanguage()

  const navigateFromNotificationData = (data) => {
    if (!data) return
    const tryNavigate = (attemptsLeft) => {
      if (!navigationRef.isReady()) {
        if (attemptsLeft > 0) {
          setTimeout(() => tryNavigate(attemptsLeft - 1), 300)
        }
        return
      }
      if (data.screen === 'Medications') {
        navigationRef.navigate('Main', { screen: 'Home', params: { screen: 'Medications' } })
      } else if (data.screen === 'Calendar') {
        navigationRef.navigate('Main', { screen: 'Calendar' })
      } else if (data.screen === 'Log') {
        navigationRef.navigate('Main', { screen: 'Log' })
      } else if (data.screen) {
        navigationRef.navigate('Main', { screen: 'Home', params: { screen: data.screen } })
      }
    }
    tryNavigate(10)
  }

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response && response.notification) {
        const data = response.notification.request.content.data
        navigateFromNotificationData(data)
      }
    })
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data
      navigateFromNotificationData(data)
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {})
  }, [])

  if (appData.loading || langLoading) {
    return <AnimatedSplash />
  }

  return (
    <AdsProvider suppressAppOpen={!appData.isOnboarded}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!appData.isOnboarded ? (
              <Stack.Screen name="Onboarding">
                {() => <Onboarding onComplete={appData.completeOnboarding} />}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="Main">
                {() => <TabNavigator appData={appData} />}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </AdsProvider>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
          <LanguageProvider>
            <AppContent />
          </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF6F9',
    gap: 12,
  },
  splashIcon: {
    fontSize: 72,
  },
  splashTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#C2527A',
  },
  splashSub: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F2E4EA',
    // height / paddingTop / paddingBottom are set dynamically in TabNavigator
    // from the safe-area insets so the bar never clips behind the nav bar.
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  tabIcon: {
    marginTop: 2,
  },
})