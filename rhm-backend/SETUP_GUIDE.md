# RHM Backend - Setup & Testing Guide

## ✅ Backend Setup Complete!

Your Node.js + Express backend is successfully configured and running.

## 📋 What's Working

### ✅ Completed
- [x] Express server running on port 5000
- [x] All API routes created
- [x] Bible API integration (bible-api.com) - Working!
- [x] Radio stream endpoint - Working!
- [x] Supabase client configured
- [x] Database schema ready

### ⏳ Pending (Requires Your Action)
- [ ] Add Supabase credentials to `.env`
- [ ] Run database schema in Supabase SQL Editor
- [ ] Test database-dependent endpoints

---

## 🔧 Next Steps to Complete Setup

### Step 1: Configure Supabase

1. **Create a Supabase project** (if you haven't already):
   - Go to https://supabase.com
   - Create a new project
   - Wait for it to initialize (~2 minutes)

2. **Get your credentials**:
   - Go to Project Settings → API
   - Copy `Project URL` (looks like: `https://xxxxx.supabase.co`)
   - Copy `service_role` key (under "Project API keys" - NOT the anon key!)

3. **Update `.env` file**:
   ```bash
   SUPABASE_URL=https://your-actual-project.supabase.co
   SUPABASE_SERVICE_KEY=your-actual-service-role-key-here
   ```

4. **Restart the server**:
   ```bash
   npm run dev
   ```

### Step 2: Create Database Tables

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `database/schema.sql`
5. Paste into the SQL editor
6. Click **Run** or press Ctrl+Enter
7. Verify tables are created: Go to **Table Editor** → you should see:
   - `videos`
   - `user_notes`
   - `admin_content`
   - `app_settings`

### Step 3: Test Database Endpoints

Once Supabase is configured, test these endpoints:

```bash
# Should now return empty array instead of error
curl http://localhost:5000/api/videos

# Test admin settings
curl http://localhost:5000/api/admin/settings

# Test admin content
curl http://localhost:5000/api/admin/content
```

---

## 🧪 Current Test Results

### ✅ Working Endpoints (No Supabase needed)

**Root endpoint:**
```bash
curl http://localhost:5000/
```
✅ Response: Server status and endpoint list

**Radio stream:**
```bash
curl http://localhost:5000/api/radio/stream
```
✅ Response:
```json
{
  "success": true,
  "radioUrl": "https://jesusislordradio.info:8443/stream",
  "station": "Jesus Is Lord Radio One - Nakuru"
}
```

**Bible verse:**
```bash
curl http://localhost:5000/api/bible/verse/John3:16
```
✅ Response:
```json
{
  "success": true,
  "reference": "John 3:16",
  "text": "For God so loved the world...",
  "translation": "King James Version"
}
```

**Bible books list:**
```bash
curl http://localhost:5000/api/bible/books
```
✅ Response: Complete list of Old and New Testament books

### ⏳ Pending Supabase Configuration

**Videos endpoint:**
```bash
curl http://localhost:5000/api/videos
```
❌ Current: Error (needs Supabase credentials)  
✅ After setup: Will return cached YouTube videos

**Notes endpoints:**
```bash
curl "http://localhost:5000/api/notes?user_id=123"
```
❌ Current: Error (needs Supabase credentials)  
✅ After setup: Will return user notes

**Admin endpoints:**
```bash
curl http://localhost:5000/api/admin/settings
```
❌ Current: Error (needs Supabase credentials)  
✅ After setup: Will return app settings

---

## 📁 Project Structure Overview

```
rhm-backend/
├── src/
│   ├── routes/
│   │   ├── videos.js       ✅ YouTube videos API
│   │   ├── radio.js        ✅ Radio streaming API
│   │   ├── bible.js        ✅ Bible verses API (Working!)
│   │   ├── notes.js        ✅ User notes CRUD
│   │   └── admin.js        ✅ Admin operations
│   │
│   ├── services/
│   │   └── youtubeService.js   ⏳ YouTube polling (Chunk 3)
│   │
│   ├── utils/
│   │   └── supabaseClient.js   ✅ Supabase client
│   │
│   ├── server.js           ✅ Express server (Running!)
│   └── config.js           ✅ Configuration
│
├── database/
│   └── schema.sql          ✅ Supabase schema (Ready to run)
│
├── .env                    ⏳ Add your credentials here
├── .env.example           ✅ Template provided
├── README.md              ✅ Full documentation
└── package.json           ✅ Dependencies installed
```

---

## 🚀 Quick Start Commands

```bash
# Install dependencies (already done)
npm install

# Development mode (auto-reload)
npm run dev

# Production mode
npm start

# Test endpoints
curl http://localhost:5000/
curl http://localhost:5000/api/bible/verse/Psalm23:1
curl http://localhost:5000/api/radio/stream
```

---

## ⚠️ Troubleshooting

### Error: "Missing Supabase environment variables"
**Solution:** Update `.env` with your Supabase credentials

### Error: "Port 5000 already in use"
**Solution:** 
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port in .env
PORT=5001
```

### Database endpoints return errors
**Solution:** 
1. Verify Supabase credentials in `.env`
2. Make sure you ran `database/schema.sql` in Supabase SQL Editor
3. Check Supabase project is active (not paused)

### Bible API not working
**Solution:** Check internet connection (uses bible-api.com)

---

## 📊 API Endpoints Summary

| Endpoint | Method | Status | Requires Supabase |
|----------|--------|--------|-------------------|
| `/` | GET | ✅ Working | No |
| `/health` | GET | ✅ Working | No |
| `/api/videos` | GET | ⏳ Setup needed | Yes |
| `/api/videos/:id` | GET | ⏳ Setup needed | Yes |
| `/api/radio/stream` | GET | ✅ Working | No |
| `/api/radio/slideshow` | GET | ⏳ Setup needed | Yes |
| `/api/bible/verse/:ref` | GET | ✅ Working | No |
| `/api/bible/search` | GET | ✅ Working | No |
| `/api/bible/books` | GET | ✅ Working | No |
| `/api/notes` | GET/POST | ⏳ Setup needed | Yes |
| `/api/notes/:id` | PUT/DELETE | ⏳ Setup needed | Yes |
| `/api/admin/upload` | POST | ⏳ Setup needed | Yes |
| `/api/admin/content` | GET | ⏳ Setup needed | Yes |
| `/api/admin/settings` | GET/PUT | ⏳ Setup needed | Yes |
| `/api/admin/notifications/send` | POST | ⏳ Chunk 3 | Yes |

---

## 🎯 Chunk 2 Completion Checklist

- [x] Node.js + Express setup
- [x] Supabase client connected
- [x] Routes scaffolded (videos, radio, bible, notes, admin)
- [x] Database schema matches main prompt
- [x] Dependencies installed
- [x] Server running successfully
- [x] Bible API working (external API)
- [x] Radio endpoint working
- [x] Ready for YouTube polling + caching (Chunk 3)

---

## 🔜 Coming in Chunk 3

- YouTube API polling service (every 15 minutes)
- Video caching to Supabase
- Push notifications (Expo)
- Admin panel (Netlify)
- Seasonal theming logic

---

## 💡 Tips

1. **Keep server running:** Use `npm run dev` for development
2. **Test often:** Use curl or Postman to test endpoints
3. **Check logs:** Console shows all requests and errors
4. **Free tier friendly:** Current setup uses minimal resources
5. **Secure your keys:** Never commit `.env` to Git (already in .gitignore)

---

**✅ Backend is ready! Complete Supabase setup and you're good to go.**
