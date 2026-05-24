import express from 'express';
import supabase from '../utils/supabaseClient.js';
import { checkForNewVideos } from '../services/youtubeService.js'; // Import the service

const router = express.Router();

// POST /api/admin/sync-videos - Manually trigger YouTube polling
router.post('/sync-videos', async (req, res) => {
  console.log('Manual YouTube sync triggered via API.');
  try {
    const newVideosCount = await checkForNewVideos();
    res.status(200).json({
      success: true,
      message: `YouTube sync completed successfully. Found ${newVideosCount} new videos.`,
      newVideos: newVideosCount,
    });
  } catch (error) {
    console.error('Error during manual YouTube sync:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync YouTube videos.',
      error: error.message,
    });
  }
});


// POST /api/admin/upload - Upload custom content (announcements, events, etc.)
router.post('/upload', async (req, res) => {
  try {
    const { type, title, content, media_url } = req.body;

    if (!type || !title) {
      return res.status(400).json({
        success: false,
        error: 'type and title are required fields'
      });
    }

    const { data, error } = await supabase
      .from('admin_content')
      .insert([{
        type,
        title,
        content,
        media_url,
        published_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Content uploaded successfully',
      content: data
    });
  } catch (error) {
    console.error('Error uploading content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload content',
      message: error.message
    });
  }
});

// GET /api/admin/content - Get all admin content
router.get('/content', async (req, res) => {
  try {
    const { type } = req.query;

    let query = supabase
      .from('admin_content')
      .select('*')
      .order('published_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      content: data || []
    });
  } catch (error) {
    console.error('Error fetching admin content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin content',
      message: error.message
    });
  }
});

// DELETE /api/admin/content/:id - Delete admin content
router.delete('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('admin_content')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete content',
      message: error.message
    });
  }
});

// POST /api/admin/notifications/send - Send push notification
router.post('/notifications/send', async (req, res) => {
  try {
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'title and body are required'
      });
    }

    // Placeholder for push notification logic
    // Will be implemented with Expo Push Notifications in later chunk
    console.log('Sending notification:', { title, body, data });

    res.json({
      success: true,
      message: 'Notification sent successfully (placeholder)',
      notification: {
        title,
        body,
        data,
        sent_at: new Date().toISOString()
      },
      note: 'Push notification integration will be added in Chunk 3'
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      message: error.message
    });
  }
});

// PUT /api/admin/settings - Update app settings
router.put('/settings', async (req, res) => {
  try {
    const { theme, radio_url, notification_enabled } = req.body;

    const updateData = {};
    if (theme) updateData.theme = theme;
    if (radio_url) updateData.radio_url = radio_url;
    if (typeof notification_enabled !== 'undefined') {
      updateData.notification_enabled = notification_enabled;
    }

    // Try to update existing settings or insert new ones
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .limit(1)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('app_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('app_settings')
        .insert([updateData])
        .select()
        .single();
    }

    if (result.error) throw result.error;

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: result.data
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

// GET /api/admin/settings - Get app settings
router.get('/settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      success: true,
      settings: data || {
        theme: 'default',
        radio_url: 'https://jesusislordradio.info:8443/stream',
        notification_enabled: true
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings',
      message: error.message
    });
  }
});

export default router;
