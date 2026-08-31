// Receives Nedarim Plus's separate "Siruv" (decline) webhook — configured
// via Manage3.aspx Action=SetWebhook&Type=Siruv (see the admin panel's
// settings page, "הפעלת התראות על תשלומים שנכשלו" button, which registers
// this function's own URL as that webhook automatically).
//
// This exists specifically for STANDING-ORDER renewal failures: the main
// CallBack (nedarim-callback) only fires on success — "עדכון נשלח על עסקה
// מוצלחת בלבד" per their docs — so without this, a subscription whose card
// starts failing its monthly charge would sit at status='active' in our
// database forever, since nothing would ever tell us the renewal stopped
// working. A first-checkout decline (Source: Transaction) is already shown
// to the payer immediately via the client-side TransactionResponse in
// app/payment.web.tsx, so this handler's only DB-changing case is
// Source: Keva.
//
// Same IP-verification approach as nedarim-callback — no signature exists
// on either webhook, per the docs' own security notes.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_IPS = ['18.196.146.117', '18.194.219.73'];

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

interface SiruvBody {
  Status?: string; // always "Error" for this webhook per the docs — kept as a sanity check, not branched on
  Message?: string;
  ErrorTime?: string;
  Source?: 'Transaction' | 'Keva';
  KevaId?: string;
  IsFirstKevaTry?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const clientIp = getClientIp(req);
  if (!clientIp || !ALLOWED_IPS.includes(clientIp)) {
    console.error('nedarim-siruv-webhook: rejected request from unrecognized IP:', clientIp);
    return new Response('Forbidden', { status: 403 });
  }

  const rawBody = await req.text();
  let body: SiruvBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error('nedarim-siruv-webhook: non-JSON body:', rawBody);
    return new Response('Invalid JSON', { status: 400 });
  }

  // Always log the raw decline for visibility/debugging even when there's
  // nothing actionable to do with it (e.g. a first-checkout decline, or a
  // Keva failure we can't match to a known standing order).
  console.log('nedarim-siruv-webhook: decline received', body);

  if (body.Source !== 'Keva' || !body.KevaId) {
    // A regular checkout decline — the payer already saw this live via the
    // client-side TransactionResponse. Nothing to update here.
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: subscription, error: lookupError } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('provider_subscription_id', body.KevaId)
    .eq('payment_provider', 'nedarim_plus')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error('nedarim-siruv-webhook: lookup failed:', lookupError);
    return new Response('Lookup failed', { status: 500 });
  }

  if (!subscription) {
    // Could be a standing order we don't recognize (e.g. created outside
    // this app), or one whose KevaId we haven't linked. Logged above;
    // nothing more we can safely do without a match.
    console.warn('nedarim-siruv-webhook: no subscription found for KevaId:', body.KevaId);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // Only move a still-active subscription — don't overwrite a status an
  // admin already changed by hand (e.g. already canceled).
  if (subscription.status === 'active') {
    await supabase
      .from('subscriptions')
      .update({ status: 'payment_failed', updated_at: new Date().toISOString() })
      .eq('id', subscription.id);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
