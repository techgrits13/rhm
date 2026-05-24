# 🎯 Build AAB for Google Play Store

## ✅ Configuration Updated!

I've configured your `eas.json` to build:
- **Preview Profile:** APK (for testing)
- **Production Profile:** AAB (for Play Store)

---

## 🚀 Build Production AAB Now:

### **Step 1: Navigate to App Folder**
```bash
cd c:\Users\esir\RHM\RHM
```

### **Step 2: Build AAB for Production**
```bash
npx eas-cli build --platform android --profile production
```

This will:
- ✅ Build Android App Bundle (.aab)
- ✅ Use production backend URL
- ✅ Auto-increment version number
- ✅ Sign with your keystore
- ✅ Ready for Play Store upload

---

## ⏱️ Build Time:

- **Expected:** 15-20 minutes
- **Output:** `.aab` file (Android App Bundle)
- **You'll get:** Email with download link

---

## 📱 What to Do After Build:

### **1. Download AAB File**
- Check email from Expo
- Or visit: https://expo.dev/accounts/415_415/projects/RHM/builds
- Download the `.aab` file

### **2. Go to Play Console**
- Visit: https://play.google.com/console
- Select your app (or create new one)
- Go to "Production" → "Create new release"

### **3. Upload AAB**
- Click "Upload"
- Select your `.aab` file
- Fill in release notes
- Click "Review release"

### **4. Submit for Review**
- Review all details
- Click "Start rollout to Production"
- Wait for Google review (~1-3 days)

---

## 📋 Play Store Requirements Checklist:

Before uploading, make sure you have:

### **App Listing:**
- [ ] App name: "RHM Church App"
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] App icon (512x512 PNG)
- [ ] Feature graphic (1024x500)
- [ ] At least 2 screenshots (phone)
- [ ] Privacy policy URL

### **Store Listing Details:**
- [ ] App category: Lifestyle or Religion
- [ ] Content rating completed
- [ ] Target audience set
- [ ] Contact email
- [ ] Website URL (optional)

### **Technical:**
- [ ] AAB file uploaded
- [ ] App signing by Google Play enabled
- [ ] Version code correct
- [ ] Minimum SDK set (API 21+)

### **Compliance:**
- [ ] Privacy policy added
- [ ] Data safety form completed
- [ ] AdMob usage declared
- [ ] Permissions explained

---

## 🎯 Version Information:

Your app.json currently has:
```json
{
  "version": "1.0.0",
  "versionCode": (auto-incremented by EAS)
}
```

EAS will automatically increment the version code with each build.

---

## 💰 AdMob Setup for Play Store:

After app is live, link AdMob:

1. **In AdMob Console:**
   - Go to Apps
   - Click "Link app to app store"
   - Enter Play Store URL
   - Link your app

2. **Verify app-ads.txt:**
   - AdMob will re-verify
   - Your file is already working: https://rhm-backend-1.onrender.com/app-ads.txt
   - Should be approved automatically

---

## 🔍 Build Profiles Explained:

| Profile | Output | Use Case |
|---------|--------|----------|
| **preview** | APK | Testing on devices |
| **production** | AAB | Play Store submission |
| **development** | Dev client | Local development |

---

## 📊 What's Included in Your AAB:

✅ **All Working Features:**
- Home screen with 70+ videos
- Radio streaming
- Bible search + history + highlighting + sharing
- Personal notepad (local storage)
- About screen
- AdMob ads (Banners + App Open)

✅ **Production Configuration:**
- Backend: https://rhm-backend-1.onrender.com/api
- Package: com.rhm.app
- AdMob: ca-app-pub-3848557016813463~4336808867
- Ads enabled: true

✅ **No Crashes:**
- Firebase disabled (safe)
- All features tested
- Production-ready

---

## 🎉 After Play Store Approval:

1. **Users can download** from Play Store
2. **Ads start serving** immediately
3. **You start earning** from AdMob
4. **Videos auto-update** every 15 minutes
5. **Users enjoy** the full experience

---

## 🚀 BUILD COMMAND (Copy & Paste):

```bash
cd c:\Users\esir\RHM\RHM
npx eas-cli build --platform android --profile production
```

**This builds AAB for Play Store submission! 🎯**

---

## 💡 Pro Tips:

1. **First Time Submission:**
   - Takes 1-3 days for review
   - Be patient
   - Check email for updates

2. **Updates Later:**
   - Just rebuild with production profile
   - Upload new AAB
   - Usually approved in hours (not days)

3. **Testing:**
   - Use "Internal testing" track first
   - Test with small group
   - Then promote to Production

4. **Versioning:**
   - EAS auto-increments version code
   - Update version string manually in app.json if needed

---

## 📧 What You'll Get:

**From EAS Build:**
- Email: "Your build is complete!"
- Link to download AAB
- Build logs and details

**From Play Console (after upload):**
- "App bundle analyzed successfully"
- Version code confirmed
- Release ready to review

**From Google (after submission):**
- "App approved for production"
- App is live on Play Store!
- Users can download

---

## ✅ YOU'RE READY!

Your app is:
- ✅ Tested and working
- ✅ Configured for AAB build
- ✅ Production backend connected
- ✅ AdMob ready
- ✅ No crashes
- ✅ Ready for Play Store!

**GO BUILD YOUR AAB NOW! 🚀**
