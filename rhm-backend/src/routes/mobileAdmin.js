import express from 'express';
import supabase from '../utils/supabaseClient.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();

// Security constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_CONTENT_LENGTH = 5000;

/**
 * Sanitize user input
 */
function sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';
    return input
        .replace(/<[^>]*>/g, '')
        .replace(/[<>'"\\/]/g, '')
        .trim()
        .slice(0, MAX_CONTENT_LENGTH);
}

// Configure multer
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
try { fs.mkdirSync(uploadDir, { recursive: true }); } catch { }

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/quicktime', 'video/x-msvideo',
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`));
        }
    }
});

/**
 * Upload Breaking News (Mobile)
 */
router.post('/breaking-news', upload.single('media'), async (req, res) => {
    try {
        const { type, content, poll_options_text, link_url } = req.body;
        let media_url = null;

        if (!type) {
            return res.status(400).json({ success: false, error: 'Post type is required' });
        }

        // Handle File Upload
        if (req.file) {
            const fileExt = path.extname(req.file.originalname);
            const fileName = `news-${Date.now()}${fileExt}`;
            const filePath = req.file.path;
            const fileBuffer = fs.readFileSync(filePath);

            const { data, error } = await supabase.storage
                .from('news_media')
                .upload(fileName, fileBuffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (error) {
                console.error('❌ Supabase storage upload error:', error);
                try { fs.unlinkSync(filePath); } catch { }
                return res.status(500).json({
                    success: false,
                    error: `Media upload failed: ${error.message}`
                });
            }

            const { data: { publicUrl } } = supabase.storage.from('news_media').getPublicUrl(fileName);
            media_url = publicUrl;
            console.log(`✅ Breaking news media uploaded: ${publicUrl}`);

            try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to cleanup temp file:', e); }
        }

        // Handle Poll options
        let poll_options = null;
        if (type === 'poll' && poll_options_text) {
            const options = poll_options_text.split(/[,\n]+/).map(o => o.trim()).filter(Boolean);
            if (options.length < 2) {
                return res.status(400).json({ success: false, error: 'Poll must have at least 2 options' });
            }
            poll_options = options.map((text, index) => ({ id: index, text, votes: 0 }));
        }

        const { error: dbError } = await supabase
            .from('breaking_news')
            .insert([{
                type,
                content: sanitizeInput(content),
                media_url,
                poll_options,
                link_url: type === 'link' ? sanitizeInput(link_url || '') : null,
            }]);

        if (dbError) {
            console.error('❌ Breaking News DB Insert Error:', dbError);
            return res.status(500).json({
                success: false,
                error: `Database insert failed: ${dbError.message}`
            });
        }

        console.log('✅ Breaking news posted successfully (mobile)');
        res.json({ success: true, message: 'News posted successfully' });
    } catch (err) {
        console.error('❌ Mobile breaking news upload error:', err);
        if (req.file) try { fs.unlinkSync(req.file.path); } catch { }
        res.status(500).json({ success: false, error: err.message || 'Upload failed' });
    }
});

/**
 * Upload Music Track (Mobile)
 */
router.post('/music', upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), async (req, res) => {
    try {
        if (!req.files || !req.files.audio) {
            return res.status(400).json({ success: false, error: 'Audio file is required' });
        }

        const audioFile = req.files.audio[0];
        const coverFile = req.files.cover ? req.files.cover[0] : null;

        const title = sanitizeInput(req.body.title || audioFile.originalname);
        const artist = sanitizeInput(req.body.artist || 'Unknown Artist');
        const album = sanitizeInput(req.body.album || '');

        // Upload to Supabase Storage
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

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            return publicUrl;
        };

        // Upload Audio
        let audioUrl = '';
        try {
            audioUrl = await uploadToSupabase(audioFile, 'music_files');
            console.log(`✅ Audio uploaded successfully: ${audioUrl}`);
        } catch (e) {
            console.error('❌ Audio upload failed:', e);
            if (req.files.audio) try { fs.unlinkSync(req.files.audio[0].path); } catch { }
            if (coverFile) try { fs.unlinkSync(coverFile.path); } catch { }
            return res.status(500).json({
                success: false,
                error: `Audio upload failed: ${e.message}`
            });
        }

        // Upload Cover (optional)
        let coverUrl = null;
        if (coverFile) {
            try {
                coverUrl = await uploadToSupabase(coverFile, 'music_covers');
                console.log(`✅ Cover uploaded successfully: ${coverUrl}`);
            } catch (e) {
                console.error('⚠️ Cover upload failed (continuing without cover):', e);
            }
        }

        // Cleanup temp files
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
                duration: 0
            }]);

        if (dbError) {
            console.error('❌ Music DB Insert Error:', dbError);
            return res.status(500).json({
                success: false,
                error: `Database insert failed: ${dbError.message}`
            });
        }

        console.log('✅ Music track inserted successfully (mobile)');
        res.json({ success: true, message: 'Music uploaded successfully' });
    } catch (err) {
        console.error('❌ Mobile music upload error:', err);
        if (req.files) {
            if (req.files.audio) try { fs.unlinkSync(req.files.audio[0].path); } catch { }
            if (req.files.cover) try { fs.unlinkSync(req.files.cover[0].path); } catch { }
        }
        res.status(500).json({ success: false, error: err.message || 'Upload failed' });
    }
});

export default router;
