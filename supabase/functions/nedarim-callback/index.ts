// Server-to-server payment confirmation from Nedarim Plus (the CallBack
// URL passed in create-nedarim-payment). This is the ONLY place a Nedarim
// payment actually gets marked paid — mirrors payment-webhook (Stripe)
// being the sole writer of payment_status there. The client-side
// postMessage the iframe sends back is for UX only (show a "thank you"
// state) and is never trusted to move money on its own; a malicious
// client could fake a postMessage, it can't fake a POST from Nedarim's
// own servers.
//
// ⚠ FIELD NAMES BELOW ARE BEST-EFFORT, NOT CONFIRMED. Nedarim's support
// answer confirmed there IS a JSON callback and that Param2 is
// recommended specifically so we can cross-reference it against our
// stored request — but did not give the exact JSON shape (it lives in
// their dashboard's own API docs, under "עוד > תיעוד API", which only the
// org can access). This checks several plausible field-name variants
// (their other params are PascalCase: Mosad, Amount, Tashlumim) and
// always stores the full raw body in payments.raw_event regardless, so
// nothing is lost even where the guess is wrong. Once someone downloads
// that MD doc from the dashboard, the STATUS_FIELDS / SUCCESS_VALUES
// lists below should be corrected against it.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_IPS = ['18.196.146.117', '18.194.219.73'];

// Candidate field names for "did this succeed", checked in order.
const STATUS_FIELDS = ['Status', 'Sstatus', 'StatusCode', 'Success', 'Dvarim'];
const SUCCESS_VALUES = ['1', 'true', 'ok', 'success', 'תקין'];
const ERROR_FIELDS = ['ErrorMessage', 'Error', 'ErrorCode', 'Shgia'];
// Candidate field names for the transaction/standing-order id Nedarim assigns.
const TRANSACTION_ID_FIELDS = ['TransactionId', 'Id', 'Zeout', 'Hk', 'HkMspar'];

function getClientIp(req: Request): string | null {
  // Supabase's edge runtime (like most platforms behind a proxy) exposes
  // the real client IP via x-forwarded-for; the first entry is the
  // original client when there's a proxy chain.
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

function findField(body: Record<string, unknown>, candidates: string[]): string | null {
  for (const key of candidates) {
    if (key in body && body[key] !== null && body[key] !== undefined) {
      return String(body[key]);
    }
  }
  return null;
}

function looksSuccessful(body: Record<string, unknown>): boolean {
  const statusValue = findField(body, STATUS_FIELDS);
  if (statusValue && SUCCESS_VALUES.includes(statusValue.toLowerCase())) return true;

  const errorValue = findField(body, ERROR_FIELDS);
  // No recognizable error field and no explicit status field to check
  // against — fall back to "no error reported" as a weak success signal.
  if (!errorValue && !statusValue) return true;
  if (errorValue && (errorValue === '0' || errorValue.trim() === '')) return true;

  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const clientIp = getClientIp(req);
  if (!clientIp || !ALLOWED_IPS.includes(clientIp)) {
    console.error('nedarim-callback: rejected request from unrecognized IP:', clientIp);
    return new Response('Forbidden', { status: 403 });
  }

  const rawBody = await req.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error('nedarim-callback: non-JSON body:', rawBody);
    return new Response('Invalid JSON', { status: 400 });
  }

  const paymentId = findField(body, ['Param2']);
  if (!paymentId) {
    console.error('nedarim-callback: missing Param2, cannot match to a pending payment:', rawBody);
    return new Response('Missing Param2', { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: payment, error: paymentLookupError } = await supabase
    .from('payments')
    .select('id, payment_type, related_id, amount, status')
    .eq('id', paymentId)
    .single();

  if (paymentLookupError || !payment) {
    console.error('nedarim-callback: no payment found for Param2:', paymentId);
    return new Response('Unknown payment', { status: 404 });
  }

  // Idempotency: if this payment was already resolved, don't double-process
  // (e.g. Nedarim retrying a callback that already succeeded on our end).
  if (payment.status !== 'pending') {
    return new Response('Already processed', { status: 200 });
  }

  // Cross-check the amount, as Nedarim's own support recommended, in case
  // Param2 alone were ever replayed against a different amount.
  const reportedAmount = findField(body, ['Amount', 'Sum']);
  if (reportedAmount && Math.abs(Number(reportedAmount) - Number(payment.amount)) > 0.01) {
    console.error('nedarim-callback: amount mismatch', { paymentId, expected: payment.amount, reportedAmount });
    await supabase
      .from('payments')
      .update({ status: 'failed', raw_event: body, updated_at: new Date().toISOString() })
      .eq('id', paymentId);
    return new Response('Amount mismatch', { status: 400 });
  }

  const success = looksSuccessful(body);
  const transactionId = findField(body, TRANSACTION_ID_FIELDS);
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (!success) {
      await handleFailure(supabase, payment, body, transactionId);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    if (payment.payment_type === 'subscription') {
      await handleSubscriptionPaid(supabase, payment, body, transactionId, today);
    } else {
      await handleDedicationPaid(supabase, payment, body, transactionId, today);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('nedarim-callback: handler error:', error);
    return new Response('Handler failed', { status: 500 });
  }
});

interface PaymentRow {
  id: string;
  payment_type: string;
  related_id: string | null;
  amount: number;
  status: string;
}

async function handleFailure(
  supabase: SupabaseClient,
  payment: PaymentRow,
  rawEvent: Record<string, unknown>,
  transactionId: string | null
): Promise<void> {
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      provider_payment_id: transactionId,
      raw_event: rawEvent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  if (payment.payment_type === 'dedication' && payment.related_id) {
    await supabase.from('dedications').update({ payment_status: 'failed' }).eq('id', payment.related_id);
  }
}

async function handleSubscriptionPaid(
  supabase: SupabaseClient,
  payment: PaymentRow,
  rawEvent: Record<string, unknown>,
  transactionId: string | null,
  today: string
): Promise<void> {
  // We need the user id and plan type, which live on the payment row's
  // owner — fetched fresh since create-nedarim-payment didn't persist
  // plan_type on the payments row itself.
  const { data: fullPayment } = await supabase.from('payments').select('user_id').eq('id', payment.id).single();
  const userId = fullPayment?.user_id;
  if (!userId) throw new Error('Payment has no associated user');

  // Plan type isn't stored on `payments` — infer monthly vs yearly from
  // amount against the configured prices (set by the same admin settings
  // screen that configured Nedarim credentials).
  const { data: priceRows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['monthly_price', 'yearly_price']);
  const prices = new Map((priceRows ?? []).map((r: { key: string; value: string }) => [r.key, Number(r.value)]));
  const planType = Math.abs(payment.amount - (prices.get('yearly_price') ?? -1)) < 0.01 ? 'yearly' : 'monthly';

  const startDate = new Date();
  const endDate = new Date(startDate);
  if (planType === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
  else endDate.setMonth(endDate.getMonth() + 1);

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_type: planType,
      status: 'active',
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      payment_provider: 'nedarim_plus',
      provider_subscription_id: transactionId,
    })
    .select('id')
    .single();
  if (subscriptionError) throw subscriptionError;

  await supabase
    .from('payments')
    .update({
      status: 'paid',
      related_id: subscription.id,
      provider_payment_id: transactionId,
      raw_event: rawEvent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  await supabase.rpc('increment_daily_revenue', {
    p_date: today,
    p_subscription_amount: payment.amount,
    p_dedication_amount: 0,
  });
}

async function handleDedicationPaid(
  supabase: SupabaseClient,
  payment: PaymentRow,
  rawEvent: Record<string, unknown>,
  transactionId: string | null,
  today: string
): Promise<void> {
  if (!payment.related_id) throw new Error('Dedication payment has no related dedication');

  await supabase.from('dedications').update({ payment_status: 'paid' }).eq('id', payment.related_id);

  await supabase
    .from('payments')
    .update({
      status: 'paid',
      provider_payment_id: transactionId,
      raw_event: rawEvent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  await supabase.rpc('increment_daily_revenue', {
    p_date: today,
    p_subscription_amount: 0,
    p_dedication_amount: payment.amount,
  });
}
