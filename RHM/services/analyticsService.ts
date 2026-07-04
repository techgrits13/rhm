import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabaseApi } from './api';

const DEVICE_ID_KEY = '@rhm_device_id';

let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const randomPart = Math.random().toString(36).slice(2);
  const deviceId = `${Platform.OS}-${Date.now()}-${randomPart}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export async function trackAppActivity(appOpened = false): Promise<void> {
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    if (appOpened) {
      consecutiveFailures = 0;
    } else {
      return;
    }
  }

  try {
    const deviceId = await getDeviceId();
    // Using supabaseApi instead of Render api client
    await supabaseApi.post('/analytics', {
      deviceId,
      platform: Platform.OS,
      appOpened,
    }, {
      metadata: { suppressErrorLog: true },
    });
    consecutiveFailures = 0;
  } catch (error: any) {
    consecutiveFailures++;
    const status = error?.response?.status;
    if (status === 404 || status === 501) {
      console.warn('App usage analytics Supabase function is offline; pausing tracking.');
      consecutiveFailures = MAX_CONSECUTIVE_FAILURES;
      return;
    }
    console.warn('App activity tracking failed:', error?.message || error);
  }
}
