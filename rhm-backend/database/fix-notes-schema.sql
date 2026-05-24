-- Fix user_notes table to accept TEXT user_id instead of UUID
-- This allows the app to work without Supabase authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notes" ON user_notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON user_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON user_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON user_notes;

-- Drop the table and recreate with correct schema
DROP TABLE IF EXISTS user_notes;

-- Recreate user_notes table with TEXT user_id
CREATE TABLE user_notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX idx_user_notes_updated_at ON user_notes(updated_at DESC);

-- Enable RLS
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- Create new policies that allow public access (since we're not using auth)
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

-- Recreate the trigger for updated_at
DROP TRIGGER IF EXISTS update_user_notes_updated_at ON user_notes;
CREATE TRIGGER update_user_notes_updated_at
  BEFORE UPDATE ON user_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
