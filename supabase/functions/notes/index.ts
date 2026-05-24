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

    // Notes usually require authentication. 
    // This function assumes the Authorization header contains the user's JWT.
    
    // GET /notes
    if (req.method === 'GET') {
      const { data, error } = await supabaseClient
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (error) throw error

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // POST /notes
    if (req.method === 'POST') {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('notes')
        .upsert({ 
          ...body,
          updated_at: new Date().toISOString()
        })
      
      if (error) throw error

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // DELETE /notes/:id
    if (req.method === 'DELETE') {
      const noteId = path[path.length - 1]
      const { error } = await supabaseClient
        .from('notes')
        .delete()
        .eq('id', noteId)
      
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
