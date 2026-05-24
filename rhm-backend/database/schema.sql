-- RHM Church App - Supabase Database Schema
-- Run these SQL scripts in the Supabase SQL Editor

-- ============================================
-- TABLE: videos
-- Purpose: Cache YouTube video data to avoid API quota limits
-- ============================================
CREATE TABLE IF NOT EXISTS videos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  video_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  channel_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);

-- ============================================
-- TABLE: user_notes
-- Purpose: Store user's personal notepad entries
-- ============================================
CREATE TABLE IF NOT EXISTS user_notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_updated_at ON user_notes(updated_at DESC);

-- ============================================
-- TABLE: admin_content
-- Purpose: Custom content uploaded by admin (announcements, slideshow images, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_content (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type TEXT NOT NULL, -- 'announcement', 'event', 'radio_slideshow', etc.
  title TEXT NOT NULL,
  content TEXT,
  media_url TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_admin_content_type ON admin_content(type);
CREATE INDEX IF NOT EXISTS idx_admin_content_published_at ON admin_content(published_at DESC);

-- ============================================
-- TABLE: app_settings
-- Purpose: Global app configuration settings
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  theme TEXT DEFAULT 'default',
  radio_url TEXT DEFAULT 'https://s3.radio.co/s97f38db97/listen',
  notification_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: music
-- Purpose: Store uploaded music tracks
-- ============================================
CREATE TABLE IF NOT EXISTS music (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT DEFAULT 'Unknown Artist',
  album TEXT,
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  lyrics TEXT,
  duration INTEGER DEFAULT 0, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sorting and text search
CREATE INDEX IF NOT EXISTS idx_music_title ON music(title);
CREATE INDEX IF NOT EXISTS idx_music_artist ON music(artist);
CREATE INDEX IF NOT EXISTS idx_music_created_at ON music(created_at DESC);

-- Insert default settings (only if table is empty)
INSERT INTO app_settings (theme, radio_url, notification_enabled)
SELECT 'default', 'https://s3.radio.co/s97f38db97/listen', TRUE
WHERE NOT EXISTS (SELECT 1 FROM app_settings LIMIT 1);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Videos: Public read access
CREATE POLICY "Public videos are viewable by everyone" 
  ON videos FOR SELECT 
  USING (true);

-- User Notes: Public access (no authentication required)
CREATE POLICY "Anyone can view notes" 
  ON user_notes FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can insert notes" 
  ON user_notes FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update notes" 
  ON user_notes FOR UPDATE 
  USING (true);

CREATE POLICY "Anyone can delete notes" 
  ON user_notes FOR DELETE 
  USING (true);

-- Admin Content: Public read access
CREATE POLICY "Public admin content is viewable by everyone" 
  ON admin_content FOR SELECT 
  USING (true);

-- App Settings: Public read access
CREATE POLICY "Public app settings are viewable by everyone" 
  ON app_settings FOR SELECT 
  USING (true);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- Auto-update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_notes
DROP TRIGGER IF EXISTS update_user_notes_updated_at ON user_notes;
CREATE TRIGGER update_user_notes_updated_at
  BEFORE UPDATE ON user_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for app_settings
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- INSERT INTO videos (video_id, title, description, thumbnail_url, published_at, channel_id)
-- VALUES (
--   'dQw4w9WgXcQ',
--   'Sample Church Sermon',
--   'This is a sample sermon description',
--   'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
--   NOW(),
--   'UCuAXFkgsw1L7xaCfnd5JJOw'
-- );

-- INSERT INTO admin_content (type, title, content, media_url)
-- VALUES (
--   'announcement',
--   'Welcome to RHM Church App',
--   'Stay connected with sermons, radio, and Bible study',
--   NULL
-- );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('videos', 'user_notes', 'admin_content', 'app_settings');

-- SELECT tablename, policyname FROM pg_policies 
-- WHERE schemaname = 'public';
