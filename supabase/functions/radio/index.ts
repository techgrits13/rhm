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
    const path = url.pathname.split('/').filter(Boolean)

    // GET /radio/stream
    if (path.includes('stream')) {
      const { data: settings } = await supabaseClient
        .from('app_settings')
        .select('radio_url')
        .single()

      const radioUrl = settings?.radio_url || 'https://s3.radio.co/s97f38db97/listen'

      return new Response(JSON.stringify({
        success: true,
        radioUrl: radioUrl,
        station: 'Jesus Is Lord Radio One - Nakuru',
        fallbackUrl: 'https://jesusislordradio.info:8443/stream'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // GET /radio/slideshow
    if (path.includes('slideshow')) {
      const { data, error } = await supabaseClient
        .from('admin_content')
        .select('*')
        .eq('type', 'radio_slideshow')
        .order('published_at', { ascending: false })

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        images: data || [],
        message: 'Slideshow images fetched successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
