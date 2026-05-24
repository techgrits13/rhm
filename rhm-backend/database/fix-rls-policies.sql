-- FIX RLS POLICIES - Allow backend service role to access tables
-- Run this in Supabase SQL Editor to fix connection issues

-- Add service role bypass policies for all tables

-- Videos: Allow service role full access
CREATE POLICY "Service role can manage videos" 
  ON videos FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Admin Content: Allow service role full access
CREATE POLICY "Service role can manage admin content" 
  ON admin_content FOR ALL 
  USING (true)
  WITH CHECK (true);

-- App Settings: Allow service role full access
CREATE POLICY "Service role can manage app settings" 
  ON app_settings FOR ALL 
  USING (true)
  WITH CHECK (true);

-- User Notes: Allow service role full access for sync
CREATE POLICY "Service role can manage all notes" 
  ON user_notes FOR ALL 
  USING (true)
  WITH CHECK (true);
