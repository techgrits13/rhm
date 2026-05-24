import api, { supabaseApi } from './api';

export interface Video {
  id: number;
  video_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published_at: string;
  channel_id: string;
  created_at: string;
}

export interface VideoResponse {
  success: boolean;
  count: number;
  videos: Video[];
  message?: string;
}

export const videoService = {
  // Get all videos
  getAllVideos: async (): Promise<VideoResponse> => {
    try {
      console.log('☁️ Fetching church videos from Supabase Edge Function...');
      const response = await supabaseApi.get<VideoResponse>('/videos');
      return response.data;
    } catch (error) {
      console.error('Error fetching videos:', error);
      throw error;
    }
  },

  // Get single video by ID
  getVideoById: async (id: number): Promise<Video> => {
    try {
      console.log(`☁️ Fetching video '${id}' from Supabase Edge Function...`);
      const response = await supabaseApi.get(`/videos/${id}`);
      return response.data.video;
    } catch (error) {
      console.error('Error fetching video:', error);
      throw error;
    }
  },

  // Sync videos from YouTube
  syncVideos: async (): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('☁️ Syncing videos from YouTube via Supabase Edge Function...');
      const response = await supabaseApi.post('/videos'); // POST triggers sync
      return response.data;
    } catch (error) {
      console.error('Error syncing videos:', error);
      throw error;
    }
  },
};
