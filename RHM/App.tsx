import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { initAds } from './services/adsInit';
import { APP_OPEN_MIN_INTERVAL_MS, showAppOpenAdIfEligible } from './services/appOpenManager';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { AudioProvider } from './context/AudioContext';
import Constants from 'expo-constants';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationOverlay from './components/NotificationOverlay';
import NotificationHandler from './components/NotificationHandler';
import NotificationErrorBoundary from './components/NotificationErrorBoundary';
import { maybeShowNotificationPermissionReminder, registerForPushNotifications } from './services/notificationService';
import { trackAppActivity } from './services/analyticsService';

// Import screens
import HomeScreen from './screens/HomeScreen';
import RadioScreen from './screens/RadioScreen';
import BibleScreen from './screens/BibleScreen';
import NotepadScreen from './screens/NotepadScreen';
import AboutScreen from './screens/AboutScreen';
import RecordingsScreen from './screens/RecordingsScreen';
import MusicListScreen from './screens/MusicListScreen';
import MusicPlayerScreen from './screens/MusicPlayerScreen';
import BreakingNewsScreen from './screens/BreakingNewsScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import ToDoListScreen from './screens/ToDoListScreen';
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// Radio Stack Navigator (includes Radio and Recordings)
function RadioStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RadioMain"
        component={RadioScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Recordings"
        component={RecordingsScreen}
        options={{
          title: 'My Recordings',
          headerStyle: { backgroundColor: '#6200ee' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack.Navigator>
  );
}

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Radio') {
            iconName = focused ? 'radio' : 'radio-outline';
          } else if (route.name === 'Bible') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Notepad') {
            iconName = focused ? 'create' : 'create-outline';
          } else if (route.name === 'About') {
            iconName = focused ? 'information-circle' : 'information-circle-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Radio"
        component={RadioStack}
        options={{ title: 'Radio', headerShown: false }}
      />
      <Tab.Screen
        name="Bible"
        component={BibleScreen}
        options={{ title: 'Bible' }}
      />
      <Tab.Screen
        name="Notepad"
        component={NotepadScreen}
        options={{ title: 'Notepad' }}
      />
      <Tab.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'About' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const disableAds = !!(Constants?.expoConfig?.extra as any)?.disableAds;
  const navigationRef = useRef<any>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);

  // Initialize app services (ads only - NO notifications)
  useEffect(() => {
    (async () => {
      if (!disableAds) {
        try {
          await initAds();
          console.log('✅ Ads initialized');
        } catch (error) {
          console.warn('⚠️ Ads initialization failed (non-critical):', error);
        }

        try {
          await showAppOpenAdIfEligible();
        } catch (error) {
          console.warn('⚠️ App open ad failed (non-critical):', error);
        }
      }
      setIsAppReady(true);
    })();
  }, []);

  // Initialize notifications
  useEffect(() => {
    (async () => {
      try {
        await registerForPushNotifications();
        await maybeShowNotificationPermissionReminder();
        console.log('✅ Push notifications registered');
      } catch (error) {
        console.warn('⚠️ Push notification registration failed (non-critical):', error);
      }
    })();
  }, []);

  // Track active devices and daily app opens for the admin dashboard.
  useEffect(() => {
    trackAppActivity(true);
    const heartbeat = setInterval(() => trackAppActivity(false), 60000);
    return () => clearInterval(heartbeat);
  }, []);

  // ── Cold-start: app was KILLED and user tapped a notification ──────────────
  // expo-notifications gives us the last response via getLastNotificationResponseAsync.
  // We check this once after the nav container is ready and navigate accordingly.
  useEffect(() => {
    const SCREEN_MAP: Record<string, { type: 'tab' | 'root'; name: string }> = {
      Home:         { type: 'tab',  name: 'Home' },
      Radio:        { type: 'tab',  name: 'Radio' },
      Bible:        { type: 'tab',  name: 'Bible' },
      Notepad:      { type: 'tab',  name: 'Notepad' },
      About:        { type: 'tab',  name: 'About' },
      BreakingNews: { type: 'root', name: 'BreakingNews' },
      MusicList:    { type: 'root', name: 'MusicList' },
      ToDoList:     { type: 'root', name: 'ToDoList' },
    };

    const checkColdStart = async () => {
      try {
        // Dynamic import to avoid importing at top level (keeps unused warning away)
        const Notifications = await import('expo-notifications');
        const response = await Notifications.getLastNotificationResponseAsync();
        if (!response) return;

        // Wait until navigation is ready (app just finished rendering)
        const waitForNav = (retries = 10) => {
          const nav = navigationRef.current;
          if (nav && nav.isReady?.()) {
            const data = response.notification.request.content.data as Record<string, any>;
            const destScreen: string = data?.screen || 'Home';
            const dest = SCREEN_MAP[destScreen];
            if (!dest) return;
            if (dest.type === 'tab') {
              nav.navigate('MainTabs', { screen: dest.name });
            } else {
              nav.navigate(dest.name);
            }
          } else if (retries > 0) {
            setTimeout(() => waitForNav(retries - 1), 300);
          }
        };
        // Give the app 500ms to render before trying to navigate
        setTimeout(() => waitForNav(), 500);
      } catch (e) {
        console.warn('Cold-start notification check failed (non-critical):', e);
      }
    };

    checkColdStart();
  }, []);

  // Handle app state changes for ads
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = state;

      if (state === 'background' || state === 'inactive') {
        backgroundedAtRef.current = Date.now();
      }

      if (state === 'active') {
        trackAppActivity(true);
        maybeShowNotificationPermissionReminder();
        const backgroundedAt = backgroundedAtRef.current;
        const wasAwayLongEnough = !!backgroundedAt && Date.now() - backgroundedAt >= APP_OPEN_MIN_INTERVAL_MS;
        if (!disableAds && previousState.match(/inactive|background/) && wasAwayLongEnough) {
          showAppOpenAdIfEligible();
        }
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  // NOTE: Notification tap navigation is handled inside NotificationHandler
  // via the navigationRef prop. No duplicate listener needed here.

  if (!isAppReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#6200ee', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationErrorBoundary>
          <NotificationProvider>
            <AudioProvider>
              <NotificationHandler navigationRef={navigationRef} />
              <NavigationContainer ref={navigationRef}>
                <StatusBar style="auto" />
                <RootStack.Navigator>
                  <RootStack.Screen
                    name="MainTabs"
                    component={MainTabNavigator}
                    options={{ headerShown: false }}
                  />
                  <RootStack.Screen
                    name="MusicList"
                    component={MusicListScreen}
                    options={{
                      title: 'Worship Songs',
                      headerStyle: { backgroundColor: '#6200ee' },
                      headerTintColor: '#fff',
                    }}
                  />
                  <RootStack.Screen
                    name="MusicPlayer"
                    component={MusicPlayerScreen}
                    options={{
                      title: 'Now Playing',
                      presentation: 'modal',
                      headerStyle: { backgroundColor: '#6200ee' },
                      headerTintColor: '#fff',
                    }}
                  />
                  <RootStack.Screen
                    name="BreakingNews"
                    component={BreakingNewsScreen}
                    options={{
                      title: 'Breaking News',
                      headerStyle: { backgroundColor: '#6200ee' },
                      headerTintColor: '#fff',
                    }}
                  />
                  <RootStack.Screen
                    name="AdminDashboard"
                    component={AdminDashboardScreen}
                    options={{
                      title: 'Admin Panel',
                      headerStyle: { backgroundColor: '#6200ee' },
                      headerTintColor: '#fff',
                    }}
                  />
                  <RootStack.Screen
                    name="ToDoList"
                    component={ToDoListScreen}
                    options={{
                      title: 'Development Tasks',
                      headerStyle: { backgroundColor: '#2c3e50' },
                      headerTintColor: '#fff',
                    }}
                  />
                </RootStack.Navigator>
                <NotificationOverlay />
              </NavigationContainer>
            </AudioProvider>
          </NotificationProvider>
        </NotificationErrorBoundary>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
