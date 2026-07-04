import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

// Import routes
import videosRoute from './routes/videos.js';
import radioRoute from './routes/radio.js';
import bibleRoute from './routes/bible.js';
import notesRoute from './routes/notes.js';
import adminRoute from './routes/admin.js';
import adminUIRoute from './routes/adminUI.js';
import notificationsRoute from './routes/notifications.js';
import musicRoute from './routes/music.js';
import breakingNewsRoute from './routes/breakingNews.js';
import analyticsRoute from './routes/analytics.js';
import adminAuth from './middleware/adminAuth.js';
import mobileAdminRoute from './routes/mobileAdmin.js';

// Import YouTube scheduler
import './jobs/scheduler.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Views and static
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// CRITICAL: app-ads.txt route MUST be before other routes
// This is required by Google AdMob for ad authorization
app.get('/app-ads.txt', (req, res) => {
  console.log('✅ app-ads.txt requested - serving directly');
  res.set({
    'Content-Type': 'text/plain',
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*'
  });
  res.send('google.com, pub-3848557016813463, DIRECT, f08c47fec0942fa0');
});

// API Routes
app.use('/api/videos', videosRoute);
app.use('/api/radio', radioRoute);
app.use('/api/bible', bibleRoute);
app.use('/api/notes', notesRoute);
app.use('/api/admin', adminRoute);
app.use('/api/notifications', notificationsRoute);
app.use('/api/music', musicRoute);
app.use('/api/breaking-news', breakingNewsRoute);
app.use('/api/analytics', analyticsRoute);
app.use('/api/mobile-admin', mobileAdminRoute); // Mobile admin uploads (no auth)
app.use('/admin-ui', adminAuth, adminUIRoute);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '✅ RHM Backend is running successfully',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      videos: '/api/videos',
      radio: '/api/radio/stream',
      bible: '/api/bible/verse/:reference',
      notes: '/api/notes',
      admin: '/api/admin'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🌐 API available at: http://localhost:${PORT}`);
});

// Global Process Safety Nets
process.on('uncaughtException', (err) => {
  console.error('🔥 CRITICAL: Uncaught Exception:', err);
  // In production, we might want to restart, but for now we keep it alive
  // to prevent a hard crash loop if it's minor.
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});
