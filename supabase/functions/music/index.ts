// @ts-ignore: Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    
    // GET /music
    if (req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '100')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const sort = url.searchParams.get('sort') || 'az'

      let query = supabaseClient.from('music').select('*', { count: 'exact' })
      if (sort === 'newest') {
        query = query.order('created_at', { ascending: false })
      } else {
        query = query.order('title', { ascending: true })
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1)
      if (error) throw error

      return new Response(JSON.stringify({ data, total: count || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // POST /music
    if (req.method === 'POST') {
      const body = await req.json()
      const { title, artist, album, audio_url, cover_url } = body

      if (!title || !artist || !audio_url) throw new Error('Missing music fields')

      const { data, error } = await supabaseClient
        .from('music')
        .insert([{
          title, artist, album, audio_url, cover_url,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) throw error
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      })
    }

    // DELETE /music
    if (req.method === 'DELETE') {
      let trackId = null;
      try {
        const body = await req.json();
        trackId = body.id;
      } catch (e) {
        const urlMatches = url.pathname.match(/\/([^\/]+)$/);
        if (urlMatches && urlMatches[1] && urlMatches[1] !== 'music') {
          trackId = urlMatches[1];
        }
      }
      
      const id = url.searchParams.get('id') || trackId;
      if (!id) throw new Error('Missing track ID to delete');

      // 1. Fetch to get audio & cover URLs
      const { data: track, error: fetchError } = await supabaseClient
        .from('music')
        .select('audio_url, cover_url')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;

      // 2. Shred files from buckets
      try {
        const storage = supabaseClient.storage;
        if (track.audio_url) {
          const audioFile = track.audio_url.split('/').pop();
          if (audioFile) await storage.from('tracks').remove([audioFile]);
        }
        if (track.cover_url) {
          const coverFile = track.cover_url.split('/').pop();
          if (coverFile) await storage.from('covers').remove([coverFile]);
        }
      } catch(e) {
        console.error("Non-fatal storage purge error:", e);
      }

      // 3. Destroy metadata row
      const { error: delError } = await supabaseClient.from('music').delete().eq('id', id);
      if (delError) throw delError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })

  } catch (error) {
    console.error('Music Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
