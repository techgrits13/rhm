-- Push Tokens Table for Expo Push Notifications
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS push_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT,
  expo_push_token TEXT UNIQUE NOT NULL,
  device_type TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_enabled ON push_tokens(enabled);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(expo_push_token);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public access (no authentication required)
CREATE POLICY "Anyone can view push tokens"
  ON push_tokens FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update push tokens"
  ON push_tokens FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete push tokens"
  ON push_tokens FOR DELETE
  USING (true);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verification query
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'push_tokens';
