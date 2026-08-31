// Periodic safety net for missed Nedarim Plus callbacks. Nedarim's own docs
// are explicit that the CallBack is sent at most once with no retry
// ("העדכון נשלח פעם אחת בלבד") and recommend exactly this pattern for
// closing the gap: "להשלמת פערים מומלץ סנכרון יומי מול הסטוריית עסקאות
// (GetHistoryJson): שמרו את מזהה העסקה האחרון שנקלט, והריצו לולאה עם
// LastId". Run on a schedule via pg_cron (see CRON.md in this directory) —
// not triggered by the app itself.
//
// Only touches `payments` rows already sitting at status='pending' with a
// provider_payment_id we recognize (set when create-nedarim-payment opened
// the transaction) — this never invents a payment from Nedarim's history
// that we don't already have a row for.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { settleDedicationPaid, settlePaymentFailure, settleSubscriptionPaid } from '../_shared/nedarimSettlement.ts';

const HISTORY_URL = 'https://matara.pro/nedarimplus/Reports/Manage3.aspx';
const LAST_ID_SETTING_KEY = 'nedarim_last_history_id';
const MAX_ID_PER_RUN = 500;

interface HistoryRow {
  TransactionId: string;
  Amount: string;
  KevaId?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  // Called by a pg_cron job via net.http_post, which can't supply a
  // Supabase JWT — authenticated instead via its own CRON_SECRET, same
  // pattern as send-reminder-pushes.
  const authHeader = req.headers.get('Authorization') ?? '';
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: settingsRows, error: settingsError } = await supabase
    .from('payment_provider_settings')
    .select('key, value')
    .in('key', ['nedarim_mosad_id', 'nedarim_api_key', LAST_ID_SETTING_KEY]);

  if (settingsError) {
    return jsonResponse({ error: settingsError.message }, 500);
  }

  const settingsMap = new Map((settingsRows ?? []).map((row: { key: string; value: string }) => [row.key, row.value]));
  const mosadId = settingsMap.get('nedarim_mosad_id');
  const apiPassword = settingsMap.get('nedarim_api_key');
  const lastId = settingsMap.get(LAST_ID_SETTING_KEY) ?? '';

  if (!mosadId || !apiPassword) {
    // Not configured yet — quietly no-op rather than error, so the cron
    // job doesn't spam failures before the org has entered their credentials.
    return jsonResponse({ skipped: 'Nedarim Plus not configured' });
  }

  const form = new URLSearchParams({
    Action: 'GetHistoryJson',
    MosadId: mosadId,
    ApiPassword: apiPassword,
    MaxId: String(MAX_ID_PER_RUN),
  });
  if (lastId) form.set('LastId', lastId);

  const historyResp = await fetch(`${HISTORY_URL}?${form.toString()}`);
  let history: HistoryRow[];
  try {
    history = await historyResp.json();
  } catch {
    const text = await historyResp.text().catch(() => '');
    console.error('reconcile-nedarim-history: unexpected response from GetHistoryJson:', text);
    return jsonResponse({ error: 'Unexpected response from Nedarim Plus' }, 502);
  }

  if (!Array.isArray(history) || history.length === 0) {
    return jsonResponse({ checked: 0, settled: 0 });
  }

  let highestId = lastId ? Number(lastId) : 0;
  let settledCount = 0;

  for (const row of history) {
    const transactionId = row.TransactionId;
    if (transactionId && Number(transactionId) > highestId) highestId = Number(transactionId);

    const { data: payment } = await supabase
      .from('payments')
      .select('id, payment_type, related_id, amount, status')
      .eq('provider_payment_id', transactionId)
      .maybeSingle();

    if (!payment || payment.status !== 'pending') continue;

    const today = new Date().toISOString().slice(0, 10);
    const amount = Number(row.Amount);

    try {
      if (amount <= 0) {
        // Per the docs: a cancelled transaction stays in the history but
        // its Amount comes back as 0 — treated as a failure here.
        await settlePaymentFailure(supabase as unknown as SupabaseClient, payment, row, transactionId);
      } else if (payment.payment_type === 'subscription') {
        await settleSubscriptionPaid(
          supabase as unknown as SupabaseClient,
          payment,
          row,
          transactionId,
          row.KevaId ?? null,
          today
        );
      } else {
        await settleDedicationPaid(supabase as unknown as SupabaseClient, payment, row, transactionId, today);
      }
      settledCount += 1;
      console.log('reconcile-nedarim-history: settled a payment nedarim-callback missed', {
        paymentId: payment.id,
        transactionId,
      });
    } catch (error) {
      console.error('reconcile-nedarim-history: failed to settle payment', payment.id, error);
    }
  }

  if (highestId > 0) {
    await supabase
      .from('payment_provider_settings')
      .upsert({ key: LAST_ID_SETTING_KEY, value: String(highestId), updated_at: new Date().toISOString() });
  }

  return jsonResponse({ checked: history.length, settled: settledCount });
});
