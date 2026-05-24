import { supabaseApi } from './api';

export interface RadioStreamResponse {
  success: boolean;
  radioUrl: string;
  station: string;
  fallbackUrl?: string;
}

export interface SlideshowImage {
  id: number;
  type: string;
  title: string;
  content: string;
  media_url: string;
  published_at: string;
}

export const radioService = {
  // Get radio stream URL
  getStreamUrl: async (): Promise<RadioStreamResponse> => {
    try {
      console.log('☁️ Fetching radio stream from Supabase Edge Function...');
      const response = await supabaseApi.get('/radio/stream');
      return response.data;
    } catch (error) {
      console.error('Error fetching radio stream:', error);
      // Default fallback
      return {
        success: true,
        radioUrl: 'https://jesusislordradio.info:8443/stream',
        station: 'Jesus Is Lord Radio One - Nakuru'
      };
    }
  },

  // Get slideshow images for radio
  getSlideshowImages: async () => {
    try {
      console.log('☁️ Fetching radio slideshow from Supabase Edge Function...');
      const response = await supabaseApi.get('/radio/slideshow');
      return response.data.images;
    } catch (error) {
      console.error('Error fetching radio images:', error);
      return [];
    }
  },
};
