// @ts-ignore: Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
// @ts-ignore: Deno URL import
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@4.14.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// RHM project ID
const RHM_PROJECT_ID = '099536d0-ecd3-43dd-bb67-61be5f1976c1';

// Function to generate Google OAuth2 token using jose
async function getFcmAccessToken(serviceAccount: any): Promise<string> {
  const privateKey = serviceAccount.private_key;
  const clientEmail = serviceAccount.client_email;

  const key = await importPKCS8(privateKey, "RS256");
  
  const jwt = await new SignJWT({
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/firebase.messaging"
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to get OAuth token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// @ts-ignore
serve(async (req: any) => {
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

      // Get Firebase Service Account from Supabase Env
      // @ts-ignore
      const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON') ?? Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
      if (!serviceAccountStr) {
        throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_SERVICE_ACCOUNT secret for FCM topic sending.');
      }
      const serviceAccount = JSON.parse(serviceAccountStr);

      const accessToken = await getFcmAccessToken(serviceAccount);
      const projectId = serviceAccount.project_id;

      const fcmPayload = {
        message: {
          topic: "RHM_ALL_USERS",
          notification: {
            title,
            body
          },
          data: { ...(data || {}), screen: data?.screen || 'Home' },
          android: {
            priority: "high",
            notification: {
              channel_id: "default",
              sound: "default",
              notification_priority: "PRIORITY_HIGH",
              visibility: "PUBLIC",
              default_sound: true,
              default_vibrate_timings: true
            }
          },
          apns: {
            headers: {
              "apns-priority": "10"
            },
            payload: {
              aps: {
                sound: "default",
                "content-available": 1
              }
            }
          }
        }
      };

      console.log(`📤 Sending High-Intent Topic Message to RHM_ALL_USERS...`);

      const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(fcmPayload)
      });

      if (!fcmResponse.ok) {
        const errBody = await fcmResponse.text();
        console.error(`❌ FCM API error ${fcmResponse.status}:`, errBody);
        throw new Error(`FCM API error ${fcmResponse.status}: ${errBody}`);
      }

      console.log('✅ FCM topic broadcast successful!');

      // Persist to in-app notification history
      await supabaseClient.from('in_app_notifications').insert([{
        title,
        body,
        data: data || {},
        read: false
      }])

      return new Response(JSON.stringify({
        success: true,
        sent: 1 // Representing the single topic request
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
