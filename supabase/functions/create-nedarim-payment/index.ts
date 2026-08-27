// Creates a Nedarim Plus payment (subscription or one-time dedication).
//
// Nedarim Plus's real integration model is an EMBEDDED IFRAME loaded with
// no payment data in its URL — the parent page posts the actual payment
// data to it via postMessage once loaded, and the donor enters card
// details there (so the card never touches our server). Confirmed against
// Nedarim's own sample integration file (matara.pro/nedarimplus/iframe/
// sample2.html — a real code sample, not just their prose description):
// the message posted to the iframe has the shape
// `{ Name: 'FinishTransaction2', Value: { Mosad, ApiValid, ... } }`, and
// the response posted back has the shape
// `{ Name: 'TransactionResponse', Value: { Status, Message, ... } }`
// where Status === 'Error' means failure. See app/payment.web.tsx for the
// client side of this exchange. This function's job is only to hand the
// client the Value fields to send — never the secret ApiPassword — after
// validating the request server-side (real price from `settings`, real
// dedication ownership/amount via RLS) so a client can't just embed
// whatever amount it wants.
//
// The actual payment confirmation is handled exclusively by the
// nedarim-callback function (server-to-server, IP-checked) — exactly like
// payment-webhook is the only place Stripe payments get marked paid. The
// postMessage the client receives is for UX only (show a "processing"/
// "thank you" state); it is never trusted to update payment_status itself.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

interface SubscriptionRequest {
  type: 'subscription';
  planType: 'monthly' | 'yearly';
}

interface DedicationRequest {
  type: 'dedication';
  dedicationId: string;
}

type PaymentRequest = SubscriptionRequest | DedicationRequest;

interface NedarimCredentials {
  mosad: string;
  apiValid: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getNedarimCredentials(
  serviceClient: ReturnType<typeof createClient>
): Promise<NedarimCredentials | null> {
  const { data, error } = await serviceClient
    .from('payment_provider_settings')
    .select('key, value')
    .in('key', ['nedarim_mosad_id', 'nedarim_api_valid']);

  if (error || !data) return null;

  const map = new Map(data.map((row: { key: string; value: string }) => [row.key, row.value]));
  const mosad = map.get('nedarim_mosad_id');
  const apiValid = map.get('nedarim_api_valid');

  if (!mosad || !apiValid) return null;
  return { mosad, apiValid };
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

  // Uses the caller's own JWT for everything the user is allowed to see —
  // reads go through RLS, so a user can only create a payment for their
  // own dedication (dedications_select_own).
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // A separate service-role client is required for payment_provider_settings
  // (admin-only by RLS) and for writing the pending `payments` row —
  // regular users can't insert into payments directly.
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, email')
    .eq('id', user.id)
    .single();

  let body: PaymentRequest;
  try {
    body = (await req.json()) as PaymentRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const credentials = await getNedarimCredentials(serviceClient);
  if (!credentials) {
    return jsonResponse(
      { error: 'Nedarim Plus is not configured yet — an admin needs to set Mosad ID / ApiValid in settings.' },
      503
    );
  }

  const callBackUrl = `${supabaseUrl}/functions/v1/nedarim-callback`;
  // Nedarim charges standing orders on a fixed day-of-month (1-28, per
  // their docs — no 29/30/31 to stay valid in every month). Using "today"
  // (clamped) means the first real charge lands roughly a month from now,
  // same as how the old Stripe subscription flow started billing.
  const day = Math.min(28, Math.max(1, new Date().getDate()));

  try {
    if (body.type === 'subscription') {
      if (body.planType !== 'monthly' && body.planType !== 'yearly') {
        return jsonResponse({ error: 'planType must be "monthly" or "yearly"' }, 400);
      }

      const { data: priceSetting, error: priceError } = await serviceClient
        .from('settings')
        .select('value')
        .eq('key', body.planType === 'monthly' ? 'monthly_price' : 'yearly_price')
        .single();

      if (priceError || !priceSetting) {
        return jsonResponse({ error: 'Subscription pricing is not configured.' }, 503);
      }
      const amount = Number(priceSetting.value);

      const { data: payment, error: paymentError } = await serviceClient
        .from('payments')
        .insert({
          user_id: user.id,
          payment_type: 'subscription',
          related_id: null,
          amount,
          currency: 'ILS',
          status: 'pending',
          payment_provider: 'nedarim_plus',
        })
        .select('id')
        .single();

      if (paymentError || !payment) {
        return jsonResponse({ error: 'Failed to start payment' }, 500);
      }

      return jsonResponse({
        iframeUrl: 'https://matara.pro/nedarimplus/iframe?language=he',
        value: {
          Mosad: credentials.mosad,
          ApiValid: credentials.apiValid,
          PaymentType: 'HK',
          Currency: '1',
          Amount: amount,
          Tashlumim: '', // blank = ongoing standing order, no fixed number of charges
          Day: day,
          Zeout: '',
          FirstName: profile?.full_name ?? '',
          LastName: '',
          Street: '',
          City: '',
          Phone: profile?.phone ?? '',
          Mail: profile?.email ?? '',
          Groupe: '',
          Comment: 'מנוי לימוד יומי',
          CallBack: callBackUrl,
          Param2: payment.id,
        },
        paymentId: payment.id,
      });
    }

    if (body.type === 'dedication') {
      if (!body.dedicationId) {
        return jsonResponse({ error: 'Missing dedicationId' }, 400);
      }

      const { data: dedication, error: dedicationError } = await supabase
        .from('dedications')
        .select('id, amount, payment_status')
        .eq('id', body.dedicationId)
        .single();

      if (dedicationError || !dedication) {
        return jsonResponse({ error: 'Dedication not found' }, 404);
      }
      if (dedication.payment_status !== 'pending') {
        return jsonResponse({ error: 'This dedication is not awaiting payment' }, 400);
      }

      const { data: payment, error: paymentError } = await serviceClient
        .from('payments')
        .insert({
          user_id: user.id,
          payment_type: 'dedication',
          related_id: dedication.id,
          amount: dedication.amount,
          currency: 'ILS',
          status: 'pending',
          payment_provider: 'nedarim_plus',
        })
        .select('id')
        .single();

      if (paymentError || !payment) {
        return jsonResponse({ error: 'Failed to start payment' }, 500);
      }

      return jsonResponse({
        iframeUrl: 'https://matara.pro/nedarimplus/iframe?language=he',
        value: {
          Mosad: credentials.mosad,
          ApiValid: credentials.apiValid,
          PaymentType: 'Ragil',
          Currency: '1',
          Amount: dedication.amount,
          Tashlumim: '1',
          Zeout: '',
          FirstName: profile?.full_name ?? '',
          LastName: '',
          Street: '',
          City: '',
          Phone: profile?.phone ?? '',
          Mail: profile?.email ?? '',
          Groupe: '',
          Comment: 'הקדשת לימוד יומי',
          CallBack: callBackUrl,
          Param2: payment.id,
        },
        paymentId: payment.id,
      });
    }

    return jsonResponse({ error: 'Invalid request type' }, 400);
  } catch (error) {
    console.error('create-nedarim-payment error:', error);
    return jsonResponse({ error: 'Failed to create payment' }, 500);
  }
});
