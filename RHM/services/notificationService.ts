import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api, { supabaseApi } from './api';
import { API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

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

/**
 * Create the Android notification channel.
 * MUST be called before requesting permission / getting a token.
 * Without this, Android 8+ drops notifications silently.
 */
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

/**
 * Request notification permissions and get an Expo push token scoped
 * to the RHM standalone app (never Expo Go).
 */
export async function registerForPushNotifications(): Promise<string | null> {
    try {
        // Step 1: Create Android channel FIRST
        await setupAndroidChannel();

        // Only works on physical devices
        if (!Device.isDevice) {
            console.log('Push notifications only work on physical devices');
            return null;
        }

        // Step 2: Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('❌ Notification permissions denied');
            return null;
        }

        // Step 3a: If we already have a token, reuse it but ALWAYS re-register with backend.
        // This fixes cases where the first registration failed due to network/env issues.
        const existingToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        if (existingToken) {
            await registerTokenWithBackend(existingToken);
            return existingToken;
        }

        // Step 3b: Get push token — ALWAYS pass projectId so it's bound to com.rhm.app,
        // not to Expo Go. Expo Go tokens start with ExponentPushToken and open Expo Go.
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId ??
            EAS_PROJECT_ID; // hardcoded fallback — never allow undefined

        console.log('🆔 Token will be scoped to projectId:', projectId);

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData.data;

        console.log('✅ Push token:', token);

        // Step 4: Persist locally and register with backend
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        await registerTokenWithBackend(token);

        return token;
    } catch (error) {
        console.error('Error registering for push notifications:', error);
        return null;
    }
}

/**
 * Register push token with Supabase edge function.
 */
async function registerTokenWithBackend(token: string): Promise<void> {
    try {
        const platform = Platform.OS;
        const appOwnership = Constants.appOwnership || 'standalone';
        console.log('☁️ Registering push token with Supabase...', { token, platform, appOwnership });
        const payload = {
            token,
            platform,
            app_ownership: appOwnership,
            experience_id: Constants.experienceId,
        };

        const maxAttempts = 3;
        let lastError: any;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await supabaseApi.post('/notifications/register', payload);
                console.log('✅ Push token registered:', response.data);
                return;
            } catch (e: any) {
                lastError = e;
                const delayMs = 800 * attempt;
                console.warn(`⚠️ Push token register attempt ${attempt}/${maxAttempts} failed; retrying in ${delayMs}ms...`);
                await new Promise((r) => setTimeout(r, delayMs));
            }
        }

        throw lastError;
    } catch (error) {
        console.error('Error registering token with Supabase:', error);
        throw error;
    }
}

/**
 * Unregister push token (disable notifications for this device).
 */
export async function unregisterPushToken(): Promise<void> {
    try {
        const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        if (!token) return;

        await supabaseApi.post('/notifications/unregister', { token });
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        console.log('Push token unregistered');
    } catch (error) {
        console.error('Error unregistering push token:', error);
    }
}

/**
 * Setup notification listeners (foreground + tap).
 */
export function setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTapped: (response: Notifications.NotificationResponse) => void
) {
    const notificationListener = Notifications.addNotificationReceivedListener(
        (notification) => {
            console.log('📬 Notification received (foreground):', notification);
            onNotificationReceived(notification);
        }
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
        (response) => {
            console.log('👆 Notification tapped:', response);
            onNotificationTapped(response);
        }
    );

    return () => {
        notificationListener.remove();
        responseListener.remove();
    };
}

/**
 * Fetch in-app notifications from Supabase.
 */
export async function fetchInAppNotifications(): Promise<any[]> {
    try {
        const response = await supabaseApi.get('/notifications/in-app');
        return response.data?.notifications || [];
    } catch (error) {
        console.error('Error fetching in-app notifications:', error);
        return [];
    }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(notificationId: number): Promise<void> {
    try {
        await supabaseApi.post('/notifications/mark-read', {
            notification_id: notificationId,
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

/**
 * Mark ALL notifications as read.
 */
export async function markAllNotificationsAsRead(): Promise<void> {
    try {
        await supabaseApi.post('/notifications/mark-read', {
            mark_all: true,
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}
