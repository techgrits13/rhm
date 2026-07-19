// @ts-ignore: Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-video-sync-secret',
}

const CHURCH_CHANNELS = [
  { id: 'UC3DgiGIrnmfMbBjDQP0oM-w', handle: '@CrownTvkeOfficial', name: 'Crown TV KE Official' },
  { id: 'UC4uzQvfZ-TNtr9USnPNg72w', handle: '@Machdan_media', name: 'Machdan Media' },
  { id: 'UCqdgi-yU4fVlOhKZLrz24rw', handle: '@repentpreparetheway', name: 'Repent Prepare The Way' },
  { id: 'UCuJUQh03Zub62Vv8uZd9SWA', handle: '@kayolemainworshipchannel', name: 'Kayole Main Altar' },
  { id: 'UCoEYFha5gALQXSY0dBKCncw', handle: '@thecitymegachurch', name: 'The City Megachurch' },
  { id: 'UC1Ej2mG1R8L4R2c1I7Sqq4A', handle: '@repentancechannel1', name: 'Repentance Channel 1' },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    console.log(`📹 Video Function active: ${req.method}`)

    // POST /sync
    if (req.method === 'POST') {
      // @ts-ignore
      const syncSecret = Deno.env.get('VIDEO_SYNC_SECRET') ?? 'rhm_video_sync_secret_2026'
      const requestSecret = req.headers.get('x-video-sync-secret') ?? ''
      if (requestSecret !== syncSecret) {
        return new Response(JSON.stringify({ error: 'Video sync is restricted' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }

      // @ts-ignore
      const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')
      if (!youtubeApiKey) throw new Error('YOUTUBE_API_KEY missing')

      let syncCount = 0
      for (const channel of CHURCH_CHANNELS) {
        if (!channel.id) continue;
        
        try {
          // Use 'uploads' playlist (UU...) for exact channel fetching (1 quota unit vs 100 for search)
          const uploadsPlaylistId = channel.id.replace(/^UC/, 'UU')
          const ytUrl = `https://www.googleapis.com/youtube/v3/playlistItems?key=${youtubeApiKey}&playlistId=${uploadsPlaylistId}&part=snippet,status,contentDetails&maxResults=10`
          
          const res = await fetch(ytUrl)
          if (!res.ok) {
            console.error(`YT API Error for ${channel.name}:`, await res.text())
            continue
          }
          
          const data = await res.json()
          for (const item of (data.items || [])) {
            const status = item.status?.privacyStatus || 'public';
            if (status !== 'public') continue;

            const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
            if (!videoId) continue;
            
            // Keep this payload aligned with the deployed `videos` table.  In
            // particular, `channel_name` is not a column in that table; sending
            // it makes Supabase reject the entire upsert.
            const { error: upsertError } = await supabaseClient.from('videos').upsert({
              video_id: videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
              published_at: item.snippet.publishedAt,
              channel_id: channel.id,
            }, { onConflict: 'video_id' })
            if (upsertError) {
              throw new Error(`Could not save ${videoId}: ${upsertError.message}`)
            }
            syncCount++
          }
        } catch (err) {
          console.error(`Sync error for ${channel.name}:`, err.message)
        }
      }
      return new Response(JSON.stringify({ success: true, count: syncCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // GET /videos
    const { data, error } = await supabaseClient
      .from('videos')
      .select('*')
      .order('published_at', { ascending: false })
    
    if (error) throw error
    return new Response(JSON.stringify({ success: true, videos: data || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Video Sync Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
