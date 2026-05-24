# Quick Deployment Checklist

Follow these steps to fix the upload issues:

## 1. Run SQL Migration (5 minutes)

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/kwaalveiuiarvldwtdbn
2. Go to **SQL Editor** → **New Query**
3. Copy contents of `rhm-backend/database/fix-upload-rls-policies.sql`
4. Paste and click **Run**
5. Verify: Run this query to confirm policies exist:
   ```sql
   SELECT tablename, policyname FROM pg_policies 
   WHERE tablename IN ('music', 'breaking_news', 'news_reactions');
   ```
   Should return 5+ rows

---

## 2. Create Storage Buckets (3 minutes)

1. In Supabase Dashboard, go to **Storage**
2. Create 3 PUBLIC buckets:
   - `news_media` (50MB limit, allow images/videos)
   - `music_files` (50MB limit, allow audio)
   - `music_covers` (10MB limit, allow images)
3. **CRITICAL**: Set each bucket to **Public** ✅
4. Verify: Run this query:
   ```sql
   SELECT name, public FROM storage.buckets 
   WHERE name IN ('news_media', 'music_files', 'music_covers');
   ```
   Should return 3 rows with `public = true`

---

## 3. Enable Realtime (1 minute)

1. Go to **Database** → **Replication**
2. Enable realtime for:
   - ✅ `breaking_news`
   - ✅ `music`
3. Click **Save**

---

## 4. Deploy Backend Changes (Optional)

The enhanced error logging is already in your code. If your backend is on Render:

```bash
cd rhm-backend
git add .
git commit -m "fix: add RLS policies and enhance error logging for uploads"
git push
```

Render will auto-deploy the changes.

---

## 5. Test the Fix (5 minutes)

### Test 1: Music Upload
1. Go to admin dashboard
2. Upload a test music track
3. Open app → Music List screen
4. **VERIFY**: Track appears ✅

### Test 2: Breaking News
1. In admin, create a text post
2. Open app → Breaking News screen
3. **VERIFY**: Post appears ✅

### Test 3: Realtime (Optional)
1. Keep app open on Breaking News
2. Create another post in admin
3. **VERIFY**: Appears without refresh ✅

---

## Troubleshooting

**If uploads still fail**, check Render logs:
1. Go to https://dashboard.render.com
2. Select your backend service
3. Click **Logs**
4. Look for new error messages:
   - "Check RLS policies on music table"
   - "Check that 'news_media' bucket exists and is public"

These will tell you exactly what's missing.

---

## Total Time: ~15 minutes

✅ SQL Migration  
✅ Storage Buckets  
✅ Realtime Enabled  
✅ Backend Deployed  
✅ Tested

**You're done!** 🎉
