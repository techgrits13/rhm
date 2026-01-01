# 🚀 QUICK START GUIDE - Get Your App Running in 5 Minutes!

## ✅ Prerequisites (Already Done)
- ✅ Backend running on port 5000
- ✅ Supabase configured with credentials
- ✅ Database tables created
- ✅ Mobile app dependencies installed

---

## 🎯 3 CRITICAL STEPS TO RUN THE APP

### STEP 1: Add Sample Videos to Supabase ⚡

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: **kwaalveiuiarvldwtdbn**
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste this SQL:

```sql
-- Insert sample videos
INSERT INTO videos (video_id, title, description, thumbnail_url, published_at, channel_id) VALUES
(
  'dQw4w9WgXcQ',
  'Sunday Service - Gods Love Never Fails',
  'Join us for a powerful message about Gods unfailing love.',
  'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  NOW() - INTERVAL '2 days',
  'UCkayolemainworshipchannel'
),
(
  'jNQXAC9IVRw',
  'Worship Night - Holy Spirit Move',
  'Experience the presence of God in this worship night.',
  'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
  NOW() - INTERVAL '5 days',
  'UCWorshipTV7'
),
(
  '9bZkp7q19f0',
  'Prayer Meeting - Breakthrough Session',
  'Corporate prayer meeting for breakthrough and miracles.',
  'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
  NOW() - INTERVAL '1 week',
  'UCkayolemainworshipchannel'
)
ON CONFLICT (video_id) DO NOTHING;
```

6. Click **Run** → Should see "Success"

---

### STEP 2: Get Your Computer's IP Address 🌐

**Windows:**
1. Press `Win + R`
2. Type `cmd` and press Enter
3. Type `ipconfig` and press Enter
4. Look for "IPv4 Address" → Example: `192.168.1.100`
5. **COPY THIS NUMBER!**

**Mac/Linux:**
1. Open Terminal
2. Type `ifconfig` or `ip addr`
3. Look for your local IP (192.168.x.x)

---

### STEP 3: Update Mobile App API URL 🔧

1. Open file: `RHM/services/api.ts`

2. Find this line (around line 8):
```typescript
const API_BASE_URL = 'http://localhost:5000';
```

3. Replace with YOUR IP:
```typescript
const API_BASE_URL = 'http://192.168.1.100:5000'; // YOUR IP HERE!
```

4. **Save the file!**

---

## ▶️ RUN THE APP!

### Terminal 1: Start Backend
```bash
cd rhm-backend
npm run dev
```

**Should see:**
```
✅ Server running on port 5000
```

### Terminal 2: Start Mobile App
```bash
cd RHM
npm start
```

**Should see:**
- QR code in terminal
- Metro bundler running

### On Your Phone:

1. **Install Expo Go:**
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. **Scan QR Code:**
   - Android: Open Expo Go → Scan QR
   - iOS: Open Camera → Scan QR → Open in Expo Go

3. **App loads!** 🎉

---

## ✅ TEST EACH FEATURE

### 1. Home Tab
- **Expected:** See 3 sample videos with thumbnails
- **Action:** Tap any video → Opens in YouTube
- **Test:** Pull down to refresh

### 2. Radio Tab
- **Expected:** "Jesus Is Lord Radio One - Nakuru"
- **Action:** Tap play button → Radio streams
- **Test:** Tap stop → Audio stops

### 3. Bible Tab
- **Expected:** Search box with quick buttons
- **Action:** Type "John 3:16" → Tap search
- **Result:** Bible verse displays

### 4. Notepad Tab
- **Expected:** Empty or list of notes
- **Action:** Tap + button → Create note
- **Test:** Save → Edit → Delete

### 5. About Tab
- **Expected:** App info and features
- **Action:** Scroll through
- **Test:** Tap YouTube links

---

## 🐛 TROUBLESHOOTING

### ❌ "Network request failed"
**FIX:**
- Ensure backend is running (Terminal 1)
- Verify API URL has YOUR IP (not localhost)
- Both phone and computer on **SAME WiFi**

### ❌ Videos not loading
**FIX:**
- Run sample-data.sql in Supabase
- Restart backend: `npm run dev`
- Pull down to refresh in app

### ❌ Radio won't play
**FIX:**
- Check internet connection
- Try stopping and restarting
- Some networks block streaming

### ❌ Can't scan QR code
**FIX:**
- Make sure Expo Go is installed
- Phone and computer on same WiFi
- Try typing URL manually in Expo Go

---

## 📱 WHAT YOU SHOULD SEE

### When Everything Works:
✅ Home screen shows 3 videos with images  
✅ Radio plays live stream  
✅ Bible returns verses  
✅ Notepad saves notes  
✅ About screen has links  
✅ No red error screens  

---

## 🎉 SUCCESS!

If all 5 tabs work, **Chunk 3 is complete!**

**Your church app is LIVE and functional! 🚀**

---

## 📞 Need Help?

**Common Commands:**
```bash
# Restart backend
cd rhm-backend
npm run dev

# Restart mobile app
cd RHM
npm start

# Clear cache (if issues)
expo start -c
```

**Check These:**
1. Backend shows "Server running on port 5000"
2. Supabase has sample videos (check Table Editor)
3. API URL in `api.ts` has your IP
4. Phone and computer on same WiFi

---

**Ready to test? Follow the 3 critical steps above! 🚀**
