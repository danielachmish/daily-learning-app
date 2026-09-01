// Server-to-server payment confirmation from Nedarim Plus (the CallBack
// URL passed in create-nedarim-payment). This is the ONLY real-time place a
// Nedarim payment actually gets marked paid — mirrors payment-webhook
// (Stripe) being the sole writer of payment_status there. The client-side
// postMessage the iframe sends back is for UX only (show a "thank you"
// state) and is never trusted to move money on its own; a malicious client
// could fake a postMessage, it can't fake a POST from Nedarim's own
// servers. reconcile-nedarim-history is the periodic safety net for the
// rare case this callback is lost in transit — Nedarim's own docs say
// "העדכון נשלח פעם אחת בלבד" (sent once only), no automatic retry.
//
// Field names below are now confirmed against Nedarim Plus's full official
// API documentation (obtained directly from the org): Status/Message/ID/
// TransactionId/KevaId are exact. Status is 'OK' or 'Error' — anything
// else would be unexpected, but treated as failure defensively.
//
// The payment is matched by a `paymentId` query param on the CallBack URL
// itself (set in create-nedarim-payment), NOT by the documented Param2
// field — confirmed live against their sandbox that Param2 comes back
// EMPTY on a standing-order (HK) creation callback, even though it's sent
// exactly as documented on the CreateTransaction request. The URL-embedded
// id has no such dependency: they call the CallBack URL verbatim
// regardless of what ends up in the JSON body.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { settleDedicationPaid, settlePaymentFailure, settleSubscriptionPaid } from '../_shared/nedarimSettlement.ts';

const ALLOWED_IPS = ['18.196.146.117', '18.194.219.73'];

function getClientIp(req: Request): string | null {
  // Supabase's edge runtime (like most platforms behind a proxy) exposes
  // the real client IP via x-forwarded-for; the first entry is the
  // original client when there's a proxy chain.
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

function stringField(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  if (value === null || value === undefined || value === '') return null;
  return String(value);
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

  const paymentId = new URL(req.url).searchParams.get('paymentId');
  if (!paymentId) {
    console.error('nedarim-callback: missing paymentId query param, cannot match to a pending payment:', rawBody);
    return new Response('Missing paymentId', { status: 400 });
  }

  // Defense in depth: when Param2 does come through, it should agree with
  // the URL-embedded id — a mismatch would mean something is very wrong
  // (not treated as fatal on its own, since Param2 is the less reliable of
  // the two, but worth knowing about).
  const param2 = stringField(body, 'Param2');
  if (param2 && param2 !== paymentId) {
    console.error('nedarim-callback: Param2/paymentId mismatch', { paymentId, param2 });
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
    console.error('nedarim-callback: no payment found for paymentId:', paymentId);
    return new Response('Unknown payment', { status: 404 });
  }

  // Idempotency: if this payment was already resolved, don't double-process
  // (e.g. Nedarim retrying a callback that already succeeded on our end, or
  // reconcile-nedarim-history having already caught it first).
  if (payment.status !== 'pending') {
    return new Response('Already processed', { status: 200 });
  }

  // Cross-check the amount, as Nedarim's own docs recommend, in case Param2
  // alone were ever replayed against a different amount.
  const reportedAmount = stringField(body, 'Amount');
  if (reportedAmount && Math.abs(Number(reportedAmount) - Number(payment.amount)) > 0.01) {
    console.error('nedarim-callback: amount mismatch', { paymentId, expected: payment.amount, reportedAmount });
    await supabase
      .from('payments')
      .update({ status: 'failed', raw_event: body, updated_at: new Date().toISOString() })
      .eq('id', paymentId);
    return new Response('Amount mismatch', { status: 400 });
  }

  const success = body.Status !== 'Error';
  const transactionId = stringField(body, 'ID') ?? stringField(body, 'TransactionId');
  // Confirmed live: a standing-order CREATION callback (TransactionType
  // "הקמת הו"ק") carries the new Keva's id in `ID` directly and has no
  // separate `KevaId` key at all — that key only shows up on later
  // callbacks for an EXISTING standing order (a recurring monthly charge,
  // or a decline). Since every 'subscription' payment here is HK, falling
  // back to the transaction id itself for that case is correct, not a guess.
  const kevaId = stringField(body, 'KevaId') ?? (payment.payment_type === 'subscription' ? transactionId : null);
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (!success) {
      await settlePaymentFailure(supabase as unknown as SupabaseClient, payment, body, transactionId);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    if (payment.payment_type === 'subscription') {
      await settleSubscriptionPaid(supabase as unknown as SupabaseClient, payment, body, transactionId, kevaId, today);
    } else {
      await settleDedicationPaid(supabase as unknown as SupabaseClient, payment, body, transactionId, today);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('nedarim-callback: handler error:', error);
    return new Response('Handler failed', { status: 500 });
  }
});
