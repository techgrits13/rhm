import Constants from 'expo-constants';

let adsMayBeRequested = false;

export function canRequestAds(): boolean {
  return adsMayBeRequested;
}

export async function initAds(): Promise<boolean> {
  const disableAds = !!(Constants?.expoConfig?.extra as any)?.disableAds;
  if (disableAds) {
    return false;
  }

  try {
    // Dynamically require to avoid crashing in Expo Go
    const mobileAds = require('react-native-google-mobile-ads').default;
    const { AdsConsent, MaxAdContentRating } = require('react-native-google-mobile-ads');

    // UMP displays the AdMob-configured form where it is required. Never
    // request ads until the SDK says that the consent flow is complete.
    const consentInfo = await AdsConsent.gatherConsent({
      tagForUnderAgeOfConsent: false,
    });
    if (!consentInfo.canRequestAds) {
      console.warn('Ads are unavailable until consent can be collected.');
      return false;
    }

    // Optional: Configure global ad request settings
    await mobileAds().setRequestConfiguration({
      // Set according to your app's audience and policy compliance
      maxAdContentRating: MaxAdContentRating.T,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: [],
    });

    // Initialize the SDK
    await mobileAds().initialize();
    adsMayBeRequested = true;
    return true;
  } catch (e) {
    adsMayBeRequested = false;
    // Swallow configuration errors to avoid crashing the app
    console.warn('Ads configuration/init failed:', (e as Error)?.message);
    return false;
  }
}
