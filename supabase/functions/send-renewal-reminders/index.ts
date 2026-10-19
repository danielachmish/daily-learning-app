// Reminds yearly subscribers before their subscription lapses, and free-trial
// subscribers before their first charge.
//
// Monthly subscribers don't need this — their plan is an ongoing Nedarim
// Plus standing order (HK) that renews itself automatically. Yearly is
// billed as a one-time charge (see create-nedarim-payment) with NO
// automatic renewal at all (Nedarim's standing orders are monthly-only —
// there's no such thing as an annual one), so a yearly subscriber who
// isn't reminded could simply lose access with no warning.
//
// This is push notifications only — best-effort, since not every user has
// granted push permission (see send-reminder-pushes' own header comment on
// web push reliability). The reliable backstop is the in-app banner
// (apps/mobile/src/screens/DailyLessonScreen.tsx), which checks the same
// end_date live every time the user opens the app regardless of whether
// this push ever reached them.
//
// Runs daily via pg_cron (see CRON.md) and sends at exactly three
// milestones — 14, 7, and 1 day before end_date — rather than every day
// during that window, so a subscriber isn't nagged daily for two weeks.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

import { corsHeaders } from '../_shared/cors.ts';

const REMINDER_DAYS_BEFORE = [14, 7, 1];
// Free trial: one heads-up before the first charge.
const TRIAL_REMINDER_DAYS_BEFORE = 2;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function addDays(date: Date, days: number): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Called by a pg_cron job via net.http_post, same CRON_SECRET pattern as
  // send-reminder-pushes and reconcile-nedarim-history.
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

  const today = new Date();
  const targetDates = REMINDER_DAYS_BEFORE.map((days) => ({
    days,
    date: addDays(today, days),
  }));

  const { data: yearlySubscriptions, error: subscriptionsError } = await serviceClient
    .from('subscriptions')
    .select('id, user_id, end_date, trial_ends_at')
    .eq('plan_type', 'yearly')
    .eq('status', 'active')
    .in(
      'end_date',
      targetDates.map((t) => t.date)
    );

  // Free trials whose first charge is TRIAL_REMINDER_DAYS_BEFORE days away
  // (end_date still equals trial_ends_at = not charged yet, not canceled).
  const trialChargeDate = addDays(today, TRIAL_REMINDER_DAYS_BEFORE);
  const { data: trialSubscriptions, error: trialError } = await serviceClient
    .from('subscriptions')
    .select('id, user_id, plan_type, end_date, trial_ends_at')
    .eq('status', 'active')
    .eq('trial_ends_at', trialChargeDate)
    .eq('end_date', trialChargeDate)
    .is('canceled_at', null);

  if (subscriptionsError || trialError) {
    console.error('send-renewal-reminders: failed to read subscriptions:', subscriptionsError ?? trialError);
    return jsonResponse({ error: 'Failed to read subscriptions' }, 500);
  }

  const reminders: { userId: string; title: string; body: string }[] = [];
  for (const subscription of yearlySubscriptions ?? []) {
    // Still inside a free trial — the trial reminder below covers it.
    if (subscription.trial_ends_at === subscription.end_date) continue;
    const daysLeft = targetDates.find((t) => t.date === subscription.end_date)?.days;
    reminders.push({
      userId: subscription.user_id,
      title: 'המנוי שלך עומד להסתיים',
      body:
        daysLeft === 1
          ? 'המנוי השנתי שלך יסתיים מחר! חדש/י עכשיו כדי לא לאבד גישה.'
          : `המנוי השנתי שלך יסתיים בעוד ${daysLeft} ימים. חדש/י עכשיו כדי לא לאבד גישה.`,
    });
  }
  for (const subscription of trialSubscriptions ?? []) {
    reminders.push({
      userId: subscription.user_id,
      title: 'שבוע הניסיון מסתיים בקרוב',
      body: `בעוד ${TRIAL_REMINDER_DAYS_BEFORE} ימים יתחיל החיוב על המנוי ה${
        subscription.plan_type === 'yearly' ? 'שנתי' : 'חודשי'
      }. רוצה להמשיך? לא צריך לעשות כלום. לביטול — במסך הלימוד באפליקציה.`,
    });
  }

  if (reminders.length === 0) {
    return jsonResponse({ sent: 0, failed: 0, checked: 0 });
  }

  const userIds = reminders.map((r) => r.userId);
  const { data: pushSubs, error: pushSubsError } = await serviceClient
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);

  if (pushSubsError) {
    console.error('send-renewal-reminders: failed to read push_subscriptions:', pushSubsError);
    return jsonResponse({ error: 'Failed to read push subscriptions' }, 500);
  }

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  for (const reminder of reminders) {
    const payload = JSON.stringify({ title: reminder.title, body: reminder.body });

    const subsForUser = (pushSubs ?? []).filter((p: { user_id: string }) => p.user_id === reminder.userId);
    for (const pushSub of subsForUser) {
      try {
        await webpush.sendNotification(
          { endpoint: pushSub.endpoint, keys: { p256dh: pushSub.p256dh, auth: pushSub.auth } },
          payload
        );
        sent++;
      } catch (err) {
        failed++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(pushSub.id);
        } else {
          console.error('send-renewal-reminders: push failed for subscription', pushSub.id, err);
        }
      }
    }
  }

  if (staleIds.length > 0) {
    await serviceClient.from('push_subscriptions').delete().in('id', staleIds);
  }

  return jsonResponse({ checked: reminders.length, sent, failed, staleRemoved: staleIds.length });
});
