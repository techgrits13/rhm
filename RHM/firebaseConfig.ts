/**
 * Firebase Configuration for RHM App
 * 
 * This file contains Firebase project configuration.
 * For Expo apps, the google-services.json is automatically used by the build process.
 */

export const firebaseConfig = {
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'rhm-app-a60cd',
  projectNumber: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_NUMBER || '171194114923',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:171194114923:android:ae2db95e8b114bc3fc222e',
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY, // Use environment variable!
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'rhm-app-a60cd.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '171194114923',
};

export default firebaseConfig;
