-- Update the radio stream URL to the correct Radio.co stream
UPDATE app_settings 
SET radio_url = 'https://s3.radio.co/s97f38db97/listen'
WHERE id = (SELECT id FROM app_settings LIMIT 1);

-- If no settings exist, insert them
INSERT INTO app_settings (theme, radio_url, notification_enabled)
SELECT 'default', 'https://s3.radio.co/s97f38db97/listen', TRUE
WHERE NOT EXISTS (SELECT 1 FROM app_settings LIMIT 1);
