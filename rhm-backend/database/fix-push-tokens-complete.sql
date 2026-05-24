-- ================================================================
-- FIX: push_tokens table + RLS Policies
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ================================================================

-- 1. Create table if it doesn't already exist
CREATE TABLE IF NOT EXISTS push_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT,
  expo_push_token TEXT UNIQUE NOT NULL,
  device_type TEXT DEFAULT 'unknown',
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_enabled ON push_tokens(enabled);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(expo_push_token);

-- 3. Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Drop any stale policies first to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Anyone can insert push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Anyone can update push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Anyone can delete push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Service role can manage push tokens" ON push_tokens;

-- 5. Re-create policies (anon + service role both work)
CREATE POLICY "Anyone can view push tokens"
  ON push_tokens FOR SELECT USING (true);

CREATE POLICY "Anyone can insert push tokens"
  ON push_tokens FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update push tokens"
  ON push_tokens FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete push tokens"
  ON push_tokens FOR DELETE USING (true);

-- 6. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- VERIFICATION — After running above, check these return results:
-- ================================================================

-- Should return 1 row with "push_tokens"
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'push_tokens';

-- Should show 5 policies
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'push_tokens';

-- Should return 0 (empty) — that's fine, tokens will come in when users open the app
SELECT COUNT(*) as token_count FROM push_tokens;
