import { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { setupNotificationListeners } from '../services/notificationService';
import * as Notifications from 'expo-notifications';

/**
 * NotificationHandler — mounted at the root of the app (inside NavigationContainer).
 * Handles two cases:
 *   1. Notification received while app is in the FOREGROUND → show in-app overlay
 *   2. User TAPS a notification (foreground or background) → navigate to the right screen
 *
 * Navigation is done via the exposed navigationRef from App.tsx which is passed in as a prop.
 */
interface Props {
    navigationRef?: React.RefObject<any>;
}

// Screen map — must match the RootStack / Tab names in App.tsx
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

export default function NotificationHandler({ navigationRef }: Props) {
    const { showNotification, refreshNotifications } = useNotifications();

    useEffect(() => {
        const cleanup = setupNotificationListeners(
            // ── Case 1: Notification arrives while app is open (foreground) ──────
            (notification: Notifications.Notification) => {
                try {
                    const content = notification.request?.content;
                    if (!content) return;

                    const { title, body, data } = content;
                    if (!title || typeof title !== 'string') return;

                    const sanitizedBody = (body && typeof body === 'string') ? body : '';
                    const sanitizedData = (data && typeof data === 'object') ? data : {};

                    showNotification({
                        id: Date.now(),
                        title: title.slice(0, 100),
                        body: sanitizedBody.slice(0, 500),
                        data: sanitizedData,
                        read: false,
                        created_at: new Date().toISOString(),
                    });

                    // Sync with backend after a brief delay
                    setTimeout(() => refreshNotifications(), 1500);
                } catch (error) {
                    console.error('Error handling foreground notification:', error);
                }
            },

            // ── Case 2: User taps a notification (any app state) ─────────────────
            (response: Notifications.NotificationResponse) => {
                try {
                    const data = response.notification.request.content.data as Record<string, any>;
                    const destScreen: string = data?.screen || 'Home';
                    console.log('👆 Notification tapped — navigating to:', destScreen);

                    const nav = navigationRef?.current;
                    if (!nav || !nav.isReady?.()) {
                        // Navigation not yet ready — retry once after a short delay
                        setTimeout(() => navigateToScreen(navigationRef?.current, destScreen), 800);
                        return;
                    }

                    navigateToScreen(nav, destScreen);
                } catch (error) {
                    console.error('Error handling notification tap:', error);
                }
            }
        );

        return cleanup;
    }, [showNotification, refreshNotifications, navigationRef]);

    return null;
}

function navigateToScreen(nav: any, destScreen: string) {
    if (!nav) return;
    const dest = SCREEN_MAP[destScreen];
    if (!dest) {
        // Unknown screen — fall back to Home
        nav.navigate('MainTabs', { screen: 'Home' });
        return;
    }
    if (dest.type === 'tab') {
        nav.navigate('MainTabs', { screen: dest.name });
    } else {
        nav.navigate(dest.name);
    }
}
