import Constants from 'expo-constants';

export async function initAds() {
  const disableAds = !!(Constants?.expoConfig?.extra as any)?.disableAds;
  if (disableAds) {
    return;
  }

  try {
    // Dynamically require to avoid crashing in Expo Go
    const mobileAds = require('react-native-google-mobile-ads').default;
    const { MaxAdContentRating } = require('react-native-google-mobile-ads');

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
  } catch (e) {
    // Swallow configuration errors to avoid crashing the app
    console.warn('Ads configuration/init failed:', (e as Error)?.message);
  }
}
