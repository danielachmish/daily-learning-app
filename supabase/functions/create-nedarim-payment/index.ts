// Creates a Nedarim Plus payment (subscription or one-time dedication).
//
// Uses their SERVER-SIDE transaction creation flow ("אייפרם: הקמת עסקה
// בצד שרת" in their official docs — the full API documentation the org
// obtained directly from Nedarim and shared with us), not the client-side
// FinishTransaction2 flow: this server calls their CreateTransaction API
// with the real amount (validated against `settings` prices or the
// dedication's own amount — never trusting a client-supplied number),
// gets back an opaque transaction ID, and hands ONLY that ID to the
// client. The client then just relays that ID into the iframe
// (postMessage({Name:'FinishTransaction', Value: ID})) — it never sees or
// can tamper with the amount, unlike the client-side FinishTransaction2
// flow where the browser holds the full payment payload and a technical
// user could edit it in devtools before it's posted to the iframe.
//
// The actual payment confirmation is handled exclusively by the
// nedarim-callback function (server-to-server, IP-checked) — exactly like
// payment-webhook is the only place Stripe payments get marked paid. The
// postMessage the client receives is for UX only (show a "processing"/
// "thank you" state); it is never trusted to update payment_status itself.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

const CREATE_TRANSACTION_URL =
  'https://matara.pro/nedarimplus/V6/Files/WebServices/DebitIframe.aspx?Action=CreateTransaction';

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

interface CreateTransactionResult {
  ok: boolean;
  id?: string;
  message?: string;
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

async function createNedarimTransaction(fields: Record<string, string>): Promise<CreateTransactionResult> {
  const form = new URLSearchParams(fields);
  const resp = await fetch(CREATE_TRANSACTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  let data: { Status?: string; Message?: string; ID?: string };
  try {
    data = await resp.json();
  } catch {
    return { ok: false, message: 'Unexpected response from Nedarim Plus' };
  }

  if (data.Status !== 'OK' || !data.ID) {
    return { ok: false, message: data.Message ?? 'Nedarim Plus rejected the transaction' };
  }
  return { ok: true, id: data.ID };
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

  try {
    let paymentType: 'HK' | 'Ragil';
    let amount: number;
    let tashlumim: string;
    let comment: string;
    let dedicationId: string | null = null;

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

      paymentType = 'HK';
      amount = Number(priceSetting.value);
      tashlumim = ''; // blank = ongoing standing order, no fixed number of charges
      comment = 'מנוי לימוד יומי';
    } else if (body.type === 'dedication') {
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

      paymentType = 'Ragil';
      amount = dedication.amount;
      tashlumim = '1';
      comment = 'הקדשת לימוד יומי';
      dedicationId = dedication.id;
    } else {
      return jsonResponse({ error: 'Invalid request type' }, 400);
    }

    const { data: payment, error: paymentError } = await serviceClient
      .from('payments')
      .insert({
        user_id: user.id,
        payment_type: body.type,
        related_id: dedicationId,
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

    const result = await createNedarimTransaction({
      Mosad: credentials.mosad,
      ApiValid: credentials.apiValid,
      PaymentType: paymentType,
      Currency: '1',
      Amount: String(amount),
      Tashlumim: tashlumim,
      Zeout: '',
      FirstName: profile?.full_name ?? '',
      LastName: '',
      Street: '',
      City: '',
      Phone: profile?.phone ?? '',
      Mail: profile?.email ?? '',
      Groupe: '',
      Comment: comment,
      Param2: payment.id,
      CallBack: callBackUrl,
      // Recommended by Nedarim to prevent a duplicate charge if this
      // request is retried after a network hiccup.
      AjaxId: crypto.randomUUID(),
    });

    if (!result.ok) {
      await serviceClient
        .from('payments')
        .update({ status: 'failed', raw_event: { createTransactionError: result.message } })
        .eq('id', payment.id);
      return jsonResponse({ error: result.message ?? 'לא ניתן היה לפתוח עסקה מול נדרים פלוס.' }, 502);
    }

    await serviceClient.from('payments').update({ provider_payment_id: result.id }).eq('id', payment.id);

    return jsonResponse({
      iframeUrl: 'https://matara.pro/nedarimplus/iframe?language=he',
      nedarimTransactionId: result.id,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('create-nedarim-payment error:', error);
    return jsonResponse({ error: 'Failed to create payment' }, 500);
  }
});
