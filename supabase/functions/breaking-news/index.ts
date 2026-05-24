// @ts-ignore: Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    console.log(`🗞️ News Function: ${req.method} ${url.pathname}`)

    // GET /news
    if (req.method === 'GET') {
      const { data, error } = await supabaseClient
        .from('breaking_news')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error

      // Enrich with reactions
      const { data: reactions } = await supabaseClient.from('news_reactions').select('post_id, emoji')
      const enriched = (data || []).map(item => {
        const itemReactions = reactions?.filter(r => r.post_id === item.id) || []
        const reaction_counts = itemReactions.reduce((acc, curr) => {
          acc[curr.emoji] = (acc[curr.emoji] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        return { ...item, reaction_counts }
      })

      return new Response(JSON.stringify(enriched), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // POST /news or /react
    if (req.method === 'POST') {
      const body = await req.json()
      
      // Reaction Logic
      if (body.emoji && body.post_id) {
        const { post_id, user_id, emoji } = body
        const { data: existing } = await supabaseClient
          .from('news_reactions')
          .select('id')
          .eq('post_id', post_id)
          .eq('user_id', user_id)
          .eq('emoji', emoji)
          .single()

        if (existing) {
          await supabaseClient.from('news_reactions').delete().eq('id', existing.id)
        } else {
          await supabaseClient.from('news_reactions').delete().eq('post_id', post_id).eq('user_id', user_id)
          await supabaseClient.from('news_reactions').insert([{ post_id, user_id, emoji }])
        }

        const { data: updated } = await supabaseClient.from('news_reactions').select('emoji').eq('post_id', post_id)
        const counts = updated?.reduce((acc, curr) => {
          acc[curr.emoji] = (acc[curr.emoji] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}

        return new Response(JSON.stringify({ success: true, reaction_counts: counts }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      // New News Post Logic
      const { type, content, media_url, poll_options, link_url } = body
      if (!type || !content) throw new Error('Missing news fields (type/content)')

      const { data, error } = await supabaseClient
        .from('breaking_news')
        .insert([{
          type,
          content,
          media_url,
          poll_options,
          link_url,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) {
        console.error('DB Insert Error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      })
    }

    // DELETE /news
    if (req.method === 'DELETE') {
      let postId = null;
      const urlMatches = url.pathname.match(/\/([^\/]+)$/);
      
      try {
        const body = await req.json();
        postId = body.id;
      } catch (e) {
        // Fallback to URL parsing if no body
        if (urlMatches && urlMatches[1] && urlMatches[1] !== 'breaking-news') {
          postId = urlMatches[1];
        }
      }

      const id = url.searchParams.get('id') || postId;
      if (!id) throw new Error('Missing post ID to delete');

      // 1. Fetch the post to get the media URL
      const { data: post, error: fetchError } = await supabaseClient
        .from('breaking_news')
        .select('media_url')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;

      // 2. Erase the media file physically from the bucket
      if (post && post.media_url) {
        try {
          const filename = post.media_url.split('/').pop();
          if (filename) {
            console.log(`🗑️ Shredding media file: ${filename}`);
            await supabaseClient.storage.from('breaking-news').remove([filename]);
          }
        } catch(e) {
          console.error("Non-fatal storage purge error:", e);
        }
      }

      // 3. Destroy metadata row
      const { error: delError } = await supabaseClient.from('breaking_news').delete().eq('id', id);
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
    console.error('News Function Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
