import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
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
  const [adError, setAdError] = useState(false);
  const disableAds = !!(Constants?.expoConfig?.extra as any)?.disableAds;

  if (disableAds || !AD_UNITS.banner) {
    return null;
  }

  // If we are in Expo Go, ads might not render
  if (Constants.appOwnership === 'expo') {
    return (
      <View style={[styles.container, styles.fallbackContainer, style]}>
        <Text style={styles.fallbackText}>Ads not available in Expo Go</Text>
      </View>
    );
  }

  if (adError) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.MEDIUM_RECTANGLE}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          console.error('Radio Screen Ad failed to load: ', error);
          setAdError(true);
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
    borderRadius: 12,
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
    padding: 10, // padding to give a nice border around the ad
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
