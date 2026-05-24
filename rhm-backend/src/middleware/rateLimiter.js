// Simple in-memory rate limiter (free, no external dependencies)
const rateLimitMap = new Map();

/**
 * Rate limiter middleware
 * Free alternative to express-rate-limit
 * 
 * @param {number} maxRequests - Maximum number of requests allowed
 * @param {number} windowMs - Time window in milliseconds
 */
export function rateLimiter(maxRequests = 5, windowMs = 60000) {
    // Clean up old entries every 5 minutes
    setInterval(() => {
        const now = Date.now();
        for (const [ip, requests] of rateLimitMap.entries()) {
            const recentRequests = requests.filter(time => now - time < windowMs);
            if (recentRequests.length === 0) {
                rateLimitMap.delete(ip);
            } else {
                rateLimitMap.set(ip, recentRequests);
            }
        }
    }, 300000); // 5 minutes

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        if (!rateLimitMap.has(ip)) {
            rateLimitMap.set(ip, []);
        }

        const requests = rateLimitMap.get(ip);
        const recentRequests = requests.filter(time => now - time < windowMs);

        if (recentRequests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Too many requests, please try again later',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }

        recentRequests.push(now);
        rateLimitMap.set(ip, recentRequests);

        next();
    };
}
