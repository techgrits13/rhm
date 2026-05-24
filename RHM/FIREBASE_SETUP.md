# Firebase Setup Instructions for RHM App

## ✅ Files Already Created

1. **google-services.json** - Firebase Android configuration (✓ Created)
2. **firebaseConfig.ts** - Firebase configuration for code (✓ Created)
3. **app.json** - Updated with Firebase plugin (✓ Updated)

---

## 📦 Step 1: Install Firebase Packages

Open terminal in the RHM folder and run:

```bash
cd RHM
npm install @react-native-firebase/app @react-native-firebase/messaging
```

This installs:
- `@react-native-firebase/app` - Core Firebase module
- `@react-native-firebase/messaging` - For push notifications (FCM)

---

## 🔧 Step 2: Rebuild Your App

Since we added native dependencies, you need to rebuild:

### For Development Build:
```bash
npx expo prebuild --clean
npx expo run:android
```

### For EAS Build:
```bash
eas build --platform android --profile preview
```

---

## 🚀 Step 3: Using Firebase in Your App

### Initialize Firebase (already configured)

The `firebaseConfig.ts` file contains your project configuration.

### For Push Notifications

Create a new file `services/notificationService.ts`:

```typescript
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

// Request permission for notifications
export const requestNotificationPermission = async () => {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
           authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  }
  return true; // Android doesn't need runtime permission for FCM
};

// Get FCM token
export const getFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Listen for foreground messages
export const setupNotificationListeners = () => {
  // Foreground messages
  messaging().onMessage(async remoteMessage => {
    console.log('Foreground notification:', remoteMessage);
    // Handle the notification
  });

  // Background/quit state messages
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Background notification:', remoteMessage);
  });
};
```

---

## 📱 Step 4: Update App.tsx

Add Firebase initialization to your `App.tsx`:

```typescript
import { useEffect } from 'react';
import { requestNotificationPermission, setupNotificationListeners } from './services/notificationService';

export default function App() {
  useEffect(() => {
    // Initialize Firebase notifications
    (async () => {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        setupNotificationListeners();
      }
    })();
  }, []);

  // ... rest of your app code
}
```

---

## 🔑 Firebase Project Info

- **Project ID:** rhm-app-a60cd
- **Project Number:** 171194114923
- **App ID:** 1:171194114923:android:ae2db95e8b114bc3fc222e
- **Package Name:** com.rhm.app
- **API Key:** AIzaSyBvhWEvukNb6_a1CutvHXW9DvPQsH-NkUg

---

## 🧪 Testing Push Notifications

### From Firebase Console:

1. Go to Firebase Console: https://console.firebase.google.com/project/rhm-app-a60cd
2. Navigate to **Cloud Messaging** (left sidebar)
3. Click **Send your first message**
4. Enter notification title and text
5. Click **Send test message**
6. Paste your FCM token from app logs
7. Click **Test**

### From Your Backend:

Update your backend to send notifications using FCM:

```javascript
// rhm-backend - Install firebase-admin
npm install firebase-admin

// In your backend code:
import admin from 'firebase-admin';

// Initialize with your service account
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'rhm-app-a60cd',
    // Add your service account key here
  })
});

// Send notification
const message = {
  notification: {
    title: 'New Video Available',
    body: 'Check out our latest sermon!'
  },
  token: userFCMToken // Get this from your database
};

await admin.messaging().send(message);
```

---

## 🎯 Next Steps

1. **Run the install command above**
2. **Rebuild your app** (expo prebuild or EAS build)
3. **Test notifications** from Firebase Console
4. **Integrate with your backend** for automated notifications when new videos are uploaded

---

## 📝 Notes

- For iOS, you'll need an APNs certificate (Apple Push Notification service)
- FCM tokens should be stored in your Supabase database per user
- Test on a real device, not emulator, for best results
- Background notifications work automatically on Android

---

## 🐛 Troubleshooting

### "firebase.json not found"
- This is normal for Expo apps, google-services.json is used instead

### "Notifications not received"
- Make sure app has notification permissions
- Check FCM token is valid
- Verify google-services.json is in the correct location

### Build errors
- Run `npx expo prebuild --clean` to regenerate native projects
- Make sure all Firebase packages are compatible versions

---

**Firebase integration is ready! Run the install command to complete the setup.**
