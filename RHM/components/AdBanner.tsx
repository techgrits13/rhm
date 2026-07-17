import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { AD_UNITS } from '../services/ads';
import { canRequestAds } from '../services/adsInit';
import Constants from 'expo-constants';

interface AdBannerProps {
  style?: any;
  unitIdKey?: 'banner' | 'radioBanner';
}

export default function AdBanner({ style, unitIdKey = 'banner' }: AdBannerProps) {
  const [lastError, setLastError] = useState<string | null>(null);
  const disableAds = !!(Constants?.expoConfig?.extra as any)?.disableAds;

  const adUnitId = AD_UNITS[unitIdKey];

  if (disableAds || !canRequestAds() || !adUnitId) {
    // Return a placeholder view to maintain layout stability
    return <View style={[styles.container, style, { backgroundColor: 'transparent' }]} />;
  }

  let BannerAd: any;
  let BannerAdSize: any;
  try {
    // Dynamically require to avoid crashing in Expo Go or if module is missing
    const mod = require('react-native-google-mobile-ads');
    BannerAd = mod.BannerAd;
    BannerAdSize = mod.BannerAdSize;
  } catch (e) {
    return <View style={[styles.container, style, { backgroundColor: 'transparent' }]} />;
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdFailedToLoad={(e: any) => {
          // Hardening: Detailed logging for policy violation checks
          const msg = e?.message || 'Unknown error';
          console.warn(`[AdBanner] Failed to load: ${msg}`);
          setLastError(msg);
          // We NO LONGER set adFailed to true here, allowing AdMob to retry 
          // internally and showing the space for the ad when it eventually loads.
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    height: 80, // Fixed height to prevent layout shifts
    minHeight: 80, // Ensure minimum space for ad banner
  },
});
