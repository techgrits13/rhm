# RHM Church App - Backend API

Backend service for the RHM Church mobile application. Provides REST API endpoints for videos, radio streaming, Bible access, notes management, and admin operations.

## 🚀 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Cron Jobs:** node-cron (for YouTube polling)
- **HTTP Client:** Axios

## 📁 Project Structure

```
rhm-backend/
├── src/
│   ├── routes/
│   │   ├── videos.js      # YouTube video endpoints
│   │   ├── radio.js       # Radio streaming endpoints
│   │   ├── bible.js       # Bible verse endpoints
│   │   ├── notes.js       # User notes CRUD
│   │   └── admin.js       # Admin operations
│   │
│   ├── services/
│   │   └── youtubeService.js   # YouTube API integration
│   │
│   ├── utils/
│   │   └── supabaseClient.js   # Supabase client setup
│   │
│   ├── server.js          # Express server
│   └── config.js          # Configuration
│
├── database/
│   └── schema.sql         # Supabase database schema
│
├── .env                   # Environment variables
├── .env.example          # Environment template
└── package.json
```

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (from project settings)
- `PORT` - Server port (default: 5000)

### 3. Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/schema.sql`
4. Run the SQL script to create tables and policies

### 4. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## 📡 API Endpoints

### Base URL
```
http://localhost:5000
```

### Videos
- `GET /api/videos` - Get all cached YouTube videos
- `GET /api/videos/:id` - Get specific video by ID

### Radio
- `GET /api/radio/stream` - Get radio stream URL
- `GET /api/radio/slideshow` - Get slideshow images

### Bible
- `GET /api/bible/verse/:reference` - Get Bible verse (e.g., `John3:16`)
- `GET /api/bible/search?query=love` - Search Bible verses
- `GET /api/bible/books` - Get list of Bible books

### Notes
- `GET /api/notes?user_id=xxx` - Get user's notes
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Admin
- `POST /api/admin/upload` - Upload custom content
- `GET /api/admin/content` - Get admin content
- `DELETE /api/admin/content/:id` - Delete content
- `POST /api/admin/notifications/send` - Send push notification
- `GET /api/admin/settings` - Get app settings
- `PUT /api/admin/settings` - Update app settings

### Health Check
- `GET /` - Server status and endpoints
- `GET /health` - Health check

## 🧪 Testing Endpoints

Using curl:

```bash
# Get server status
curl http://localhost:5000/

# Get videos
curl http://localhost:5000/api/videos

# Get radio stream
curl http://localhost:5000/api/radio/stream

# Get Bible verse
curl http://localhost:5000/api/bible/verse/John3:16

# Get Bible books
curl http://localhost:5000/api/bible/books
```

Using browser:
- http://localhost:5000/api/videos
- http://localhost:5000/api/radio/stream
- http://localhost:5000/api/bible/verse/Psalm23:1

## 🗃️ Database Schema

### Tables

1. **videos** - Cached YouTube video metadata
   - `id, video_id, title, description, thumbnail_url, published_at, channel_id`

2. **user_notes** - User notepad entries
   - `id, user_id, title, content, created_at, updated_at`

3. **admin_content** - Custom admin uploads
   - `id, type, title, content, media_url, published_at`

4. **app_settings** - Global app configuration
   - `id, theme, radio_url, notification_enabled`

### Row Level Security (RLS)

- Videos: Public read access
- User Notes: Users can only access their own notes
- Admin Content: Public read access
- App Settings: Public read access

## 🔐 Security

- Environment variables for sensitive data
- Supabase Row Level Security (RLS) enabled
- CORS configured for mobile app access
- Service role key used for server-side operations

## 📦 Free Tier Services

This backend is designed to stay within free tier limits:

- **Supabase:** 500MB database, 2GB bandwidth
- **Railway/Render:** 500 hours/month free hosting
- **YouTube API:** 10,000 units/day (with smart polling)

## 🚧 Coming in Next Chunks

- YouTube API polling service (every 15 mins)
- Push notifications integration (Expo)
- Admin authentication
- Video caching optimization
- Offline data sync

## 📝 Notes

- Bible verses use free bible-api.com (KJV translation)
- Radio URL can be updated via admin settings
- YouTube polling will be implemented in Chunk 3
- All timestamps are in UTC

## 🐛 Troubleshooting

### Port already in use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Supabase connection error
- Verify SUPABASE_URL and SUPABASE_SERVICE_KEY in `.env`
- Check if Supabase project is active
- Ensure database schema is created

### Module not found errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

This project is part of the RHM Church mobile app ecosystem.
