import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AD_UNITS } from '../services/ads';
import { canRequestAds } from '../services/adsInit';
import Constants from 'expo-constants';

/**
 * InlineMrec — a non-collapsible 300x250 Medium Rectangle ad.
 * Rendered in the Radio screen's normal scrollable content flow.
 * Uses the radioBanner ad unit for separate bidding from the standard banner.
 */
export default function InlineMrec() {
  const [adLoaded, setAdLoaded] = useState(false);
  const disableAds = !!(Constants?.expoConfig?.extra as any)?.disableAds;

  // Only render on Android — iOS MREC works differently and needs a separate unit
  const adUnitId = AD_UNITS.radioBanner;
  const shouldLoadAd = !disableAds && canRequestAds() && !!adUnitId;

  // Never collapse this placement. The fixed 300x250 slot stays visible if
  // consent, the SDK, or ad inventory is temporarily unavailable.
  if (!shouldLoadAd) return <MrecSlot />;

  let BannerAd: any;
  let BannerAdSize: any;
  try {
    const mod = require('react-native-google-mobile-ads');
    BannerAd = mod.BannerAd;
    BannerAdSize = mod.BannerAdSize;
  } catch (e) {
    return <MrecSlot />;
  }

  return (
    <MrecSlot loaded={adLoaded}>
      <BannerAd
        unitId={adUnitId!}
        size={BannerAdSize.MEDIUM_RECTANGLE}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(e: any) => {
          console.warn('[InlineMrec] Failed to load:', e?.message || 'Unknown error');
        }}
      />
    </MrecSlot>
  );
}

function MrecSlot({ children, loaded = false }: { children?: React.ReactNode; loaded?: boolean }) {
  return (
    <View style={styles.adSection}>
      <Text style={styles.adLabel}>{loaded ? 'Advertisement' : 'Jesus Is Lord Radio'}</Text>
      <View style={[styles.mrecWrapper, loaded && styles.mrecWrapperLoaded]}>
        {!loaded && <RadioFallbackArtwork />}
        {children}
      </View>
    </View>
  );
}

function RadioFallbackArtwork() {
  return (
    <LinearGradient
      colors={['#061A52', '#123C9C', '#061A52']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fallbackArtwork}
      accessibilityLabel="Prepare the way, the Messiah is coming"
    >
      <Ionicons name="radio-outline" size={42} color="#FFD54A" />
      <Text style={styles.fallbackTitle}>PREPARE THE WAY</Text>
      <Text style={styles.fallbackSubtitle}>THE MESSIAH IS COMING</Text>
      <View style={styles.goldRule} />
      <Text style={styles.fallbackCaption}>JESUS IS LORD RADIO</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  adSection: {
    alignItems: 'center',
    // Keep a clear separation from the recording actions so an ad cannot be
    // mistaken for, or accidentally tapped as, an app control.
    marginTop: 24,
    marginBottom: 24,
  },
  adLabel: {
    color: '#777',
    fontSize: 12,
    marginBottom: 6,
  },
  mrecWrapper: {
    alignSelf: 'center',
    width: 300,
    height: 250,
    marginVertical: 0,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mrecWrapperLoaded: {
    backgroundColor: 'transparent',
  },
  fallbackArtwork: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  fallbackTitle: {
    color: '#FFD54A',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginTop: 12,
  },
  fallbackSubtitle: {
    color: '#FFE680',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginTop: 6,
  },
  goldRule: {
    width: 52,
    height: 2,
    backgroundColor: '#FFD54A',
    marginVertical: 16,
  },
  fallbackCaption: {
    color: '#BFD0FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
});
