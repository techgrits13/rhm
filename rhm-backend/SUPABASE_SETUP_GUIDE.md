# Supabase Setup Guide - Fix Upload Issues

This guide will help you fix the upload issues where content appears in admin but not in the app.

## Problem Summary

- ✅ Admin uploads succeed (backend uses service role key)
- ❌ App cannot see uploaded content (frontend uses anon key, blocked by missing RLS policies)

---

## Step 1: Run SQL Migration

1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/kwaalveiuiarvldwtdbn
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `database/fix-upload-rls-policies.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify success: You should see "Success. No rows returned"

### Verification

Run this query in the SQL Editor to verify RLS policies were created:

```sql
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('music', 'breaking_news', 'news_reactions')
ORDER BY tablename, policyname;
```

**Expected Result**: Should return at least 5 rows (policies for each table)

---

## Step 2: Create Storage Buckets

### 2.1 Create `news_media` Bucket

1. In Supabase Dashboard, navigate to **Storage** (left sidebar)
2. Click **New bucket**
3. Configure:
   - **Name**: `news_media`
   - **Public bucket**: ✅ **ENABLED** (CRITICAL!)
   - **File size limit**: 50 MB
   - **Allowed MIME types**: Leave empty (allow all) or set to `image/*,video/*`
4. Click **Create bucket**

### 2.2 Create `music_files` Bucket

1. Click **New bucket**
2. Configure:
   - **Name**: `music_files`
   - **Public bucket**: ✅ **ENABLED** (CRITICAL!)
   - **File size limit**: 50 MB
   - **Allowed MIME types**: Leave empty or set to `audio/*`
3. Click **Create bucket**

### 2.3 Create `music_covers` Bucket

1. Click **New bucket**
2. Configure:
   - **Name**: `music_covers`
   - **Public bucket**: ✅ **ENABLED** (CRITICAL!)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: Leave empty or set to `image/*`
3. Click **Create bucket**

### Verification

Run this query in SQL Editor:

```sql
SELECT name, public FROM storage.buckets 
WHERE name IN ('news_media', 'music_files', 'music_covers');
```

**Expected Result**: 3 rows, all with `public = true`

---

## Step 3: Enable Realtime on Tables

1. In Supabase Dashboard, navigate to **Database** → **Replication** (left sidebar)
2. Find the **Realtime** section
3. Enable realtime for these tables:
   - ✅ `breaking_news`
   - ✅ `music`
   - ✅ `news_reactions` (optional, but recommended)
4. Click **Save**

---

## Step 4: Test the Fix

### Test 1: Upload Music Track

1. Navigate to your admin dashboard: https://your-backend.onrender.com/admin-ui
2. Login with your admin credentials
3. Scroll to **Section 6: Music Management**
4. Upload a test track:
   - **Title**: "Test Song"
   - **Artist**: "Test Artist"
   - **Audio**: Any MP3 file (small file recommended for testing)
5. Wait for success message: "Music track uploaded successfully!"
6. Open your app on mobile/emulator
7. Navigate to **Music List** screen (Worship Songs)
8. **VERIFY**: "Test Song" should appear in the list ✅

### Test 2: Upload Breaking News

1. In admin dashboard, scroll to **Section 7: Breaking News & Polls**
2. Create a text post:
   - **Type**: "Text Message"
   - **Content**: "Test announcement - if you see this, the fix worked!"
3. Click **Post to Feed**
4. Wait for success message: "News posted successfully"
5. Open your app
6. Navigate to **Breaking News** screen
7. **VERIFY**: "Test announcement" should appear at the top ✅

### Test 3: Realtime Updates (Optional)

1. Keep the app open on **Breaking News** screen
2. In admin dashboard, create another post: "Real-time test"
3. **VERIFY**: New post appears in app **without refreshing** ✅

---

## Troubleshooting

### Issue: "Storage upload failed" error in admin

**Cause**: Storage bucket doesn't exist or isn't public

**Fix**: 
1. Go to **Storage** in Supabase Dashboard
2. Verify all 3 buckets exist: `news_media`, `music_files`, `music_covers`
3. Click on each bucket → **Settings** → Verify "Public bucket" is **enabled**

---

### Issue: Upload succeeds but still doesn't appear in app

**Cause**: RLS policies not applied correctly

**Fix**:
1. Run the verification query from Step 1
2. If no policies returned, re-run the migration SQL
3. Clear app cache and restart

---

### Issue: "Database insert failed" error in admin

**Cause**: Missing tables or incorrect schema

**Fix**:
1. Run this query to check if tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('breaking_news', 'music', 'news_reactions');
```
2. If tables are missing, re-run the migration SQL

---

## Backend Logs

If issues persist, check your Render backend logs:

1. Go to https://dashboard.render.com
2. Select your backend service
3. Click **Logs**
4. Look for errors containing:
   - "Supabase upload error"
   - "Database insert error"
   - "RLS"

Share these logs if you need further assistance.

---

## Summary Checklist

- [ ] SQL migration executed successfully
- [ ] 3 storage buckets created and set to PUBLIC
- [ ] Realtime enabled on `breaking_news` and `music` tables
- [ ] Test music upload appears in app
- [ ] Test breaking news post appears in app
- [ ] Realtime updates working (optional)

Once all items are checked, your upload issues should be resolved! 🎉
