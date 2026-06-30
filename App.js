import 'react-native-gesture-handler'
import { useRef, useEffect } from 'react'
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync().catch(() => {})

const navigationRef = createNavigationContainerRef()
import { ThemeProvider } from './src/context/ThemeContext'
import { LanguageProvider } from './src/context/LanguageContext'
import { PremiumProvider } from './src/context/PremiumContext'
import useAppData from './src/hooks/useAppData'
import AnimatedSplash from './src/components/AnimatedSplash'
import Onboarding from './src/screens/Onboarding'
import Dashboard from './src/screens/Dashboard'
import PeriodPicker from './src/screens/PeriodPicker'
import CycleDayDetail from './src/screens/CycleDayDetail'
import AddSymptom from './src/screens/AddSymptom'
import PregnancyIntro from './src/screens/PregnancyIntro'
import PregnancyMode from './src/screens/PregnancyMode'
import GestationDatePicker from './src/screens/GestationDatePicker'
import Calendar from './src/screens/Calendar'
import LogToday from './src/screens/LogToday'
import Analysis from './src/screens/Analysis'
import MyCycles from './src/screens/MyCycles'
import Timeline from './src/screens/Timeline'
import Paywall from './src/screens/Paywall'
import Profile from './src/screens/Profile'
import Articles from './src/screens/Articles'
import Medications from './src/screens/Medications'
import PartnerInvite from './src/screens/PartnerInvite'
import NotificationSettings from './src/screens/NotificationSettings'
import NotificationHistory from './src/screens/NotificationHistory'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()
const HomeStack = createStackNavigator()
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
          userProfile={appData.userProfile}
          todayLog={appData.getTodayLog()}
          saveLog={appData.saveLog}
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
    <HomeStack.Screen name="PartnerInvite">
      {({ navigation }) => (
        <PartnerInvite navigation={navigation} cycleSettings={appData.cycleSettings} userProfile={appData.userProfile} />
      )}
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
    <ProfileStack.Screen name="PartnerInvite">
      {({ navigation }) => (
        <PartnerInvite navigation={navigation} cycleSettings={appData.cycleSettings} userProfile={appData.userProfile} />
      )}
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
    <AnalysisStack.Screen name="Paywall">
      {({ route, navigation }) => (
        <Paywall
          visible={true}
          feature={route?.params?.feature}
          onClose={() => navigation.goBack()}
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
  </AnalysisStack.Navigator>
)


const TabNavigator = ({ appData }) => {
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 12)

  return (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: [styles.tabBar, { paddingBottom: bottomPad, height: 52 + bottomPad }],
      tabBarActiveTintColor: '#C2527A',
      tabBarInactiveTintColor: '#6B7280',
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: () => (
        <Text style={{ fontSize: route.name === 'Log' ? 28 : 22 }}>
          {ICONS[route.name]}
        </Text>
      ),
    })}
  >
    <Tab.Screen name="Home">
      {() => <HomeStackNavigator appData={appData} />}
    </Tab.Screen>
    <Tab.Screen name="Calendar">
      {({ navigation }) => (
        <Calendar
          cycleSettings={appData.cycleSettings}
          dailyLogs={appData.dailyLogs}
          setCycleSettings={appData.updateCycleSettings}
          navigation={navigation}
        />
      )}
    </Tab.Screen>
    <Tab.Screen name="Log">
      {() => (
        <LogToday
          saveLog={appData.saveLog}
          todayLog={appData.getTodayLog()}
        />
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

  if (appData.loading) {
    return <AnimatedSplash />
  }

  return (
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
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PremiumProvider>
          <LanguageProvider>
            <AppContent />
          </LanguageProvider>
        </PremiumProvider>
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
    paddingBottom: 20,
    paddingTop: 8,
    height: 72,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
})