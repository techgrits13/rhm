-- Run this entire file in Supabase Dashboard > SQL Editor.
--
-- Before running, replace the two placeholders below with the values from
-- Supabase project secrets. Do not commit real keys or secrets to Git.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Replace a previous schedule, if one exists. This is safe when no previous
-- schedule exists because the query simply returns no rows.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'sync-youtube-videos';

-- Schedule the YouTube sync every two hours.
-- Replace SUPABASE_SERVICE_ROLE_KEY and VIDEO_SYNC_SECRET before executing.
SELECT cron.schedule(
  'sync-youtube-videos',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tlcerhzcnhhzqbocmjsd.supabase.co/functions/v1/videos',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer SUPABASE_SERVICE_ROLE_KEY","x-video-sync-secret":"VIDEO_SYNC_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verify that the job exists.
SELECT * FROM cron.job;
