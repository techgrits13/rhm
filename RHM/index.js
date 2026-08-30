import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';

setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
  console.log('📬 Background message handled via Data-Only:', remoteMessage);
  
  const title = remoteMessage.notification?.title || remoteMessage.data?.title;
  const body = remoteMessage.notification?.body || remoteMessage.data?.body;

  if (title || body) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title || '',
          body: body || '',
          data: remoteMessage.data || {},
          sound: 'default',
        },
        trigger: null, // deliver immediately
      });
    } catch (err) {
      console.warn('⚠️ scheduleNotificationAsync failed in background:', err);
    }
  }
});

registerRootComponent(App);
