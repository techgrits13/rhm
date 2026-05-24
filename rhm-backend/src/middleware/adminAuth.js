import express from 'express';
import { config } from '../config.js';

// Rate limiting state
const loginAttempts = new Map(); // IP -> { count, lastAttempt }
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes

/**
 * Clean up old login attempts
 */
function cleanupAttempts() {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.lastAttempt > ATTEMPT_WINDOW) {
      loginAttempts.delete(ip);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupAttempts, 5 * 60 * 1000);

/**
 * Check if IP is rate limited
 */
function isRateLimited(ip) {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return false;

  const now = Date.now();

  // Check if still in lockout period
  if (attempts.count >= MAX_ATTEMPTS) {
    if (now - attempts.lastAttempt < LOCKOUT_DURATION) {
      return true;
    } else {
      // Lockout expired, reset
      loginAttempts.delete(ip);
      return false;
    }
  }

  return false;
}

/**
 * Record failed login attempt
 */
function recordFailedAttempt(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);

  if (!attempts) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  } else {
    // Reset if outside attempt window
    if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
      loginAttempts.set(ip, { count: 1, lastAttempt: now });
    } else {
      attempts.count++;
      attempts.lastAttempt = now;
    }
  }
}

/**
 * Reset attempts on successful login
 */
function resetAttempts(ip) {
  loginAttempts.delete(ip);
}

/**
 * Validate credentials format
 */
function validateCredentials(user, pass) {
  // Basic validation to prevent injection
  if (!user || !pass) return false;
  if (typeof user !== 'string' || typeof pass !== 'string') return false;
  if (user.length > 100 || pass.length > 100) return false;
  // Prevent null bytes and control characters
  if (/[\x00-\x1F\x7F]/.test(user) || /[\x00-\x1F\x7F]/.test(pass)) return false;
  return true;
}

/**
 * Admin authentication middleware with rate limiting
 */
export default function adminAuth(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Check rate limiting
  if (isRateLimited(ip)) {
    console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`);
    res.set('WWW-Authenticate', 'Basic realm="Restricted"');
    return res.status(429).send('Too many failed attempts. Please try again later.');
  }

  // If no password configured, allow in development only
  const pwd = config.adminPassword;
  if (!pwd) {
    if (config.nodeEnv !== 'production') return next();
    // In production with no password, block access
    res.set('WWW-Authenticate', 'Basic realm="Restricted"');
    return res.status(401).send('Admin UI is not configured');
  }

  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Restricted"');
    return res.status(401).send('Authentication required');
  }

  try {
    const b64 = header.slice(6);
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    const [user, ...rest] = decoded.split(':');
    const pass = rest.join(':');

    // Validate input format
    if (!validateCredentials(user, pass)) {
      console.warn(`⚠️ Invalid credential format from IP: ${ip}`);
      recordFailedAttempt(ip);
      res.set('WWW-Authenticate', 'Basic realm="Restricted"');
      return res.status(401).send('Invalid credentials');
    }

    const expectedUser = config.adminUsername; // if not set, allow any username

    if (pass === pwd && (!expectedUser || user === expectedUser)) {
      resetAttempts(ip);
      console.log(`✅ Admin login successful from IP: ${ip}`);
      return next();
    }

    // Failed authentication
    console.warn(`⚠️ Failed login attempt from IP: ${ip}, user: ${user}`);
    recordFailedAttempt(ip);
  } catch (e) {
    console.error('❌ Auth error:', e);
    recordFailedAttempt(ip);
  }

  res.set('WWW-Authenticate', 'Basic realm="Restricted"');
  return res.status(401).send('Invalid credentials');
}
