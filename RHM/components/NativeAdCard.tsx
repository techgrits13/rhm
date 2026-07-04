import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AD_UNITS } from '../services/ads';
import Constants from 'expo-constants';

interface NativeAdCardProps {
  style?: any;
}

/**
 * Ad Card component.
 * Uses a standard Medium Rectangle BannerAd for 100% reliability.
 * Native ads often fail to fill for new ad units, but Banners always work.
 */
export default function NativeAdCard({ style }: NativeAdCardProps) {
  const [lastError, setLastError] = useState<string | null>(null);
  const disableAds = !!(Constants?.expoConfig?.extra as any)?.disableAds;

  if (disableAds || !AD_UNITS.banner) {
    return <View style={[styles.reservedSpace, style]} />;
  }

  // If we are in Expo Go, ads might not render
  if (Constants.appOwnership === 'expo') {
    return (
      <View style={[styles.container, styles.fallbackContainer, style]}>
        <Text style={styles.fallbackText}>Ads not available in Expo Go</Text>
      </View>
    );
  }

  let BannerAd: any;
  let BannerAdSize: any;
  try {
    const mod = require('react-native-google-mobile-ads');
    BannerAd = mod.BannerAd;
    BannerAdSize = mod.BannerAdSize;
  } catch (e) {
    return <View style={[styles.reservedSpace, style]} />;
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.MEDIUM_RECTANGLE}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdFailedToLoad={(error: any) => {
          console.warn('[NativeAdCard] Ad failed to load:', error?.message || error);
          setLastError(error?.message);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 340,
    minHeight: 270,
    alignSelf: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 10,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    padding: 10,
  },
  reservedSpace: {
    width: '100%',
    maxWidth: 340,
    minHeight: 270,
    alignSelf: 'center',
    marginVertical: 10,
    backgroundColor: 'transparent',
  },
  fallbackContainer: {
    height: 250,
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderStyle: 'dashed',
  },
  fallbackText: {
    color: '#888',
    fontWeight: '600',
  },
});
