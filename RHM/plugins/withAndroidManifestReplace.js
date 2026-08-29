const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to resolve AndroidManifest merger conflicts between
 * expo-notifications and react-native-firebase/messaging.
 *
 * Firebase messaging ships its own values for:
 *   - default_notification_channel_id  (conflicts on android:value)
 *   - default_notification_color       (conflicts on android:resource)
 *
 * By adding tools:replace we tell the merger to use OUR app's value.
 */
function withAndroidManifestReplace(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const manifest = androidManifest.manifest;
    const application = manifest.application[0];

    // Ensure tools namespace is present on the root <manifest> tag
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const metaDataList = application['meta-data'] || [];

    // 1. Fix android:value conflict for default_notification_channel_id
    const channelMeta = metaDataList.find(
      (m) => m.$['android:name'] === 'com.google.firebase.messaging.default_notification_channel_id'
    );
    if (channelMeta) {
      channelMeta.$['tools:replace'] = 'android:value';
    }

    // 2. Fix android:resource conflict for default_notification_color
    const colorMeta = metaDataList.find(
      (m) => m.$['android:name'] === 'com.google.firebase.messaging.default_notification_color'
    );
    if (colorMeta) {
      colorMeta.$['tools:replace'] = 'android:resource';
    }

    return config;
  });
}

module.exports = withAndroidManifestReplace;
