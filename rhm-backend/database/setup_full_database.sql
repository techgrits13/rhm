-- ============================================================================
-- RHM CHURCH APP - FULL DATABASE SETUP SCRIPT
-- ============================================================================
-- Purpose: Set up the entire database for RHM Church App from scratch.
-- Includes: Videos, User Notes, Admin Content, App Settings, Push Tokens.
--
-- INSTRUCTIONS:
-- 1. Go to your new Supabase Project > SQL Editor.
-- 2. Copy and paste this ENTIRE script.
-- 3. Click "Run".
-- ============================================================================

-- 1. HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-update 'updated_at' columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TABLE: VIDEOS
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 3. TABLE: USER_NOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL, -- Using TEXT to support device IDs/custom IDs
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_updated_at ON user_notes(updated_at DESC);

ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_notes_updated_at ON user_notes;
CREATE TRIGGER update_user_notes_updated_at
  BEFORE UPDATE ON user_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. TABLE: ADMIN_CONTENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_content (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type TEXT NOT NULL, -- 'announcement', 'event', 'radio_slideshow'
  title TEXT NOT NULL,
  content TEXT,
  media_url TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_content_type ON admin_content(type);
CREATE INDEX IF NOT EXISTS idx_admin_content_published_at ON admin_content(published_at DESC);

ALTER TABLE admin_content ENABLE ROW LEVEL SECURITY;

-- 5. TABLE: APP_SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  theme TEXT DEFAULT 'default',
  radio_url TEXT DEFAULT 'https://s3.radio.co/s97f38db97/listen',
  notification_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings if empty
INSERT INTO app_settings (theme, radio_url, notification_enabled)
SELECT 'default', 'https://s3.radio.co/s97f38db97/listen', TRUE
WHERE NOT EXISTS (SELECT 1 FROM app_settings LIMIT 1);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. TABLE: PUSH_TOKENS (New Feature)
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT,
  expo_push_token TEXT UNIQUE NOT NULL,
  device_type TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_enabled ON push_tokens(enabled);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(expo_push_token);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS POLICIES (OPEN ACCESS)
-- ============================================================================
-- NOTE: Since the app currently handles auth loosely (device ID) or is public,
-- we allow public access. Secure this if you add proper user authentication later.

-- Videos: Public Read, Service Role Write
CREATE POLICY "Public videos are viewable by everyone" ON videos FOR SELECT USING (true);
CREATE POLICY "Service role can manage videos" ON videos FOR ALL USING (true) WITH CHECK (true);

-- User Notes: Open Access (App filters by user_id)
CREATE POLICY "Anyone can view notes" ON user_notes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert notes" ON user_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notes" ON user_notes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete notes" ON user_notes FOR DELETE USING (true);
CREATE POLICY "Service role can manage all notes" ON user_notes FOR ALL USING (true) WITH CHECK (true);

-- Admin Content: Public Read, Service Role Write
CREATE POLICY "Public admin content is viewable by everyone" ON admin_content FOR SELECT USING (true);
CREATE POLICY "Service role can manage admin content" ON admin_content FOR ALL USING (true) WITH CHECK (true);

-- App Settings: Public Read, Service Role Write
CREATE POLICY "Public app settings are viewable by everyone" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Service role can manage app settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

-- Push Tokens: Public Access (App manages tokens)
CREATE POLICY "Anyone can view push tokens" ON push_tokens FOR SELECT USING (true);
CREATE POLICY "Anyone can insert push tokens" ON push_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update push tokens" ON push_tokens FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete push tokens" ON push_tokens FOR DELETE USING (true);

-- 8. VERIFICATION
-- ============================================================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
