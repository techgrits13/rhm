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

function getNairobiMonthStart() {
  return `${getNairobiDate().slice(0, 7)}-01T00:00:00+03:00`;
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
      return new Response(JSON.stringify({ success: true, error: 'Please update the app. This endpoint is deprecated.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 426,
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
      newInstallsThisMonthResult,
      newInstallsTodayResult,
      activeNowResult,
      dailyActiveUsersResult,
    ] = await Promise.all([
      supabaseClient
        .from('app_devices')
        .select('device_id', { count: 'exact', head: true }),
      supabaseClient
        .from('app_devices')
        .select('device_id', { count: 'exact', head: true })
        .gte('first_seen_at', getNairobiMonthStart()),
      supabaseClient
        .from('app_devices')
        .select('device_id', { count: 'exact', head: true })
        .gte('first_seen_at', `${today}T00:00:00+03:00`),
      supabaseClient
        .from('app_devices')
        .select('device_id', { count: 'exact', head: true })
        .gte('last_seen_at', new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000).toISOString()),
      supabaseClient
        .from('app_daily_device_activity')
        .select('device_id', { count: 'exact', head: true })
        .eq('activity_date', today),
    ])

    const firstError = [totalUsersResult, newInstallsThisMonthResult, newInstallsTodayResult, activeNowResult, dailyActiveUsersResult].find((result) => result.error)
    if (firstError?.error) throw firstError.error

    const metrics = {
      totalUsers: totalUsersResult.count || 0,
      newInstallsThisMonth: newInstallsThisMonthResult.count || 0,
      newInstallsToday: newInstallsTodayResult.count || 0,
      activeNow: activeNowResult.count || 0,
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
