import { Expo } from 'expo-server-sdk';
import supabase from '../utils/supabaseClient.js';

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification to a single device
 */
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
    // Check that the token is valid
    if (!Expo.isExpoPushToken(expoPushToken)) {
        console.error(`Push token ${expoPushToken} is not a valid Expo push token`);
        return { success: false, error: 'Invalid push token' };
    }

    // Construct the notification message
    const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'default',
    };

    try {
        const ticketChunk = await expo.sendPushNotificationsAsync([message]);
        console.log('Push notification sent:', ticketChunk);
        return { success: true, ticket: ticketChunk[0] };
    } catch (error) {
        console.error('Error sending push notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send push notification to multiple devices
 */
export async function sendPushNotificationToMultiple(expoPushTokens, title, body, data = {}) {
    // Filter out invalid tokens
    const validTokens = expoPushTokens.filter(token => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
        console.error('No valid push tokens provided');
        return { success: false, error: 'No valid tokens' };
    }

    // Construct messages
    const messages = validTokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'default',
    }));

    // Expo recommends sending in chunks of 100
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    try {
        for (const chunk of chunks) {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        }

        console.log(`Sent ${tickets.length} push notifications`);
        return { success: true, tickets };
    } catch (error) {
        console.error('Error sending push notifications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send notification to all registered users
 */
export async function sendNotificationToAll(title, body, data = {}) {
    try {
        // Create in-app notification first
        await createInAppNotification(title, body, data);

        // Get all active push tokens from database
        const { data: tokens, error } = await supabase
            .from('push_tokens')
            .select('expo_push_token')
            .eq('enabled', true);

        if (error) {
            console.error('Error fetching push tokens:', error);
            return { success: false, error: error.message };
        }

        if (!tokens || tokens.length === 0) {
            console.log('No push tokens found');
            return { success: false, error: 'No registered devices' };
        }

        const expoPushTokens = tokens.map(t => t.expo_push_token);
        return await sendPushNotificationToMultiple(expoPushTokens, title, body, data);
    } catch (error) {
        console.error('Error sending notification to all:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create an in-app notification (stored in database)
 */
export async function createInAppNotification(title, body, data = {}) {
    try {
        const { data: notification, error } = await supabase
            .from('in_app_notifications')
            .insert({
                title,
                body,
                data,
                read: false,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating in-app notification:', error);
            return { success: false, error: error.message };
        }

        console.log('In-app notification created:', notification.id);
        return { success: true, notification };
    } catch (error) {
        console.error('Error creating in-app notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get unread in-app notifications
 */
export async function getUnreadNotifications(limit = 50) {
    try {
        const { data: notifications, error } = await supabase
            .from('in_app_notifications')
            .select('*')
            .eq('read', false)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching unread notifications:', error);
            return { success: false, error: error.message };
        }

        return { success: true, notifications: notifications || [] };
    } catch (error) {
        console.error('Error fetching unread notifications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('in_app_notifications')
            .update({ read: true })
            .eq('id', notificationId);

        if (error) {
            console.error('Error marking notification as read:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
    try {
        const { error } = await supabase
            .from('in_app_notifications')
            .update({ read: true })
            .eq('read', false);

        if (error) {
            console.error('Error marking all notifications as read:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false, error: error.message };
    }
}


/**
 * Send notification about new video upload
 */
export async function sendNewVideoNotification(video) {
    const title = 'New Sermon Available! 🎥';
    const body = video.title || 'A new video has been uploaded';
    const data = {
        type: 'new_video',
        videoId: video.video_id,
        screen: 'Home',
    };

    return await sendNotificationToAll(title, body, data);
}

/**
 * Register a new push token
 */
export async function registerPushToken(expoPushToken, deviceType, userId = null) {
    try {
        // Check if token already exists
        const { data: existing } = await supabase
            .from('push_tokens')
            .select('id')
            .eq('expo_push_token', expoPushToken)
            .single();

        if (existing) {
            // Update existing token
            const { error } = await supabase
                .from('push_tokens')
                .update({
                    enabled: true,
                    device_type: deviceType,
                    updated_at: new Date().toISOString(),
                })
                .eq('expo_push_token', expoPushToken);

            if (error) throw error;
            console.log('Push token updated');
        } else {
            // Insert new token
            const { error } = await supabase
                .from('push_tokens')
                .insert({
                    expo_push_token: expoPushToken,
                    device_type: deviceType,
                    user_id: userId,
                    enabled: true,
                });

            if (error) throw error;
            console.log('Push token registered');
        }

        return { success: true };
    } catch (error) {
        console.error('Error registering push token:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Unregister a push token (disable notifications)
 */
export async function unregisterPushToken(expoPushToken) {
    try {
        const { error } = await supabase
            .from('push_tokens')
            .update({ enabled: false })
            .eq('expo_push_token', expoPushToken);

        if (error) throw error;
        console.log('Push token unregistered');
        return { success: true };
    } catch (error) {
        console.error('Error unregistering push token:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Clean up invalid/expired tokens
 */
export async function cleanupInvalidTokens() {
    try {
        // Get all tokens
        const { data: tokens } = await supabase
            .from('push_tokens')
            .select('id, expo_push_token');

        if (!tokens) return;

        const invalidTokens = [];

        for (const token of tokens) {
            if (!Expo.isExpoPushToken(token.expo_push_token)) {
                invalidTokens.push(token.id);
            }
        }

        if (invalidTokens.length > 0) {
            const { error } = await supabase
                .from('push_tokens')
                .delete()
                .in('id', invalidTokens);

            if (error) throw error;
            console.log(`Cleaned up ${invalidTokens.length} invalid tokens`);
        }

        return { success: true, cleaned: invalidTokens.length };
    } catch (error) {
        console.error('Error cleaning up tokens:', error);
        return { success: false, error: error.message };
    }
}
