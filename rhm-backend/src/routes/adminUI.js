import express from 'express';
import supabase from '../utils/supabaseClient.js';
import { checkForNewVideos } from '../services/youtubeService.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();

// Security constants
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 5000;

/**
 * Sanitize user input to prevent XSS
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  // Remove HTML tags and dangerous characters
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>'"]/g, '')
    .trim()
    .slice(0, MAX_CONTENT_LENGTH);
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Configure multer storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
// Ensure uploads directory exists
try { fs.mkdirSync(uploadDir, { recursive: true }); } catch { }

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

// File filter for security
const fileFilter = (_req, file, cb) => {
  if (file.fieldname === 'audio') {
    if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype) && !file.originalname.match(/\.(mp3|mpeg|mpga|wav|m4a|aac|ogg|flac)$/i)) {
      return cb(new Error('Invalid audio type. Supported: MP3, MPEG, WAV, M4A, AAC, OGG, FLAC'), false);
    }
  } else {
    // Images (cover or slideshow)
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 2
  }
});

// Admin UI - Dashboard
router.get('/', async (req, res) => {
  try {
    const { data: images } = await supabase
      .from('admin_content')
      .select('*')
      .eq('type', 'radio_slideshow')
      .order('published_at', { ascending: false });

    // Fetch Music
    const { data: music } = await supabase
      .from('music')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch Breaking News
    const { data: news } = await supabase
      .from('breaking_news')
      .select('*')
      .order('created_at', { ascending: false });



    const { data: settings } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single();

    res.render('admin', {
      images: images || [],
      music: music || [],
      news: news || [],
      settings: settings || { theme: 'default', radio_url: '', notification_enabled: true },
      settings: settings || { theme: 'default', radio_url: '', notification_enabled: true },
      message: req.query.message || '',
      error: req.query.error || '',
    });
  } catch (err) {
    res.status(500).send('Failed to load admin UI: ' + (err.message || err));
  }
});

// DEBUG ROUTE: Test Supabase Config
router.get('/test-config', async (req, res) => {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Test Storage
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    // Test DB
    const { data: dbData, error: dbError } = await supabase.from('app_settings').select('count', { count: 'exact', head: true });

    res.json({
      env: {
        url: url ? `Present (${url.substring(0, 15)}...)` : 'MISSING',
        key: key ? `Present (Starts: ${key.substring(0, 10)}... Ends: ${key.substring(key.length - 5)})` : 'MISSING',
        keyLength: key ? key.length : 0
      },
      tests: {
        storage: bucketError ? { success: false, error: bucketError } : { success: true, buckets: buckets?.map(b => b.name) },
        database: dbError ? { success: false, error: dbError } : { success: true, count: dbData }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Upload slideshow image via file (multipart)
router.post('/upload-file', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) throw new Error('No file uploaded');

    // Sanitize inputs
    const title = sanitizeInput(req.body.title || 'Slide');
    const content = sanitizeInput(req.body.content || '');

    // Validate lengths
    if (title.length > MAX_TITLE_LENGTH) {
      throw new Error('Title too long');
    }

    // Upload to Supabase Storage instead of local filesystem
    const fileExt = path.extname(req.file.originalname);
    const fileName = `slideshow-${Date.now()}-${Math.random().toString(36).slice(2)}${fileExt}`;
    const fileBuffer = fs.readFileSync(req.file.path);

    const { data, error: uploadError } = await supabase.storage
      .from('news_media')
      .upload(fileName, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('news_media')
      .getPublicUrl(fileName);

    if (!publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    console.log(`✅ Slideshow image uploaded: ${publicUrl}`);

    // Clean up temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.error('Failed to cleanup temp file:', e);
    }

    // Insert into database with Supabase URL
    const { error } = await supabase
      .from('admin_content')
      .insert([{
        type: 'radio_slideshow',
        title,
        content,
        media_url: publicUrl
      }]);

    if (error) {
      console.error('❌ Database insert error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    res.redirect('/admin-ui?message=' + encodeURIComponent('Slide uploaded successfully'));
  } catch (err) {
    console.error('❌ Slideshow upload error:', err);
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch { }
    }
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Upload failed'));
  }
});

// Upload slideshow image via URL
router.post('/upload', async (req, res) => {
  try {
    const { media_url } = req.body;

    // Validate URL
    if (!media_url || !isValidUrl(media_url)) {
      throw new Error('Valid media_url is required');
    }

    // Sanitize inputs
    const title = sanitizeInput(req.body.title || 'Slide');
    const content = sanitizeInput(req.body.content || '');

    // Validate lengths
    if (title.length > MAX_TITLE_LENGTH) {
      throw new Error('Title too long');
    }

    const { error } = await supabase
      .from('admin_content')
      .insert([{
        type: 'radio_slideshow',
        title,
        content,
        media_url
      }]);

    if (error) throw error;
    res.redirect('/admin-ui?message=' + encodeURIComponent('Slide added successfully'));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Failed to add slide'));
  }
});

// Delete slideshow image
router.post('/delete', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) throw new Error('id is required');

    const { error } = await supabase
      .from('admin_content')
      .delete()
      .eq('id', id);
    if (error) throw error;

    res.redirect('/admin-ui?message=' + encodeURIComponent('Slide deleted'));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Delete failed'));
  }
});

// Update settings
router.post('/settings', async (req, res) => {
  try {
    let { radio_url, theme, notification_enabled } = req.body;

    // Validate radio URL if provided
    if (radio_url && !isValidUrl(radio_url)) {
      throw new Error('Invalid radio URL format');
    }

    // Sanitize theme
    const allowedThemes = ['default', 'light', 'dark'];
    if (theme && !allowedThemes.includes(theme)) {
      theme = 'default';
    }

    // Find existing
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1)
      .single();

    let result;
    const updateData = {
      radio_url: radio_url || null,
      theme: theme || 'default',
      notification_enabled: typeof notification_enabled !== 'undefined',
    };

    if (existing) {
      result = await supabase
        .from('app_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('app_settings')
        .insert([updateData])
        .select()
        .single();
    }
    if (result.error) throw result.error;

    res.redirect('/admin-ui?message=' + encodeURIComponent('Settings updated'));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Settings update failed'));
  }
});

// Send push notification to all users (rate limited)
router.post('/send-notification', rateLimiter(3, 60000), async (req, res) => {
  try {
    const { title, body } = req.body;

    if (!title || !body) {
      throw new Error('Title and body are required');
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedBody = sanitizeInput(body);

    if (sanitizedTitle.length > MAX_TITLE_LENGTH || sanitizedBody.length > MAX_CONTENT_LENGTH) {
      throw new Error('Title or body too long');
    }

    // Import notification service
    const { sendNotificationToAll } = await import('../services/pushNotificationService.js');

    // Send notification
    const result = await sendNotificationToAll(sanitizedTitle, sanitizedBody, {
      type: 'admin_message',
      screen: 'Home',
    });

    if (result.success) {
      const count = result.tickets?.length || 0;
      res.redirect('/admin-ui?message=' + encodeURIComponent(`Notification sent to ${count} devices`));
    } else {
      throw new Error(result.error || 'Failed to send notification');
    }
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Notification send failed'));
  }
});

// Upload Music Track (Audio + Cover)
router.post('/music/upload', upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    if (!req.files || !req.files.audio) throw new Error('Audio file is required');

    const audioFile = req.files.audio[0];
    const coverFile = req.files.cover ? req.files.cover[0] : null;

    // Sanitize inputs
    const title = sanitizeInput(req.body.title || audioFile.originalname);
    const artist = sanitizeInput(req.body.artist || 'Unknown Artist');
    const album = sanitizeInput(req.body.album || '');

    // Helper to upload to Supabase Storage
    const uploadToSupabase = async (file, bucket) => {
      const fileExt = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${fileExt}`;
      const filePath = file.path;
      const fileBuffer = fs.readFileSync(filePath);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Supabase Upload Error:', error);
        throw error;
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return publicUrl;
    };

    // Upload Audio - NO FALLBACK, must succeed
    let audioUrl = '';
    try {
      audioUrl = await uploadToSupabase(audioFile, 'music_files');
      console.log(`✅ Audio uploaded successfully: ${audioUrl}`);
    } catch (e) {
      console.error('❌ Audio upload failed:', e);
      throw new Error(`Audio upload failed: ${e.message}. Please check Supabase Storage bucket 'music_files' exists and is public.`);
    }

    // Upload Cover (if exists) - Optional, can continue without it
    let coverUrl = null;
    if (coverFile) {
      try {
        coverUrl = await uploadToSupabase(coverFile, 'music_covers');
        console.log(`✅ Cover uploaded successfully: ${coverUrl}`);
      } catch (e) {
        console.error('⚠️ Cover upload failed (continuing without cover):', e);
        // Cover is optional, so we can continue without it
      }
    }

    // Clean up local temp files
    try {
      fs.unlinkSync(audioFile.path);
      if (coverFile) fs.unlinkSync(coverFile.path);
    } catch (e) {
      console.error('Failed to cleanup temp files:', e);
    }

    // Insert into DB
    const { error: dbError } = await supabase
      .from('music')
      .insert([{
        title,
        artist,
        album,
        audio_url: audioUrl,
        cover_url: coverUrl,
        duration: 0 // Duration detection would require 'music-metadata' or similar
      }]);

    if (dbError) {
      console.error('❌ Music DB Insert Error:', JSON.stringify(dbError, null, 2));
      throw new Error(`Database insert failed: ${dbError.message}. Check RLS policies on music table.`);
    }

    console.log('✅ Music track inserted successfully into database');
    res.redirect('/admin-ui?message=' + encodeURIComponent('Music track uploaded successfully!'));
  } catch (err) {
    // Cleanup if simplified
    if (req.files) {
      if (req.files.audio) try { fs.unlinkSync(req.files.audio[0].path); } catch { }
      if (req.files.cover) try { fs.unlinkSync(req.files.cover[0].path); } catch { }
    }
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Music upload failed'));
  }
});

// Delete Music Track
router.post('/music/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const { error } = await supabase.from('music').delete().eq('id', id);
    if (error) throw error;
    res.redirect('/admin-ui?message=' + encodeURIComponent('Track deleted'));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Delete failed'));
  }
});

// Trigger YouTube sync
router.post('/sync', async (req, res) => {
  try {
    const count = await checkForNewVideos();
    res.redirect('/admin-ui?message=' + encodeURIComponent(`YouTube sync done. ${count} videos processed`));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'YouTube sync failed'));
  }
});

// --- Breaking News Management ---

// Create Breaking News Post
router.post('/news/create', upload.single('media'), async (req, res) => {
  try {
    const { type, content, poll_options_text, link_url } = req.body;
    let media_url = req.body.media_url_input || null;

    if (!type) throw new Error('Post type is required');

    // Handle File Upload
    if (req.file) {
      const fileExt = path.extname(req.file.originalname);
      const fileName = `news-${Date.now()}${fileExt}`;
      const filePath = req.file.path;
      const fileBuffer = fs.readFileSync(filePath);

      // Try uploading to 'news_media' bucket
      const { data, error } = await supabase.storage
        .from('news_media')
        .upload(fileName, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('news_media').getPublicUrl(fileName);
        media_url = publicUrl;
        console.log(`✅ Breaking news media uploaded: ${publicUrl}`);
      } else {
        console.error('❌ Supabase storage upload error:', JSON.stringify(error, null, 2));
        throw new Error(`Media upload failed: ${error.message}. Check that 'news_media' bucket exists and is public.`);
      }

      try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to cleanup temp file:', e); }
    }

    // Handle Poll options
    let poll_options = null;
    if (type === 'poll' && poll_options_text) {
      // Expecting comma-separated or newline-separated values
      const options = poll_options_text.split(/[,\n]+/).map(o => o.trim()).filter(Boolean);
      if (options.length < 2) throw new Error('Poll must have at least 2 options');
      poll_options = options.map((text, index) => ({ id: index, text, votes: 0 }));
    }

    const { error } = await supabase
      .from('breaking_news')
      .insert([{
        type,
        content: sanitizeInput(content),
        media_url,
        poll_options,
        link_url: type === 'link' ? sanitizeInput(link_url || '') : null,
      }]);

    if (error) {
      console.error('❌ Breaking News DB Insert Error:', JSON.stringify(error, null, 2));
      throw new Error(`Database insert failed: ${error.message}. Check RLS policies on breaking_news table.`);
    }

    console.log('✅ Breaking news posted successfully to database');
    res.redirect('/admin-ui?message=' + encodeURIComponent('News posted successfully'));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Failed to post news'));
  }
});

// Delete Breaking News
router.post('/news/delete', async (req, res) => {
  try {
    const { id } = req.body;
    const { error } = await supabase.from('breaking_news').delete().eq('id', id);
    if (error) throw error;
    res.redirect('/admin-ui?message=' + encodeURIComponent('Post deleted'));
  } catch (err) {
    res.redirect('/admin-ui?error=' + encodeURIComponent(err.message || 'Delete failed'));
  }
});

export default router;
