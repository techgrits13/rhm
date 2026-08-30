import { LogLevel, OneSignal } from 'react-native-onesignal';
import { Alert, Linking, Platform } from 'react-native';
import api, { supabaseApi } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// TODO: Replace this with your actual OneSignal App ID
export const ONESIGNAL_APP_ID = 'ee2fc9eb-ac14-4c6c-ba5f-df4cc1c525e4';

const PUSH_TOKEN_KEY = '@rhm_push_token';
const NOTIFICATION_DENIED_KEY = '@rhm_notifications_denied';
const NOTIFICATION_REMINDER_STATE_KEY = '@rhm_notification_reminder_state';
const MAX_DENIED_REMINDERS_PER_DAY = 4;
const MIN_REMINDER_INTERVAL_MS = 3 * 60 * 60 * 1000;

export async function registerForPushNotifications(): Promise<string | null> {
    try {
        if (!Device.isDevice) {
            console.log('Push notifications require a physical device');
            return null;
        }

        OneSignal.Debug.setLogLevel(LogLevel.Verbose);
        OneSignal.initialize(ONESIGNAL_APP_ID);

        OneSignal.Notifications.requestPermission(true);

        const token = OneSignal.User.pushSubscription.getPushSubscriptionId();
        
        if (token) {
            await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        }
        
        return token || null;
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
        const hasPermission = OneSignal.Notifications.hasPermission();
        if (hasPermission) return;

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
        OneSignal.User.pushSubscription.optOut();
    } catch (error) {
        console.error('Error unregistering push token:', error);
    }
}

// Adapting the original listeners
export function setupNotificationListeners(
    onNotificationReceived: (notification: any) => void,
    onNotificationTapped: (response: any) => void
) {
    const foregroundListener = (event: any) => {
        console.log('📬 Notification received (foreground):', event);
        const notification = event.notification;
        
        const adaptedNotification = {
            request: {
                content: {
                    title: notification.title || '',
                    body: notification.body || '',
                    data: notification.additionalData || {},
                }
            }
        };
        
        onNotificationReceived(adaptedNotification);
    };
    
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', foregroundListener);

    const clickListener = (event: any) => {
        console.log('👆 Notification tapped:', event);
        const notification = event.notification;
        
        const adaptedResponse = {
            notification: {
                request: {
                    content: {
                        data: notification.additionalData || {}
                    }
                }
            }
        };
        onNotificationTapped(adaptedResponse);
    };

    OneSignal.Notifications.addEventListener('click', clickListener);

    return () => {
        OneSignal.Notifications.removeEventListener('foregroundWillDisplay', foregroundListener);
        OneSignal.Notifications.removeEventListener('click', clickListener);
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
