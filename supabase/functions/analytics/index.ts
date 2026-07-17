// @ts-ignore: Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-user, x-admin-password',
}

const ACTIVE_WINDOW_MINUTES = 5;

function getNairobiDate(offsetDays = 0) {
  // Simple Nairobi date formatting using timezone offset
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  // Nairobi is UTC+3
  const nairobiTime = new Date(d.getTime() + (3 * 60 * 60 * 1000));
  return nairobiTime.toISOString().split('T')[0];
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const path = url.pathname.replace(/\/+$/, '')

    console.log(`📊 Analytics Function active: ${req.method} ${path}`)

    // 1. POST /session -> Track app activity
    if (req.method === 'POST') {
      const { deviceId, platform, appOpened } = await req.json()

      if (!deviceId) {
        return new Response(JSON.stringify({ error: 'deviceId is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const now = new Date().toISOString()
      const today = getNairobiDate()
      
      const deviceUpdate: any = {
        device_id: deviceId,
        platform: platform || 'unknown',
        last_seen_at: now,
      }

      if (appOpened) {
        deviceUpdate.last_opened_at = now
      }

      const { error: deviceError } = await supabaseClient
        .from('app_devices')
        .upsert(deviceUpdate, { onConflict: 'device_id' })

      if (deviceError) throw deviceError

      if (appOpened) {
        const { error: activityError } = await supabaseClient
          .from('app_daily_device_activity')
          .upsert(
            {
              activity_date: today,
              device_id: deviceId,
              opened_at: now,
            },
            { onConflict: 'activity_date,device_id' }
          )

        if (activityError) throw activityError
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. GET /summary or default -> Fetch summary (protected by admin header check)
    const expectedUser = 'esir'
    const expectedPass = '12822Esir@#'
    const user = req.headers.get('x-admin-user')
    const pass = req.headers.get('x-admin-password')

    if (pass !== expectedPass || (expectedUser && user !== expectedUser)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const today = getNairobiDate()

    const [
      totalUsersResult,
      newInstallsTodayResult,
      dailyActiveUsersResult,
    ] = await Promise.all([
      supabaseClient
        .from('app_devices')
        .select('device_id', { count: 'exact', head: true }),
      supabaseClient
        .from('app_devices')
        .select('device_id', { count: 'exact', head: true })
        .gte('first_seen_at', today),
      supabaseClient
        .from('app_daily_device_activity')
        .select('device_id', { count: 'exact', head: true })
        .eq('activity_date', today),
    ])

    const firstError = [totalUsersResult, newInstallsTodayResult, dailyActiveUsersResult].find((result) => result.error)
    if (firstError?.error) throw firstError.error

    const metrics = {
      totalUsers: totalUsersResult.count || 0,
      newInstallsToday: newInstallsTodayResult.count || 0,
      dailyActiveUsers: dailyActiveUsersResult.count || 0,
    }

    return new Response(JSON.stringify({
      success: true,
      timezone: 'Africa/Nairobi',
      windows: {
        activeMinutes: ACTIVE_WINDOW_MINUTES,
        today,
      },
      metrics,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Analytics Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
