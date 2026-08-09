// Sends the daily reminder as a real Web Push notification to every
// subscribed browser/PWA whose reminder time matches "now".
//
// This exists because expo-notifications has no local-scheduling support on
// web at all (see apps/mobile/src/services/localNotifications.ts) — a
// browser (even an "installed" PWA) can't schedule its own future
// notification the way a native app can. Web Push moves that job to the
// server: this function is meant to run on a schedule (see
// supabase/functions/send-reminder-pushes/CRON.md) and, each time it fires,
// pushes to whoever's chosen reminder time is the current minute.
//
// Reminder times are stored as plain wall-clock `time` values with no
// timezone (see notification_settings.reminder_time) — this project has no
// per-user timezone field, so "now" is evaluated in Asia/Jerusalem
// throughout, matching the app's actual audience.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function currentIsraeliTimeHHMMSS(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}:00`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Not user-facing — invoked only by the pg_cron schedule (see the cron
  // setup notes alongside this function), never from the app. Deliberately
  // checked against its own dedicated secret rather than the service role
  // key: the cron job's SQL definition is stored in the database's
  // cron.job table, so whatever secret it carries should be the
  // narrowest one that can do this — trigger a push send — and nothing
  // else, not a key with full database access.
  const authHeader = req.headers.get('Authorization') ?? '';
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:danielachmish@gmail.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse({ error: 'VAPID keys are not configured' }, 503);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const nowTime = currentIsraeliTimeHHMMSS();

  const { data: dueSettings, error: settingsError } = await serviceClient
    .from('notification_settings')
    .select('user_id')
    .eq('enabled', true)
    .eq('reminder_time', nowTime);

  if (settingsError) {
    console.error('send-reminder-pushes: failed to read notification_settings:', settingsError);
    return jsonResponse({ error: 'Failed to read notification settings' }, 500);
  }

  const dueUserIds = (dueSettings ?? []).map((row: { user_id: string }) => row.user_id);
  if (dueUserIds.length === 0) {
    return jsonResponse({ sent: 0, failed: 0, at: nowTime });
  }

  const { data: subscriptions, error: subscriptionsError } = await serviceClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', dueUserIds);

  if (subscriptionsError) {
    console.error('send-reminder-pushes: failed to read push_subscriptions:', subscriptionsError);
    return jsonResponse({ error: 'Failed to read push subscriptions' }, 500);
  }

  const payload = JSON.stringify({
    title: 'זמן ללימוד היומי!',
    body: 'בוא/י ללמוד את הלימוד של היום ולשמור על הרצף.',
  });

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err) {
      failed++;
      const statusCode = (err as { statusCode?: number })?.statusCode;
      // 404/410 mean the browser unsubscribed or the endpoint expired —
      // clean it up so future runs don't keep retrying a dead endpoint.
      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(sub.id);
      } else {
        console.error('send-reminder-pushes: push failed for subscription', sub.id, err);
      }
    }
  }

  if (staleIds.length > 0) {
    await serviceClient.from('push_subscriptions').delete().in('id', staleIds);
  }

  return jsonResponse({ sent, failed, staleRemoved: staleIds.length, at: nowTime });
});
