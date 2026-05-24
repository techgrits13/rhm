// @ts-ignore: Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// RHM project ID — tokens must belong to this project or they're stale Expo Go tokens
const RHM_PROJECT_ID = '099536d0-ecd3-43dd-bb67-61be5f1976c1';

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

    const url = new URL(req.url)

    // ── POST /register ────────────────────────────────────────────────────────
    if (req.method === 'POST' && url.pathname.includes('register') && !url.pathname.includes('unregister')) {
      const body = await req.json()
      const { token, platform, user_id, app_ownership, experience_id } = body

      if (!token) {
        return new Response(JSON.stringify({ error: 'Token is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      // Validate it looks like a real Expo push token
      if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
        console.warn(`⚠️ Suspicious token format — rejecting: ${token.slice(0, 40)}`)
        return new Response(JSON.stringify({ error: 'Invalid token format' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      console.log(`📲 Registering token (platform: ${platform}, ownership: ${app_ownership}): ${token.slice(0, 40)}...`)

      const { error } = await supabaseClient
        .from('push_tokens')
        .upsert({
          expo_push_token: token,
          device_type: platform || 'unknown',
          user_id: user_id || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'expo_push_token' })

      if (error) throw error

      return new Response(JSON.stringify({ success: true, message: 'Token registered' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── POST /unregister ──────────────────────────────────────────────────────
    if (req.method === 'POST' && url.pathname.includes('unregister')) {
      const { token } = await req.json()
      if (token) {
        await supabaseClient.from('push_tokens').delete().eq('expo_push_token', token)
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── POST /purge-invalid-tokens — Admin: remove stale/Expo-Go tokens ───────
    if (req.method === 'POST' && url.pathname.includes('purge-invalid-tokens')) {
      const { invalid_tokens, purge_all_expo } = await req.json()
      
      if (purge_all_expo) {
        console.log('🧹 Purging ALL tokens...')
        const { error } = await supabaseClient
          .from('push_tokens')
          .delete()
          .neq('device_type', 'none') // Deletes all tokens
        if (error) throw error
        return new Response(JSON.stringify({ success: true, message: 'All tokens purged' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      if (Array.isArray(invalid_tokens) && invalid_tokens.length > 0) {
        const { error } = await supabaseClient
          .from('push_tokens')
          .delete()
          .in('expo_push_token', invalid_tokens)
        if (error) console.error('Error purging invalid tokens:', error)
        console.log(`🧹 Purged ${invalid_tokens.length} invalid tokens`)
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── GET /debug-tokens — Admin: inspect what tokens exist ─────────────────
    if (req.method === 'GET' && url.pathname.includes('debug-tokens')) {
      const { data: tokens, error } = await supabaseClient
        .from('push_tokens')
        .select('expo_push_token, device_type, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return new Response(JSON.stringify({
        count: tokens?.length ?? 0,
        tokens: (tokens || []).map((t: any) => ({
          token_preview: t.expo_push_token?.slice(0, 50) + '...',
          device_type: t.device_type,
          updated_at: t.updated_at,
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── GET /in-app ───────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { data, error } = await supabaseClient
        .from('in_app_notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(JSON.stringify({ notifications: data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── POST /mark-read ───────────────────────────────────────────────────────
    if (req.method === 'POST' && url.pathname.includes('mark-read')) {
      const { notification_id, mark_all } = await req.json()

      let query = supabaseClient.from('in_app_notifications').update({ read: true })

      if (mark_all) {
        query = query.eq('read', false)
      } else if (notification_id) {
        query = query.eq('id', notification_id)
      }

      const { error } = await query
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ── POST /broadcast ───────────────────────────────────────────────────────
    if (req.method === 'POST' && url.pathname.includes('broadcast')) {
      const { title, body, data } = await req.json()

      if (!title || !body) throw new Error('Missing notification title or message')

      // 1. Fetch all tokens
      const { data: tokens, error: tokenError } = await supabaseClient
        .from('push_tokens')
        .select('expo_push_token')

      if (tokenError) throw tokenError

      if (!tokens || tokens.length === 0) {
        console.warn('⚠️ No push tokens found in database! Users need to open the app to register.')
        return new Response(JSON.stringify({
          success: false,
          message: 'No devices registered. Ask users to open the RHM app so their device registers.',
          sent: 0,
          purged: 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      const expoPushTokens = tokens.map((t: any) => t.expo_push_token)
      console.log(`📣 Broadcasting to ${expoPushTokens.length} tokens...`)
      console.log('Token samples:', expoPushTokens.slice(0, 3).map((t: string) => t.slice(0, 50)))

      // 2. Send in batches of 100 (Expo limit)
      const chunks: string[][] = []
      for (let i = 0; i < expoPushTokens.length; i += 100) {
        chunks.push(expoPushTokens.slice(i, i + 100))
      }

      let successCount = 0
      let errorCount = 0
      const invalidTokens: string[] = []
      const expoErrors: any[] = []

      for (const chunk of chunks) {
        const messages = chunk.map((token: string) => ({
          to: token,
          sound: 'default',
          title,
          body,
          data: { ...(data || {}), screen: data?.screen || 'Home' },
          channelId: 'default',
          priority: 'high',
        }))

        console.log(`📤 Sending batch of ${messages.length} messages to Expo Push API...`)

        let expoResponse: Response
        try {
          expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
          })
        } catch (fetchError: any) {
          console.error('❌ Failed to reach Expo Push API (network error):', fetchError.message)
          throw new Error(`Cannot reach Expo Push API: ${fetchError.message}`)
        }

        if (!expoResponse.ok) {
          const rawBody = await expoResponse.text()
          console.error(`❌ Expo Push API returned HTTP ${expoResponse.status}:`, rawBody)
          throw new Error(`Expo Push API error ${expoResponse.status}: ${rawBody}`)
        }

        const result = await expoResponse.json()
        console.log('📬 Expo API response:', JSON.stringify(result).slice(0, 500))

        // 3. Parse per-ticket results
        if (result?.data && Array.isArray(result.data)) {
          result.data.forEach((ticket: any, idx: number) => {
            if (ticket?.status === 'ok') {
              successCount++
            } else if (ticket?.status === 'error') {
              errorCount++
              const errType = ticket?.details?.error
              console.error(`❌ Expo push error for token ${chunk[idx]?.slice(0, 40)}: ${errType} — ${ticket.message}`)
              expoErrors.push({ token: chunk[idx]?.slice(0, 40), error: errType, message: ticket.message })

              if (errType === 'DeviceNotRegistered' || errType === 'InvalidCredentials') {
                invalidTokens.push(chunk[idx])
              }
            } else {
              // Unknown ticket shape — log it
              console.warn('⚠️ Unknown ticket shape:', JSON.stringify(ticket))
            }
          })
        } else {
          console.error('❌ Unexpected Expo response shape — no data array:', JSON.stringify(result))
        }
      }

      console.log(`✅ Broadcast complete: ${successCount} succeeded, ${errorCount} failed, ${invalidTokens.length} invalid tokens`)

      // 4. Auto-purge DeviceNotRegistered tokens
      if (invalidTokens.length > 0) {
        console.log(`🧹 Auto-purging ${invalidTokens.length} invalid tokens`)
        await supabaseClient
          .from('push_tokens')
          .delete()
          .in('expo_push_token', invalidTokens)
      }

      // 5. Persist to in-app notification history
      await supabaseClient.from('in_app_notifications').insert([{
        title,
        body,
        data: data || {},
        read: false
      }])

      return new Response(JSON.stringify({
        success: successCount > 0 || (errorCount === 0 && expoPushTokens.length > 0),
        sent: successCount,           // ✅ REAL count: tickets with status=ok
        total_tokens: expoPushTokens.length,
        failed: errorCount,
        purged: invalidTokens.length,
        expo_errors: expoErrors.slice(0, 10), // Return first 10 errors for debugging
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Endpoint or method not found', path: url.pathname }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })

  } catch (error) {
    console.error('Notification Function Error:', (error as any).message)
    return new Response(JSON.stringify({ error: (error as any).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
