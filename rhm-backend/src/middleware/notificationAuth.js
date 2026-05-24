/**
 * Notification API Authentication Middleware
 * Protects sensitive notification endpoints with password verification
 */

const NOTIFICATION_PASSWORD = process.env.NOTIFICATION_PASSWORD;

/**
 * Middleware to protect notification send endpoints
 * Requires password in request body or Authorization header
 */
export function notificationAuth(req, res, next) {
    // Skip if no password is configured (allows backward compatibility during setup)
    if (!NOTIFICATION_PASSWORD) {
        console.warn('⚠️ NOTIFICATION_PASSWORD not set - notification endpoints are unprotected!');
        return next();
    }

    // Check for password in request body
    const bodyPassword = req.body?.password;

    // Check for password in Authorization header (Bearer token style)
    const authHeader = req.headers.authorization;
    const headerPassword = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    // Check if either matches
    if (bodyPassword === NOTIFICATION_PASSWORD || headerPassword === NOTIFICATION_PASSWORD) {
        return next();
    }

    // Unauthorized
    console.warn('🚫 Unauthorized notification API request from:', req.ip);
    return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid password required to send notifications'
    });
}
