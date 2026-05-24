import express from 'express';
import supabase from '../utils/supabaseClient.js';

const router = express.Router();

// GET /api/radio/stream - Get radio stream URL
router.get('/stream', async (req, res) => {
  try {
    // First, try to get radio URL from app_settings table
    const { data: settings } = await supabase
      .from('app_settings')
      .select('radio_url')
      .single();

    const radioUrl = settings?.radio_url || 'https://s3.radio.co/s97f38db97/listen';

    res.json({
      success: true,
      radioUrl: radioUrl,
      station: 'Jesus Is Lord Radio One - Nakuru',
      fallbackUrl: 'https://jesusislordradio.info:8443/stream'
    });
  } catch (error) {
    console.error('Error fetching radio stream:', error);
    // Return fallback even on error
    res.json({
      success: true,
      radioUrl: 'https://jesusislordradio.info:8443/stream',
      station: 'Jesus Is Lord Radio One - Nakuru',
      message: 'Using fallback stream URL'
    });
  }
});

// GET /api/radio/slideshow - Get slideshow images
router.get('/slideshow', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_content')
      .select('*')
      .eq('type', 'radio_slideshow')
      .order('published_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      images: data || [],
      message: 'Slideshow images fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching slideshow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch slideshow images',
      message: error.message
    });
  }
});

export default router;
