import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchInAppNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';

interface InAppNotification {
    id: number;
    title: string;
    body: string;
    data: any;
    read: boolean;
    created_at: string;
}

interface NotificationContextType {
    notifications: InAppNotification[];
    unreadCount: number;
    showNotification: (notification: InAppNotification) => void;
    dismissNotification: (id: number) => void;
    markAsRead: (id: number) => void;
    markAllAsRead: () => void;
    refreshNotifications: () => Promise<void>;
    currentNotification: InAppNotification | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<InAppNotification[]>([]);
    const [currentNotification, setCurrentNotification] = useState<InAppNotification | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Track auto-dismiss timer to prevent race conditions
    const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch notifications from backend with deduplication
    const refreshNotifications = useCallback(async () => {
        if (isRefreshing) return; // Skip if already refreshing

        setIsRefreshing(true);
        try {
            const fetchedNotifications = await fetchInAppNotifications();
            setNotifications(fetchedNotifications);
        } catch (error) {
            console.error('Error refreshing notifications:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, []); // FIXED: Removed isRefreshing from dependencies to prevent infinite loop

    // Auto-refresh notifications every 30 seconds
    useEffect(() => {
        refreshNotifications();
        const interval = setInterval(refreshNotifications, 30000);
        return () => clearInterval(interval);
    }, [refreshNotifications]);

    // Show notification card with proper cleanup
    const showNotification = useCallback((notification: InAppNotification) => {
        // Clear existing timer to prevent race condition
        if (dismissTimerRef.current) {
            clearTimeout(dismissTimerRef.current);
            dismissTimerRef.current = null;
        }

        setCurrentNotification(notification);

        // Set new auto-dismiss timer
        dismissTimerRef.current = setTimeout(() => {
            setCurrentNotification(null);
            dismissTimerRef.current = null;
        }, 5000);
    }, []);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (dismissTimerRef.current) {
                clearTimeout(dismissTimerRef.current);
            }
        };
    }, []);

    // Mark notification as read
    const markAsRead = useCallback(async (id: number) => {
        try {
            await markNotificationAsRead(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, []);

    // Dismiss notification card
    const dismissNotification = useCallback((id: number) => {
        // Clear timer immediately
        if (dismissTimerRef.current) {
            clearTimeout(dismissTimerRef.current);
            dismissTimerRef.current = null;
        }
        setCurrentNotification(null);
        markAsRead(id);
    }, [markAsRead]);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications([]);
            setCurrentNotification(null);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }, []);

    const unreadCount = notifications.length;

    const value: NotificationContextType = {
        notifications,
        unreadCount,
        showNotification,
        dismissNotification,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        currentNotification,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
