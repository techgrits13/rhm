# RHM Church Mobile App

A React Native mobile application for RHM Church, providing access to sermons, live radio, Bible study, and personal note-taking.

## 📱 Features

### ✅ Home Screen
- Display YouTube videos from church channels
- Beautiful card layout with thumbnails
- Pull-to-refresh functionality
- Tap to open videos in YouTube app/browser

### ✅ Radio Screen
- Stream Jesus Is Lord Radio One (Nakuru)
- Simple play/stop controls
- Background audio support
- Connection status indicator

### ✅ Bible Screen
- Search any Bible verse by reference
- Quick access buttons for popular verses
- KJV translation (free Bible API)
- Clean, readable typography

### ✅ Notepad Screen
- Create, edit, and delete personal notes
- Local and cloud storage sync
- Full-screen editor modal
- Timestamps on all notes

### ✅ About Screen
- App information and version
- Links to church YouTube channels
- Support developer option
- Feature list

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ installed
- Expo CLI installed: `npm install -g expo-cli`
- Expo Go app on your phone (iOS/Android)
- Backend server running (see rhm-backend folder)

### Installation

1. **Install dependencies:**
```bash
cd RHM
npm install
```

2. **Update API URL:**
   - Open `services/api.ts`
   - Replace `localhost` with your computer's IP address
   - Example: `http://192.168.1.100:5000`

3. **Start the app:**
```bash
npm start
```

4. **Scan QR code:**
   - Use Expo Go app to scan the QR code
   - App will load on your device

## 📦 Dependencies

- **@react-navigation/native** - Navigation
- **@react-navigation/bottom-tabs** - Tab navigation
- **axios** - HTTP requests
- **expo-av** - Audio playback (radio)
- **@react-native-async-storage/async-storage** - Local storage
- **expo-linking** - Open external links
- **@expo/vector-icons** - Icons

## 🔧 Configuration

### Connect to Backend

1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4)
   - Mac/Linux: `ifconfig` or `ip addr`

2. Update `services/api.ts`:
```typescript
const API_BASE_URL = 'http://YOUR_IP_ADDRESS:5000';
```

3. Ensure backend is running:
```bash
cd ../rhm-backend
npm run dev
```

## 📱 Running on Different Platforms

### Android
```bash
npm run android
```

### iOS (Mac only)
```bash
npm run ios
```

### Web
```bash
npm run web
```

## 🏗️ Project Structure

```
RHM/
├── screens/              # App screens
│   ├── HomeScreen.tsx    # YouTube videos
│   ├── RadioScreen.tsx   # Radio player
│   ├── BibleScreen.tsx   # Bible search
│   ├── NotepadScreen.tsx # Note-taking
│   └── AboutScreen.tsx   # App info
│
├── services/             # API integration
│   ├── api.ts           # Base axios instance
│   ├── videoService.ts  # Video API calls
│   ├── radioService.ts  # Radio API calls
│   ├── bibleService.ts  # Bible API calls
│   └── notesService.ts  # Notes API calls
│
├── assets/              # Images, icons
├── App.tsx              # Main app component
└── package.json         # Dependencies

```

## 🎨 Styling

- Clean, modern church-appropriate design
- Purple theme color: `#6200ee`
- Consistent spacing and typography
- Shadow and elevation for depth

## 🐛 Troubleshooting

### "Network request failed"
- Backend server must be running
- Check API_BASE_URL in `services/api.ts`
- Use computer's IP, not `localhost`
- Ensure phone and computer on same WiFi

### Radio not playing
- Check internet connection
- Verify radio stream URL in backend
- Try stopping and restarting playback

### Videos not loading
- Backend must be connected to Supabase
- Run sample data SQL script in Supabase
- Check backend logs for errors

### Notes not saving
- Backend must be running
- User ID is auto-generated on first use
- Check AsyncStorage permissions

## 📝 Testing

### Test Home Screen
1. Open app
2. Videos should load from backend
3. Tap video → Opens in YouTube
4. Pull down → Refreshes list

### Test Radio
1. Navigate to Radio tab
2. Tap play button
3. Should hear Jesus Is Lord Radio
4. Tap stop → Audio stops

### Test Bible
1. Navigate to Bible tab
2. Enter "John 3:16"
3. Tap search → Verse displays
4. Try quick access buttons

### Test Notepad
1. Navigate to Notepad tab
2. Tap + button
3. Create note with title and content
4. Save → Note appears in list
5. Tap note → Edit mode
6. Swipe or tap trash → Delete

## 🚢 Building for Production

### Android APK
```bash
eas build --platform android
```

### iOS
```bash
eas build --platform ios
```

*Requires Expo EAS account (free tier available)*

## 📄 License

© 2025 RHM Church. All rights reserved.

## 🙏 Credits

- Bible API: bible-api.com
- Radio: Jesus Is Lord Radio One (Nakuru)
- Icons: @expo/vector-icons

---

**Made with ❤️ for RHM Church Community**
