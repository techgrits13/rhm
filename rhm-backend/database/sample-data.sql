-- SAMPLE DATA FOR TESTING RHM APP
-- Run this in Supabase SQL Editor to add test videos

-- Insert sample videos from church channels
INSERT INTO videos (video_id, title, description, thumbnail_url, published_at, channel_id) VALUES
(
  'dQw4w9WgXcQ',
  'Sunday Service - Gods Love Never Fails',
  'Join us for a powerful message about Gods unfailing love. Pastor preaches from 1 Corinthians 13.',
  'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  NOW() - INTERVAL '2 days',
  'UCkayolemainworshipchannel'
),
(
  'jNQXAC9IVRw',
  'Worship Night - Holy Spirit Move',
  'Experience the presence of God in this worship night. Powerful praise and worship session.',
  'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
  NOW() - INTERVAL '5 days',
  'UCWorshipTV7'
),
(
  '9bZkp7q19f0',
  'Prayer Meeting - Breakthrough Session',
  'Corporate prayer meeting for breakthrough and miracles. Join us in prayer.',
  'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
  NOW() - INTERVAL '1 week',
  'UCkayolemainworshipchannel'
),
(
  'kJQP7kiw5Fk',
  'Youth Service - Living for Jesus',
  'Youth gathering focused on living a Christ-centered life in todays world.',
  'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
  NOW() - INTERVAL '3 days',
  'UCTrendingGospel'
),
(
  'K5le9sYdYkM',
  'Bible Study - Book of Romans Chapter 8',
  'Deep dive into Romans 8 - Understanding the Spirit-led life.',
  'https://i.ytimg.com/vi/K5le9sYdYkM/hqdefault.jpg',
  NOW() - INTERVAL '1 day',
  'UCrepentpreparethewaytheway'
)
ON CONFLICT (video_id) DO NOTHING;

-- Insert sample admin content for announcements
INSERT INTO admin_content (type, title, content, media_url) VALUES
(
  'announcement',
  'Welcome to RHM Church App',
  'Thank you for downloading our app! Stay connected with sermons, radio, and Bible study.',
  NULL
),
(
  'event',
  'Upcoming Revival Meeting',
  'Join us for a 3-day revival meeting starting Friday 7PM. Guest speaker: Rev. John Doe',
  NULL
)
ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT 
  id, 
  title, 
  LEFT(description, 50) as description_preview,
  published_at
FROM videos
ORDER BY published_at DESC;
