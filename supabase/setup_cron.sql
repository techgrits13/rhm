-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Safely unschedule existing job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('sync-youtube-videos');
EXCEPTION
  WHEN OTHERS THEN
    -- If job doesn't exist or other error, just ignore and continue
    NULL;
END $$;

-- 3. Schedule the YouTube sync every 6 hours
SELECT cron.schedule(
  'sync-youtube-videos',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://tlcerhzcnhhzqbocmjsd.supabase.co/functions/v1/videos',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsY2VyaHpjbmhoenFib2NtanNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQwNTk2OSwiZXhwIjoyMDkyOTgxOTY5fQ.2Dsr2EMYUVw8x38mGksg4Q-bw1oemHXx-aaGF1fO0Is"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- 4. Verify (this uses a view usually, which is readable)
SELECT * FROM cron.job;
