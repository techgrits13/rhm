import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_OPEN_AD_UNIT_ID } from './ads';
import { canRequestAds } from './adsInit';
import Constants from 'expo-constants';
import { safeGetJson } from '../utils/safeStorage';

const STORAGE_KEY = '@ads_app_open_stats';
const DAILY_LIMIT = 8;
export const APP_OPEN_MIN_INTERVAL_MS = 60 * 60 * 1000;
const APP_OPEN_LOAD_TIMEOUT_MS = 15 * 1000;

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
  if (!canRequestAds()) return false;
  if (!APP_OPEN_AD_UNIT_ID) return false;

  const stats = await safeGetJson<Stats>(STORAGE_KEY, {});
  const today = todayKey();
  const count = stats.shownOnDay === today ? stats.count || 0 : 0;
  if (count >= DAILY_LIMIT) return false;
  if (stats.lastShownAt) {
    const elapsed = Date.now() - stats.lastShownAt;
    if (elapsed < APP_OPEN_MIN_INTERVAL_MS) return false;
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
    let settled = false;
    let didOpen = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let unsubscribeLoaded: (() => void) | undefined;
    let unsubscribeError: (() => void) | undefined;
    let unsubscribeOpened: (() => void) | undefined;
    let unsubscribeClosed: (() => void) | undefined;

    const finish = (shown: boolean) => {
      if (settled) return;
      settled = true;
      loading = false;
      if (timeout) clearTimeout(timeout);
      unsubscribeLoaded?.();
      unsubscribeError?.();
      unsubscribeOpened?.();
      unsubscribeClosed?.();
      resolve(shown);
    };

    // Dynamic import to avoid crash in Expo Go
    let AppOpenAd: any;
    let AdEventType: any;
    try {
      const mod = require('react-native-google-mobile-ads');
      AppOpenAd = mod.AppOpenAd;
      AdEventType = mod.AdEventType;
    } catch (e) {
      finish(false);
      return;
    }

    const ad = AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT_ID!, {
      requestNonPersonalizedAdsOnly: false,
    });

    unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      try {
        const result = ad.show();
        if (result?.catch) result.catch(() => finish(false));
      } catch {
        finish(false);
      }
    });

    unsubscribeOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
      if (didOpen) return;
      didOpen = true;
      recordShown().catch(() => undefined);
    });

    unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => finish(didOpen));
    unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => finish(false));

    // A lost SDK callback must never permanently block future foreground ads.
    timeout = setTimeout(() => finish(didOpen), APP_OPEN_LOAD_TIMEOUT_MS);

    try {
      ad.load();
    } catch {
      finish(false);
    }
  });
}
