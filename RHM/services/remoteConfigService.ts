import { getRemoteConfig, fetchAndActivate, getBoolean, getString } from '@react-native-firebase/remote-config';
import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';

export async function setupRemoteConfig() {
  try {
    const rc = getRemoteConfig();
    rc.settings = {
      minimumFetchIntervalMillis: 3600000, 
      fetchTimeoutMillis: 60000
    };
    
    rc.defaultConfig = {
      latest_app_version: '1.2.0',
      force_update_required: false,
      update_url: 'https://play.google.com/store/apps/details?id=com.rhm.app'
    };
    
    await fetchAndActivate(rc);
    checkAppVersion();
  } catch (error) {
    console.log('Remote config initialized error:', error);
  }
}

export function getRemoteConfigMetrics() {
  const rc = getRemoteConfig();
  return {
    latestVersion: getString(rc, 'latest_app_version'),
    forceUpdate: getBoolean(rc, 'force_update_required'),
    updateUrl: getString(rc, 'update_url'),
  }
}

export function checkAppVersion() {
  const { latestVersion, forceUpdate, updateUrl } = getRemoteConfigMetrics();
  const currentVersion = Constants.expoConfig?.version || '1.2.0';
  
  if (latestVersion && latestVersion !== currentVersion) {
    Alert.alert(
      'Update Available',
      'A new version of the app is available. Please update to continue getting the best experience.',
      [
        { text: 'Update Now', onPress: () => Linking.openURL(updateUrl) },
        ...(forceUpdate ? [] : [{ text: 'Later', style: 'cancel' as const }])
      ],
      { cancelable: !forceUpdate }
    );
  }
}
