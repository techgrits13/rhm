-- Safe App analytics tables setup for Supabase.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS app_devices (
  device_id TEXT PRIMARY KEY,
  platform TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_opened_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_daily_device_activity (
  activity_date DATE NOT NULL,
  device_id TEXT NOT NULL,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (activity_date, device_id)
);

CREATE INDEX IF NOT EXISTS idx_app_devices_last_seen_at
  ON app_devices(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_daily_device_activity_date
  ON app_daily_device_activity(activity_date DESC);

ALTER TABLE app_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_daily_device_activity ENABLE ROW LEVEL SECURITY;

-- Safely drop old policies to avoid "already exists" errors, then recreate
DROP POLICY IF EXISTS "Anyone can insert app devices" ON app_devices;
CREATE POLICY "Anyone can insert app devices"
  ON app_devices FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update app devices" ON app_devices;
CREATE POLICY "Anyone can update app devices"
  ON app_devices FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert app daily activity" ON app_daily_device_activity;
CREATE POLICY "Anyone can insert app daily activity"
  ON app_daily_device_activity FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update app daily activity" ON app_daily_device_activity;
CREATE POLICY "Anyone can update app daily activity"
  ON app_daily_device_activity FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Anyone can view app devices" ON app_devices;
DROP POLICY IF EXISTS "Anyone can view app daily activity" ON app_daily_device_activity;
