import { config } from '../config.js';
import crypto from 'crypto';

// Rate limiting state
const loginAttempts = new Map(); // IP -> { count, lastAttempt }
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes

function cleanupAttempts() {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.lastAttempt > ATTEMPT_WINDOW) {
      loginAttempts.delete(ip);
    }
  }
}
setInterval(cleanupAttempts, 5 * 60 * 1000);

export function isRateLimited(ip) {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return false;
  const now = Date.now();
  if (attempts.count >= MAX_ATTEMPTS) {
    if (now - attempts.lastAttempt < LOCKOUT_DURATION) {
      return true;
    } else {
      loginAttempts.delete(ip);
      return false;
    }
  }
  return false;
}

export function recordFailedAttempt(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  if (!attempts) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  } else {
    if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
      loginAttempts.set(ip, { count: 1, lastAttempt: now });
    } else {
      attempts.count++;
      attempts.lastAttempt = now;
    }
  }
}

export function resetAttempts(ip) {
  loginAttempts.delete(ip);
}

export function getSessionToken() {
  const user = config.adminUsername || 'esir';
  const pass = config.adminPassword || '12822Esir@#';
  return crypto.createHmac('sha256', pass || 'secret').update(`${user}:${pass}`).digest('hex');
}

export function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    });
  }
  return list;
}

export default function adminAuth(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  // Allow login and logout routes to bypass auth check
  if (req.path === '/login' || req.path === '/logout') {
    return next();
  }

  // Check Rate Limiting
  if (isRateLimited(ip)) {
    console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`);
    return res.status(429).send('Too many failed attempts. Please try again later.');
  }

  // 1. Check Cookie Session
  const cookies = parseCookies(req);
  if (cookies.admin_session && cookies.admin_session === getSessionToken()) {
    return next();
  }

  // 2. Check Basic Auth
  const pwd = config.adminPassword || '12822Esir@#';
  const expectedUser = config.adminUsername || 'esir';
  const header = req.headers['authorization'] || '';

  if (header.startsWith('Basic ')) {
    try {
      const b64 = header.slice(6);
      const decoded = Buffer.from(b64, 'base64').toString('utf8');
      const [user, ...rest] = decoded.split(':');
      const pass = rest.join(':');

      if (pass === pwd && (!expectedUser || user === expectedUser)) {
        resetAttempts(ip);
        return next();
      } else {
        recordFailedAttempt(ip);
      }
    } catch (e) {
      recordFailedAttempt(ip);
    }
  }

  // If not authenticated, redirect browser GET requests to login page
  if (req.method === 'GET' && (req.headers.accept || '').includes('text/html')) {
    return res.redirect('/admin-ui/login');
  }

  return res.status(401).redirect('/admin-ui/login?error=' + encodeURIComponent('Please log in to access the admin dashboard.'));
}
