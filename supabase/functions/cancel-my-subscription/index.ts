// Lets a subscriber cancel their own Nedarim Plus standing order from the
// app (e.g. during the free trial week). Deletes the Keva at Nedarim first
// — the part that actually stops the card from being charged — and only
// then marks the subscription canceled_at. Access is kept until the
// current end_date (the rest of the trial, or the period already paid for)
// and then lapses on its own.
//
// Same Manage3.aspx DeleteKeva call as the admin panel's keva route
// (apps/admin/src/app/api/subscriptions/keva/route.ts), but scoped to the
// caller's own subscription.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

const MANAGE_URL = 'https://matara.pro/nedarimplus/Reports/Manage3.aspx';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: subscription } = await serviceClient
    .from('subscriptions')
    .select('id, provider_subscription_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('payment_provider', 'nedarim_plus')
    .is('canceled_at', null)
    .not('provider_subscription_id', 'is', null)
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription) {
    return jsonResponse({ error: 'לא נמצא מנוי פעיל עם הוראת קבע לביטול.' }, 404);
  }

  const { data: settingsRows } = await serviceClient
    .from('payment_provider_settings')
    .select('key, value')
    .in('key', ['nedarim_mosad_id', 'nedarim_api_key']);
  const settingsMap = new Map((settingsRows ?? []).map((row: { key: string; value: string }) => [row.key, row.value]));
  const mosadId = settingsMap.get('nedarim_mosad_id');
  const apiPassword = settingsMap.get('nedarim_api_key');
  if (!mosadId || !apiPassword) {
    return jsonResponse({ error: 'הביטול אינו זמין כרגע. נסו שוב מאוחר יותר.' }, 503);
  }

  let responseText: string;
  try {
    const resp = await fetch(MANAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        Action: 'DeleteKeva',
        MosadId: mosadId,
        ApiPassword: apiPassword,
        KevaId: subscription.provider_subscription_id,
      }).toString(),
    });
    responseText = (await resp.text()).trim();
  } catch {
    return jsonResponse({ error: 'לא ניתן היה להתחבר לשרתי נדרים פלוס. נסו שוב.' }, 502);
  }

  // DeleteKeva answers the literal text "OK" on success.
  if (responseText !== 'OK') {
    console.error('cancel-my-subscription: DeleteKeva failed', { subscriptionId: subscription.id, responseText });
    return jsonResponse({ error: 'הביטול נכשל. נסו שוב או פנו אלינו.' }, 502);
  }

  await serviceClient
    .from('subscriptions')
    .update({ canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', subscription.id);

  return jsonResponse({ canceled: true });
});
