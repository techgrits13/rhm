-- In-App Notifications Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_read ON in_app_notifications(read);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created_at ON in_app_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public access (no authentication required)
CREATE POLICY "Anyone can view in-app notifications"
  ON in_app_notifications FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert in-app notifications"
  ON in_app_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update in-app notifications"
  ON in_app_notifications FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete in-app notifications"
  ON in_app_notifications FOR DELETE
  USING (true);

-- Verification query
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'in_app_notifications';
