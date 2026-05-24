-- ============================================
-- FIX: Upload Issues - Missing RLS Policies
-- Purpose: Add missing tables and RLS policies for music and breaking_news
-- Date: 2026-02-16
-- ============================================

-- ============================================
-- TABLE: breaking_news
-- Purpose: Admin-posted breaking news feed
-- ============================================
CREATE TABLE IF NOT EXISTS breaking_news (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type TEXT NOT NULL, -- 'text', 'image', 'video', 'poll'
  content TEXT,
  media_url TEXT,
  poll_options JSONB, -- Array of {id, text, votes}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_breaking_news_created_at ON breaking_news(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_breaking_news_type ON breaking_news(type);

-- Enable RLS
ALTER TABLE breaking_news ENABLE ROW LEVEL SECURITY;

-- Public read access (required for frontend with anon key)
DROP POLICY IF EXISTS "Public breaking news is viewable by everyone" ON breaking_news;
CREATE POLICY "Public breaking news is viewable by everyone" 
  ON breaking_news FOR SELECT 
  USING (true);

-- ============================================
-- TABLE: news_reactions
-- Purpose: User reactions to breaking news posts
-- ============================================
CREATE TABLE IF NOT EXISTS news_reactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  news_id BIGINT REFERENCES breaking_news(id) ON DELETE CASCADE,
  user_identifier TEXT NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(news_id, user_identifier)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_reactions_news_id ON news_reactions(news_id);
CREATE INDEX IF NOT EXISTS idx_news_reactions_user ON news_reactions(user_identifier);

-- Enable RLS
ALTER TABLE news_reactions ENABLE ROW LEVEL SECURITY;

-- Public access for reactions
DROP POLICY IF EXISTS "Anyone can view reactions" ON news_reactions;
CREATE POLICY "Anyone can view reactions" 
  ON news_reactions FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert reactions" ON news_reactions;
CREATE POLICY "Anyone can insert reactions" 
  ON news_reactions FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update reactions" ON news_reactions;
CREATE POLICY "Anyone can update reactions" 
  ON news_reactions FOR UPDATE 
  USING (true);

-- ============================================
-- RLS for music table
-- Note: Table already exists, just adding RLS policies
-- ============================================
ALTER TABLE music ENABLE ROW LEVEL SECURITY;

-- Public read access (required for frontend with anon key)
DROP POLICY IF EXISTS "Public music is viewable by everyone" ON music;
CREATE POLICY "Public music is viewable by everyone" 
  ON music FOR SELECT 
  USING (true);

-- ============================================
-- VERIFICATION QUERIES
-- Run these after migration to verify success
-- ============================================

-- Check that tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('breaking_news', 'news_reactions', 'music');

-- Check RLS policies
-- SELECT tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('music', 'breaking_news', 'news_reactions')
-- ORDER BY tablename, policyname;

-- Test SELECT access (should work with anon key)
-- SELECT COUNT(*) FROM music;
-- SELECT COUNT(*) FROM breaking_news;
-- SELECT COUNT(*) FROM news_reactions;
