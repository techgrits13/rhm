import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_OPEN_AD_UNIT_ID } from './ads';
import Constants from 'expo-constants';
import { safeGetJson } from '../utils/safeStorage';

const STORAGE_KEY = '@ads_app_open_stats';
const DAILY_LIMIT = 3; // Strict Policy: Max 3 shows per day limit to stay within AdMob App Open policy
const MIN_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours between ads to avoid spamming the user

type Stats = {
  lastShownAt?: number;
  shownOnDay?: string; // YYYY-MM-DD
  count?: number;
};

let loading = false;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function canShow(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const disableAds = !!(Constants?.expoConfig?.extra as any)?.disableAds;
  if (disableAds) return false;
  if (!APP_OPEN_AD_UNIT_ID) return false;

  const stats = await safeGetJson<Stats>(STORAGE_KEY, {});
  const today = todayKey();
  const count = stats.shownOnDay === today ? stats.count || 0 : 0;
  if (count >= DAILY_LIMIT) return false;
  if (stats.lastShownAt) {
    const elapsed = Date.now() - stats.lastShownAt;
    if (elapsed < MIN_INTERVAL_MS) return false;
  }
  return true;
}

async function recordShown() {
  const stats = await safeGetJson<Stats>(STORAGE_KEY, {});
  const today = todayKey();
  const prevCount = stats.shownOnDay === today ? stats.count || 0 : 0;
  const next: Stats = {
    lastShownAt: Date.now(),
    shownOnDay: today,
    count: prevCount + 1,
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore save errors
  }
}

export async function showAppOpenAdIfEligible(): Promise<boolean> {
  if (loading) return false;
  const allowed = await canShow();
  if (!allowed) return false;

  return new Promise<boolean>((resolve) => {
    loading = true;

    // Dynamic import to avoid crash in Expo Go
    let AppOpenAd: any;
    let AdEventType: any;
    try {
      const mod = require('react-native-google-mobile-ads');
      AppOpenAd = mod.AppOpenAd;
      AdEventType = mod.AdEventType;
    } catch (e) {
      resolve(false);
      loading = false;
      return;
    }

    const ad = AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT_ID!, {
      requestNonPersonalizedAdsOnly: false,
    });

    const onLoaded = ad.addAdEventListener(AdEventType.LOADED, async () => {
      try {
        await ad.show();
        await recordShown();
        resolve(true);
      } catch {
        resolve(false);
      } finally {
        cleanup();
      }
    });

    const onError = ad.addAdEventListener(AdEventType.ERROR, () => {
      cleanup();
      resolve(false);
    });

    function cleanup() {
      loading = false;
      if (onLoaded) onLoaded(); // Check if function because dynamic
      if (onError) onError();
    }

    try {
      ad.load();
    } catch {
      cleanup();
      resolve(false);
    }
  });
}
