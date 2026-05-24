import { supabase } from './supabaseClient';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Upload a local file to a Supabase bucket
 * @param bucket Name of the bucket (e.g., 'breaking-news', 'music-audio')
 * @param localUri The local file URI from ImagePicker or DocumentPicker
 * @param fileName Desired filename in the bucket
 * @returns The public URL of the uploaded file
 */
export async function uploadFileToSupabase(
    bucket: string,
    localUri: string,
    fileName: string
): Promise<string> {
    try {
        // 1. Read file as base64
        const base64 = await FileSystem.readAsStringAsync(localUri, {
            // Hardcoded string to bypass Expo FileSystem.EncodingType undefined bug in some environments
            encoding: 'base64',
        });

        // 2. Convert base64 to ArrayBuffer (Supabase client requirement)
        const arrayBuffer = decode(base64);

        // 3. Determine content type
        const extension = fileName.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        if (['jpg', 'jpeg', 'png'].includes(extension!)) contentType = 'image/jpeg';
        else if (['mp4', 'mov'].includes(extension!)) contentType = 'video/mp4';
        else if (['mp3', 'wav', 'aac'].includes(extension!)) contentType = 'audio/mpeg';

        // 4. Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, arrayBuffer, {
                contentType,
                upsert: true
            });

        if (error) throw error;

        // 5. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return publicUrl;
    } catch (error) {
        console.error(`Error uploading to Supabase bucket '${bucket}':`, error);
        throw error;
    }
}
