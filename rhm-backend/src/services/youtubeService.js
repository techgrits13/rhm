import axios from 'axios';
import { config } from '../config.js';
import supabase from '../utils/supabaseClient.js';

// Your church YouTube channels
// Note: Prefer explicit channel IDs (UC...) to avoid handle mixups
export const CHURCH_CHANNELS = [
  { id: 'UC3DgiGIrnmfMbBjDQP0oM-w', handle: '@CrownTvkeOfficial', name: 'Crown TV KE Official' },
  { id: 'UC4uzQvfZ-TNtr9USnPNg72w', handle: '@Machdan_media', name: 'Machdan Media' },
  { id: 'UCqdgi-yU4fVlOhKZLrz24rw', handle: '@repentpreparetheway', name: 'Repent Prepare The Way' },
  { id: 'UCuJUQh03Zub62Vv8uZd9SWA', handle: '@kayolemainworshipchannel', name: 'Kayole Main Altar' },
  { id: 'UCoEYFha5gALQXSY0dBKCncw', handle: '@thecitymegachurch', name: 'The City Megachurch' },
  { id: 'UC1Ej2mG1R8L4R2c1I7Sqq4A', handle: '@repentancechannel1', name: 'Repentance Channel 1' },
  { id: 'UCL6_2_zmkrZgcYS0o-E4MLA', handle: '@uasingishumainaltartvplus', name: 'Uasin Gishu Main Altar TV Plus' },
  { id: 'UCOSnwtYOYvsiiRBeJjZznLA', handle: '@kerichomainaltarcbd', name: 'Kericho Main Altar CBD' },
  { id: 'UCm4Mz20QVwAEA3VIWC0J-vA', handle: '@repentanceandholinesseu', name: 'Repentance and Holiness EU' },
  { id: 'UCD634gV6zvx5otUJtrREpIw', handle: '@kariobangichurch', name: 'Kariobangi Church' },
  { id: 'UC_0r2sAHfsejNftrP7jTJxw', handle: '@bometmainaltartv', name: 'Bomet Main Altar TV' },
  { id: 'UC3q-kl9W7enad4cP_kBwlUA', handle: '@manyattamainaltar-narok9111', name: 'Manyatta Main Altar Narok' },
  { id: 'UCwQ1VVyHo4TTG_SSEbxPwyg', handle: '@kisiimainaltar2', name: 'Kisii Main Altar' },
  { id: 'UCWV5jTOCKynFvuENUX-dSOQ', handle: '@kamulualtar', name: 'Kamulu Altar' },
  { id: 'UCGsOIUep2GfVvS9lTv9cCRg', handle: '@utawala_altar', name: 'Utawala Altar' },
  { id: 'UCK1fHgeh1u_DufPS-9o5b-Q', handle: '@mrhgulumainaltar', name: 'MRH Gulu Main Altar' },
  { id: 'UC4MLxW0jN2pyDd9hre6kR5g', handle: '@machakoschurch', name: 'Machakos Church' },
  { id: 'UCsZcWTLHYh7jJ4b8WIgkg3A', handle: '@kakamega_main_altar', name: 'Kakamega Main Altar' },
  { id: 'UC_cACFGIrmVKlnL93LgUsfg', handle: '@tikvah_media', name: 'Tikvah Media' },
];

/**
 * Variable to track when we last hit a quota error.
 */
let isQuotaExceeded = false;

/**
 * Fetch latest videos from a YouTube channel using the 'uploads' playlist.
 * This is much more quota-efficient (1 unit) than 'search' (100 units).
 */
export const fetchLatestVideos = async (channelId, maxResults = 10) => {
  if (isQuotaExceeded) {
    const now = new Date();
    // Daily reset usually happens at Midnight PT. 
    // We check if it's a new day (rough check based on server hours)
    if (now.getHours() === 0) isQuotaExceeded = false;
    if (isQuotaExceeded) return [];
  }

  try {
    // Every channel has an "uploads" playlist where the ID is simply the channel ID with 'UU' instead of 'UC'
    const uploadsPlaylistId = channelId.replace(/^UC/, 'UU');

    const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: {
        key: config.youtube.apiKey,
        playlistId: uploadsPlaylistId,
        part: 'snippet,status,contentDetails',
        maxResults: maxResults,
      },
      timeout: 10000,
    });

    const items = response.data.items || [];

    // Filter and map to our format
    return items
      .filter((item) => {
        const status = item.status?.privacyStatus || 'public';
        return status === 'public';
      })
      .map((item) => ({
        video_id: item.contentDetails?.videoId || item.snippet?.resourceId?.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail_url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        published_at: item.snippet.publishedAt,
        channel_id: channelId,
      }));
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 403 && data?.error?.errors?.some(e => e.reason === 'quotaExceeded')) {
        console.error('⚠️ YOUTUBE QUOTA EXCEEDED. Stopping sync for today.');
        isQuotaExceeded = true;
      } else {
        console.error(`Error fetching videos for channel ${channelId}:`, status, JSON.stringify(data, null, 2));
      }
    } else {
      console.error(`Network or Timeout error for channel ${channelId}:`, error.message);
    }
    return [];
  }
};

/**
 * Resolve a YouTube channel handle (e.g., @MyChannel) to a channel ID (UC...)
 * Tries the channels API with forHandle, then falls back to search API
 */
const resolveChannelId = async (handleOrId) => {
  if (isQuotaExceeded) return null;

  try {
    if (typeof handleOrId === 'string' && handleOrId.startsWith('UC')) {
      return handleOrId;
    }

    const handle = String(handleOrId || '').trim();
    if (!handle) return null;

    try {
      const resp = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'id',
          forHandle: handle.startsWith('@') ? handle : `@${handle}`,
          key: config.youtube.apiKey,
        },
        timeout: 5000,
      });
      if (resp.data?.items?.length) {
        return resp.data.items[0].id;
      }
    } catch (e) { }

    const searchResp = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: handle,
        type: 'channel',
        maxResults: 1,
        key: config.youtube.apiKey,
      },
      timeout: 5000,
    });
    if (searchResp.data?.items?.length) {
      return searchResp.data.items[0]?.id?.channelId || null;
    }
  } catch (err) {
    if (err.response?.status === 403) {
      console.warn('YouTube API quota might be limited at resolve phase');
    }
  }
  return null;
};

/**
 * Cache video to Supabase (upsert to avoid duplicates)
 */
export const cacheVideoToSupabase = async (videoData) => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .upsert(videoData, { onConflict: 'video_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Supabase Error:', error.message);
    return null;
  }
};

/**
 * Check for new videos from all church channels and cache them
 */
export const checkForNewVideos = async () => {
  if (!config.youtube.apiKey) {
    console.error('❌ YOUTUBE_API_KEY is missing. Sync skipped.');
    return 0;
  }

  if (isQuotaExceeded) {
    console.log('🔇 Sync skipped: Quota is currently exceeded.');
    return 0;
  }

  console.log('🔄 Starting YouTube sync...');
  let totalNewVideos = 0;

  for (const channel of CHURCH_CHANNELS) {
    try {
      const channelId = await resolveChannelId(channel.id || channel.handle);
      if (!channelId) continue;

      const videos = await fetchLatestVideos(channelId, 10);
      if (!videos.length) continue;

      for (const video of videos) {
        try {
          const cached = await cacheVideoToSupabase(video);
          if (cached) totalNewVideos++;
        } catch (dbErr) {
          console.error(`DB Error caching video ${video.video_id}:`, dbErr.message);
        }
      }
    } catch (channelErr) {
      console.error(`Error processing channel ${channel.name}:`, channelErr.message);
    }

    if (isQuotaExceeded) break;
  }

  console.log(`✨ Sync complete. Total processed: ${totalNewVideos}`);
  return totalNewVideos;
};
