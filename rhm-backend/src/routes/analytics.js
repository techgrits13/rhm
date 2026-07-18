import express from 'express';
import supabase from '../utils/supabaseClient.js';
import { config } from '../config.js';

const router = express.Router();
const ACTIVE_WINDOW_MINUTES = 5;

function getNairobiDate(offsetDays = 0) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return formatter.format(date);
}

function getNairobiMonthStart() {
  return `${getNairobiDate().slice(0, 7)}-01T00:00:00+03:00`;
}

function sanitizeDeviceId(deviceId) {
  if (!deviceId || typeof deviceId !== 'string') return '';
  return deviceId.trim().slice(0, 120);
}

function requireAdminSummary(req, res, next) {
  const expectedUser = config.adminUsername;
  const expectedPass = config.adminPassword;
  const user = req.headers['x-admin-user'];
  const pass = req.headers['x-admin-password'];

  if (!expectedPass) {
    return res.status(503).json({ success: false, error: 'Admin analytics is not configured' });
  }

  if (pass === expectedPass && (!expectedUser || user === expectedUser)) {
    return next();
  }

  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

router.post('/session', async (req, res) => {
  try {
    const deviceId = sanitizeDeviceId(req.body.deviceId);
    const platform = typeof req.body.platform === 'string' ? req.body.platform.slice(0, 30) : 'unknown';
    const appOpened = !!req.body.appOpened;

    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }

    const now = new Date().toISOString();
    const today = getNairobiDate();
    const deviceUpdate = {
      device_id: deviceId,
      platform,
      last_seen_at: now,
    };

    if (appOpened) {
      deviceUpdate.last_opened_at = now;
    }

    const { error: deviceError } = await supabase
      .from('app_devices')
      .upsert(deviceUpdate, { onConflict: 'device_id' });

    if (deviceError) throw deviceError;

    if (appOpened) {
      const { error: activityError } = await supabase
        .from('app_daily_device_activity')
        .upsert(
          {
            activity_date: today,
            device_id: deviceId,
            opened_at: now,
          },
          { onConflict: 'activity_date,device_id' }
        );

      if (activityError) throw activityError;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Analytics session error:', error);
    res.status(500).json({ success: false, error: 'Failed to track session' });
  }
});

router.get('/summary', requireAdminSummary, async (_req, res) => {
  try {
    const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000).toISOString();
    const today = getNairobiDate();
    const sevenDaysAgo = getNairobiDate(-6);
    const twentyEightDaysAgo = getNairobiDate(-27);
    const monthStart = getNairobiMonthStart();

    const [
      activeNow,
      openedToday,
      openedSevenDays,
      openedTwentyEightDays,
      newInstallsThisMonth,
      newInstallsToday,
    ] = await Promise.all([
      supabase
        .from('app_devices')
        .select('device_id', { count: 'exact', head: true })
        .gte('last_seen_at', activeSince),
      supabase
        .from('app_daily_device_activity')
        .select('device_id', { count: 'exact', head: true })
        .eq('activity_date', today),
      supabase
        .from('app_daily_device_activity')
        .select('device_id')
        .gte('activity_date', sevenDaysAgo)
        .lte('activity_date', today),
      supabase
        .from('app_daily_device_activity')
        .select('device_id')
        .gte('activity_date', twentyEightDaysAgo)
        .lte('activity_date', today),
      supabase
        .from('app_devices')
        .select('device_id', { count: 'exact', head: true })
        .gte('first_seen_at', monthStart),
      supabase
        .from('app_devices')
        .select('device_id', { count: 'exact', head: true })
        .gte('first_seen_at', `${today}T00:00:00+03:00`),
    ]);

    const firstError = [activeNow, openedToday, openedSevenDays, openedTwentyEightDays, newInstallsThisMonth, newInstallsToday].find((result) => result.error);
    if (firstError?.error) throw firstError.error;

    res.json({
      success: true,
      timezone: 'Africa/Nairobi',
      windows: {
        activeMinutes: ACTIVE_WINDOW_MINUTES,
        today,
        sevenDaysFrom: sevenDaysAgo,
        twentyEightDaysFrom: twentyEightDaysAgo,
        monthStart,
      },
      metrics: {
        activeNow: activeNow.count || 0,
        newInstallsThisMonth: newInstallsThisMonth.count || 0,
        newInstallsToday: newInstallsToday.count || 0,
        openedToday: openedToday.count || 0,
        openedLast7Days: new Set((openedSevenDays.data || []).map((row) => row.device_id)).size,
        openedLast28Days: new Set((openedTwentyEightDays.data || []).map((row) => row.device_id)).size,
      },
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to load analytics summary' });
  }
});

export default router;
