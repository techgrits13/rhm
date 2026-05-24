import express from 'express';
import {
    registerPushToken,
    unregisterPushToken,
    sendPushNotification,
    sendNotificationToAll,
    cleanupInvalidTokens,
} from '../services/pushNotificationService.js';
import { notificationAuth } from '../middleware/notificationAuth.js';

const router = express.Router();

/**
 * POST /api/notifications/register
 * Register a new push token
 */
router.post('/register', async (req, res) => {
    try {
        const { expo_push_token, device_type, user_id } = req.body;

        if (!expo_push_token) {
            return res.status(400).json({ error: 'Push token is required' });
        }

        const result = await registerPushToken(expo_push_token, device_type, user_id);

        if (result.success) {
            res.json({ message: 'Push token registered successfully' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /register:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/unregister
 * Unregister a push token (disable notifications)
 */
router.post('/unregister', async (req, res) => {
    try {
        const { expo_push_token } = req.body;

        if (!expo_push_token) {
            return res.status(400).json({ error: 'Push token is required' });
        }

        const result = await unregisterPushToken(expo_push_token);

        if (result.success) {
            res.json({ message: 'Push token unregistered successfully' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /unregister:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/send
 * Send a push notification to a specific token (protected)
 */
router.post('/send', notificationAuth, async (req, res) => {
    try {
        const { expo_push_token, title, body, data } = req.body;

        if (!expo_push_token || !title || !body) {
            return res.status(400).json({ error: 'Token, title, and body are required' });
        }

        const result = await sendPushNotification(expo_push_token, title, body, data);

        if (result.success) {
            res.json({ message: 'Notification sent successfully', ticket: result.ticket });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /send:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/send-all
 * Send a push notification to all registered users (protected)
 */
router.post('/send-all', notificationAuth, async (req, res) => {
    try {
        const { title, body, data } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'Title and body are required' });
        }

        const result = await sendNotificationToAll(title, body, data);

        if (result.success) {
            res.json({
                message: 'Notifications sent successfully',
                count: result.tickets?.length || 0,
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /send-all:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/cleanup
 * Clean up invalid/expired tokens (protected)
 */
router.post('/cleanup', notificationAuth, async (req, res) => {
    try {
        const result = await cleanupInvalidTokens();

        if (result.success) {
            res.json({
                message: 'Token cleanup completed',
                cleaned: result.cleaned,
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /cleanup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/notifications/in-app
 * Get unread in-app notifications
 */
router.get('/in-app', async (req, res) => {
    try {
        const { getUnreadNotifications } = await import('../services/pushNotificationService.js');
        const limit = parseInt(req.query.limit) || 50;

        const result = await getUnreadNotifications(limit);

        if (result.success) {
            res.json({
                notifications: result.notifications,
                count: result.notifications.length,
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /in-app:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/in-app/mark-read
 * Mark notification(s) as read
 */
router.post('/in-app/mark-read', async (req, res) => {
    try {
        const { markNotificationAsRead, markAllNotificationsAsRead } = await import('../services/pushNotificationService.js');
        const { notification_id, mark_all } = req.body;

        let result;
        if (mark_all) {
            result = await markAllNotificationsAsRead();
        } else if (notification_id) {
            result = await markNotificationAsRead(notification_id);
        } else {
            return res.status(400).json({ error: 'notification_id or mark_all is required' });
        }

        if (result.success) {
            res.json({ message: 'Notification(s) marked as read' });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error in /in-app/mark-read:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/notifications/test
 * Test endpoint to verify notifications are working
 */
router.get('/test', (req, res) => {
    res.json({
        message: 'Notifications API is working',
        endpoints: {
            register: 'POST /api/notifications/register',
            unregister: 'POST /api/notifications/unregister',
            send: 'POST /api/notifications/send',
            sendAll: 'POST /api/notifications/send-all',
            cleanup: 'POST /api/notifications/cleanup',
            getInApp: 'GET /api/notifications/in-app',
            markRead: 'POST /api/notifications/in-app/mark-read',
        },
    });
});

export default router;
