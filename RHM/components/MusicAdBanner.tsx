import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AD_UNITS } from '../services/ads';
import Constants from 'expo-constants';

export default function MusicAdBanner() {
    const [lastError, setLastError] = useState<string | null>(null);
    const disableAds = !!(Constants?.expoConfig?.extra as any)?.disableAds;

    if (disableAds || !AD_UNITS.banner) {
        return <View style={[styles.container, { backgroundColor: 'transparent' }]} />;
    }

    let BannerAd: any;
    let BannerAdSize: any;
    try {
        const mod = require('react-native-google-mobile-ads');
        BannerAd = mod.BannerAd;
        BannerAdSize = mod.BannerAdSize;
    } catch (e) {
        return null;
    }

    return (
        <View style={styles.container}>
            <BannerAd
                unitId={AD_UNITS.banner}
                size={BannerAdSize.INLINE_ADAPTIVE_BANNER} // Use INLINE for music lists/player
                requestOptions={{
                    requestNonPersonalizedAdsOnly: false,
                }}
                onAdFailedToLoad={(e: any) => {
                    // Hardening: Detailed logging
                    const msg = e?.message || 'Unknown error';
                    console.warn(`[MusicAdBanner] Failed to load: ${msg}`);
                    setLastError(msg);
                    // No longer setting adFailed to true to allow automatic retries
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
        marginVertical: 16,
        marginBottom: 32, // Lift up the ad
        backgroundColor: 'rgba(0,0,0,0.05)', // Subtle background to mark ad space
        borderRadius: 8,
        overflow: 'hidden',
        minHeight: 70, // Reserve minimum space for inline banner
    },
});
