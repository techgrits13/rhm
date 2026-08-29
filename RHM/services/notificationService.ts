import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert, Linking, Platform } from 'react-native';
import api, { supabaseApi } from './api';
import { API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { 
  getMessaging, requestPermission, subscribeToTopic, 
  unsubscribeFromTopic, getToken, hasPermission, 
  onMessage, onNotificationOpenedApp, getInitialNotification 
} from '@react-native-firebase/messaging';

// ─── CRITICAL: Configure how notifications render when app is foregrounded ───
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// ─── Hardcoded EAS project ID — NEVER changes. Prevents falling back to Expo Go. ───
const EAS_PROJECT_ID = '099536d0-ecd3-43dd-bb67-61be5f1976c1';
const PUSH_TOKEN_KEY = '@rhm_push_token';
const NOTIFICATION_DENIED_KEY = '@rhm_notifications_denied';
const NOTIFICATION_REMINDER_STATE_KEY = '@rhm_notification_reminder_state';
const MAX_DENIED_REMINDERS_PER_DAY = 4;
const MIN_REMINDER_INTERVAL_MS = 3 * 60 * 60 * 1000;

async function setupAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync('default', {
        name: 'RHM Notifications',
        description: 'General announcements and church alerts from RHM',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6200ee',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
    });
}

export async function registerForPushNotifications(): Promise<string | null> {
    try {
        await setupAndroidChannel();

        if (!Device.isDevice) {
            console.log('Push notifications only work on physical devices');
            return null;
        }

        const msg = getMessaging();
        const authStatus = await requestPermission(msg);
        // AuthorizationStatus is an enum, usually 1 for Authorized, 2 for Provisional. We'll just check if it's > 0
        const enabled = authStatus === 1 || authStatus === 2;

        if (!enabled) {
            await AsyncStorage.setItem(NOTIFICATION_DENIED_KEY, 'true');
            console.warn('Firebase Notification permissions denied');
            return null;
        }

        await AsyncStorage.removeItem(NOTIFICATION_DENIED_KEY);

        try {
            await subscribeToTopic(msg, 'RHM_ALL_USERS');
            console.log('✅ Subscribed to FCM topic: RHM_ALL_USERS');
        } catch (e) {
            console.error('Failed to subscribe to FCM topic:', e);
        }

        const token = await getToken(msg);
        console.log('✅ FCM Push token:', token);
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

        return token;
    } catch (error) {
        console.error('Error registering for push notifications:', error);
        return null;
    }
}

type ReminderState = { date: string; count: number; lastShownAt: number; };

function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

async function readReminderState(): Promise<ReminderState> {
    const fallback = { date: todayKey(), count: 0, lastShownAt: 0 };
    try {
        const raw = await AsyncStorage.getItem(NOTIFICATION_REMINDER_STATE_KEY);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw) as ReminderState;
        if (parsed.date !== fallback.date) return fallback;
        return {
            date: parsed.date,
            count: Number(parsed.count) || 0,
            lastShownAt: Number(parsed.lastShownAt) || 0,
        };
    } catch {
        return fallback;
    }
}

export async function maybeShowNotificationPermissionReminder(): Promise<void> {
    try {
        const denied = await AsyncStorage.getItem(NOTIFICATION_DENIED_KEY);
        if (denied !== 'true') return;

        const authStatus = await hasPermission(getMessaging());
        if (authStatus === 1 || authStatus === 2) {
            await AsyncStorage.removeItem(NOTIFICATION_DENIED_KEY);
            return;
        }

        const now = Date.now();
        const state = await readReminderState();
        if (state.count >= MAX_DENIED_REMINDERS_PER_DAY) return;
        if (state.lastShownAt && now - state.lastShownAt < MIN_REMINDER_INTERVAL_MS) return;

        await AsyncStorage.setItem(
            NOTIFICATION_REMINDER_STATE_KEY,
            JSON.stringify({ date: todayKey(), count: state.count + 1, lastShownAt: now })
        );

        Alert.alert(
            'Enable RHM Notifications',
            'Turn on notifications to receive prophetic updates, music updates, video updates, breaking news, and more.',
            [
                { text: 'Later', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
        );
    } catch (error) {
        console.warn('Notification permission reminder failed:', error);
    }
}

export async function unregisterPushToken(): Promise<void> {
    try {
        await unsubscribeFromTopic(getMessaging(), 'RHM_ALL_USERS');
        console.log('Unsubscribed from FCM topic: RHM_ALL_USERS');
    } catch (error) {
        console.error('Error unregistering push token:', error);
    }
}

export function setupNotificationListeners(
    onNotificationReceived: (notification: any) => void,
    onNotificationTapped: (response: any) => void
) {
    const msg = getMessaging();

    const unsubscribeOnMessage = onMessage(msg, async (remoteMessage: any) => {
        console.log('📬 Notification received (foreground):', remoteMessage);
        
        // ── Adapt FCM remote message shape → Expo Notification shape ──────────
        // NotificationHandler expects { request: { content: { title, body, data } } }
        // FCM message has { notification: { title, body }, data: {} }
        const adaptedNotification = {
            request: {
                content: {
                    title: remoteMessage.notification?.title || '',
                    body: remoteMessage.notification?.body || '',
                    data: remoteMessage.data || {},
                }
            }
        };
        onNotificationReceived(adaptedNotification as any);
        
        // ── Also show a system-level banner while app is in foreground ─────────
        if (remoteMessage.notification) {
            try {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: remoteMessage.notification.title || '',
                        body: remoteMessage.notification.body || '',
                        data: remoteMessage.data || {},
                        sound: 'default',
                    },
                    trigger: Platform.OS === 'android'
                        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: 'default' } as any
                        : null,
                });
            } catch (err) {
                console.warn('⚠️ scheduleNotificationAsync failed:', err);
            }
        }
    });

    const unsubscribeOnNotificationOpenedApp = onNotificationOpenedApp(msg, (remoteMessage: any) => {
        console.log('👆 Notification tapped (background):', remoteMessage);
        onNotificationTapped(remoteMessage);
    });

    getInitialNotification(msg).then((remoteMessage: any) => {
        if (remoteMessage) {
            console.log('👆 Notification tapped (quit):', remoteMessage);
            onNotificationTapped(remoteMessage);
        }
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(
        (response) => {
            onNotificationTapped({ data: response.notification.request.content.data });
        }
    );

    return () => {
        unsubscribeOnMessage();
        unsubscribeOnNotificationOpenedApp();
        responseListener.remove();
    };
}

export async function fetchInAppNotifications(): Promise<any[]> {
    try {
        const response = await supabaseApi.get('/notifications/in-app');
        return response.data?.notifications || [];
    } catch (error) {
        console.error('Error fetching in-app notifications:', error);
        return [];
    }
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
    try {
        await supabaseApi.post('/notifications/mark-read', {
            notification_id: notificationId,
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

export async function markAllNotificationsAsRead(): Promise<void> {
    try {
        await supabaseApi.post('/notifications/mark-read', {
            mark_all: true,
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}
