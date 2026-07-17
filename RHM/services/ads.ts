import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type AdUnitSet = {
  banner: string;
  radioBanner?: string;
  interstitial: string;
  rewarded: string;
  appOpen: string;
  native: string;
};

// TEST AD UNIT IDs (Use these for development to avoid policy violations)
const TEST_AD_UNITS: Record<'ios' | 'android', AdUnitSet> = {
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    radioBanner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    appOpen: 'ca-app-pub-3940256099942544/5662855259',
    native: 'ca-app-pub-3940256099942544/2247696110',
  },
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    radioBanner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    appOpen: 'ca-app-pub-3940256099942544/3419835294',
    native: 'ca-app-pub-3940256099942544/2247696110',
  },
};

// Real Android Ad Unit IDs (Keep these safe, switch ONLY for production build)
const ANDROID_REAL: Partial<AdUnitSet> = {
  banner: 'ca-app-pub-3848557016813463/5670087742',
  radioBanner: 'ca-app-pub-3848557016813463/3676438972',
  appOpen: 'ca-app-pub-3848557016813463/3103618245',
  native: 'ca-app-pub-3848557016813463/6470879502',
};

// Safety-first: use Google's official test inventory unless a production build
// explicitly sets expo.extra.adMode to "production".
const adMode = (Constants.expoConfig?.extra as any)?.adMode;
export const IS_TEST_AD_MODE = adMode !== 'production' || __DEV__;

export const AD_UNITS: AdUnitSet = IS_TEST_AD_MODE
? (Platform.OS === 'android' ? TEST_AD_UNITS.android : TEST_AD_UNITS.ios)
: Platform.select<AdUnitSet>({
  ios: TEST_AD_UNITS.ios,
  android: {
    banner: ANDROID_REAL.banner!,
    radioBanner: ANDROID_REAL.radioBanner,
    interstitial: TEST_AD_UNITS.android.interstitial,
    rewarded: TEST_AD_UNITS.android.rewarded,
    appOpen: ANDROID_REAL.appOpen!,
    native: ANDROID_REAL.native!,
  },
}) as AdUnitSet;

export const APP_OPEN_AD_UNIT_ID = AD_UNITS.appOpen;
