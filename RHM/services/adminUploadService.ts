import { supabaseApi } from './api';
import { uploadFileToSupabase } from './storageService';

export interface BreakingNewsUpload {
    type: 'text' | 'image' | 'video' | 'poll' | 'link';
    content: string;
    mediaUri?: string;
    pollOptions?: string[];
    linkUrl?: string;
}

export interface MusicUpload {
    title: string;
    artist: string;
    album?: string;
    audioUri: string;
    coverUri?: string;
}

/**
 * Upload Breaking News post directly to Supabase
 */
export async function uploadBreakingNews(data: BreakingNewsUpload): Promise<{ success: boolean; error?: string }> {
    try {
        let mediaUrl = undefined;

        // 1. Upload media to Supabase Storage if present
        if (data.mediaUri && (data.type === 'image' || data.type === 'video')) {
            console.log('☁️ Uploading media to Supabase Storage...');
            const filename = `news_${Date.now()}_${data.mediaUri.split('/').pop()}`;
            mediaUrl = await uploadFileToSupabase('breaking-news', data.mediaUri, filename);
        }

        // 2. Submit metadata to Supabase Edge Function
        console.log('☁️ Submitting news metadata to Edge Function...');
        const response = await supabaseApi.post('/breaking-news', {
            type: data.type,
            content: data.content,
            media_url: mediaUrl,
            poll_options: data.type === 'poll' ? data.pollOptions : undefined,
            link_url: data.type === 'link' ? data.linkUrl : undefined,
        });

        if (response.status !== 201 && response.status !== 200) {
            throw new Error(`Edge Function error: ${response.status}`);
        }

        return { success: true };
    } catch (error: any) {
        console.error('Direct Breaking News Upload Error:', error);
        return { success: false, error: error.message || 'Upload failed' };
    }
}

/**
 * Upload Music Track directly to Supabase
 */
export async function uploadMusicTrack(data: MusicUpload): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Upload audio file to Supabase Storage
        console.log('☁️ Uploading audio to Supabase Storage...');
        const audioFilename = `audio_${Date.now()}_${data.audioUri.split('/').pop()}`;
        const audioUrl = await uploadFileToSupabase('tracks', data.audioUri, audioFilename);

        // 2. Upload cover image to Supabase Storage (optional)
        let coverUrl = undefined;
        if (data.coverUri) {
            console.log('☁️ Uploading cover art to Supabase Storage...');
            const coverFilename = `cover_${Date.now()}_${data.coverUri.split('/').pop()}`;
            coverUrl = await uploadFileToSupabase('covers', data.coverUri, coverFilename);
        }

        // 3. Submit metadata to Supabase Edge Function
        console.log('☁️ Submitting music metadata to Edge Function...');
        const response = await supabaseApi.post('/music', {
            title: data.title,
            artist: data.artist,
            album: data.album,
            audio_url: audioUrl,
            cover_url: coverUrl,
        });

        if (response.status !== 201 && response.status !== 200) {
            throw new Error(`Edge Function error: ${response.status}`);
        }

        return { success: true };
    } catch (error: any) {
        console.error('Direct Music Upload Error:', error);
        return { success: false, error: error.message || 'Upload failed' };
    }
}

/**
 * Delete Breaking News post and attached media
 */
export async function deleteBreakingNews(id: number | string): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`☁️ Submitting DELETE request for news post ${id}...`);
        const response = await supabaseApi.delete(`/breaking-news/${id}`);

        if (response.status !== 200) {
            throw new Error(`Edge Function error: ${response.status}`);
        }
        return { success: true };
    } catch (error: any) {
        console.error('Delete Breaking News Error:', error);
        return { success: false, error: error.message || 'Delete failed' };
    }
}

/**
 * Delete Music Track and attached media
 */
export async function deleteMusicTrack(id: number | string): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`☁️ Submitting DELETE request for music track ${id}...`);
        const response = await supabaseApi.delete(`/music/${id}`);

        if (response.status !== 200) {
            throw new Error(`Edge Function error: ${response.status}`);
        }
        return { success: true };
    } catch (error: any) {
        console.error('Delete Music Error:', error);
        return { success: false, error: error.message || 'Delete failed' };
    }
}

/**
 * Send Push Notification to all registered devices.
 * Returns REAL counts from Expo — not just DB token count.
 */
export async function broadcastNotification(
    title: string,
    body: string,
    data?: any
): Promise<{
    success: boolean;
    sent?: number;
    total_tokens?: number;
    failed?: number;
    purged?: number;
    expo_errors?: any[];
    message?: string;
    error?: string;
}> {
    try {
        console.log(`📣 Sending broadcast notification: ${title}`);
        const response = await supabaseApi.post('/notifications/broadcast', {
            title,
            body,
            data
        });

        if (response.status !== 200) {
            throw new Error(`Edge Function error: ${response.status}`);
        }

        const d = response.data;
        console.log('📬 Broadcast response from Edge Function:', JSON.stringify(d));

        return {
            success: d?.success ?? false,
            sent: d?.sent ?? 0,               // tickets with status=ok from Expo
            total_tokens: d?.total_tokens ?? 0, // tokens found in DB
            failed: d?.failed ?? 0,             // tickets with status=error
            purged: d?.purged ?? 0,             // tokens auto-removed
            expo_errors: d?.expo_errors ?? [],  // first 10 Expo error details
            message: d?.message,
        };
    } catch (error: any) {
        console.error('Broadcast Notification Error:', error.response?.data || error);
        return { success: false, error: error.response?.data?.error || error.message || 'Broadcast failed' };
    }
}

/**
 * Purge stale / Expo-Go push tokens from the database.
 */
export async function purgeStaleTokens(purgeAll: boolean = false): Promise<{ success: boolean; error?: string }> {
    try {
        console.log('🧹 Requesting stale token purge...', { purgeAll });
        const response = await supabaseApi.post('/notifications/purge-invalid-tokens', {
            invalid_tokens: [],
            purge_all_expo: purgeAll
        });
        if (response.status !== 200) {
            throw new Error(`Purge error: ${response.status}`);
        }
        return { success: true };
    } catch (error: any) {
        console.error('Purge tokens error:', error);
        return { success: false, error: error.message || 'Purge failed' };
    }
}

/**
 * Diagnostic: Check how many push tokens are registered and their details.
 * Use this to confirm devices are properly registered before broadcasting.
 */
export async function checkRegisteredTokens(): Promise<{
    count: number;
    tokens: { token_preview: string; device_type: string; updated_at: string }[];
    error?: string;
}> {
    try {
        const response = await supabaseApi.get('/notifications/debug-tokens');
        if (response.status !== 200) {
            throw new Error(`Debug tokens error: ${response.status}`);
        }
        return {
            count: response.data?.count ?? 0,
            tokens: response.data?.tokens ?? [],
        };
    } catch (error: any) {
        console.error('Check tokens error:', error);
        return { count: 0, tokens: [], error: error.message || 'Failed to check tokens' };
    }
}
