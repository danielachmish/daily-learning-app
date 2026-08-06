// Creates a Nedarim Plus payment (subscription or one-time dedication).
//
// STATUS: infrastructure only. Everything up to "TODO: Nedarim Plus API
// call" below is real and complete — auth, credential retrieval from the
// admin-configured settings, and request validation. The actual call to
// Nedarim Plus's API is still a stub, pending their technical contact's
// answer on the exact endpoint/fields for creating a one-time charge vs a
// recurring instruction (see docs/ discussion — no public "create a new
// standing order" action was visible in their permission list, only
// manage/list/pause/delete for existing ones).
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
  mosadId: string;
  apiKey: string;
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
    .in('key', ['nedarim_mosad_id', 'nedarim_api_key']);

  if (error || !data) return null;

  const map = new Map(data.map((row: { key: string; value: string }) => [row.key, row.value]));
  const mosadId = map.get('nedarim_mosad_id');
  const apiKey = map.get('nedarim_api_key');

  if (!mosadId || !apiKey) return null;
  return { mosadId, apiKey };
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

  // A separate service-role client is required for the credentials lookup
  // specifically: payment_provider_settings is admin-only by RLS, and a
  // regular user's JWT must never be able to read it — the service role
  // bypasses RLS entirely, which is exactly why it's the only thing
  // allowed to touch this table outside the admin panel.
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Not authenticated' }, 401);
  }

  let body: PaymentRequest;
  try {
    body = (await req.json()) as PaymentRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const credentials = await getNedarimCredentials(serviceClient);
  if (!credentials) {
    return jsonResponse(
      { error: 'Nedarim Plus is not configured yet — an admin needs to set the Mosad ID and API key in settings.' },
      503
    );
  }

  try {
    if (body.type === 'subscription') {
      if (body.planType !== 'monthly' && body.planType !== 'yearly') {
        return jsonResponse({ error: 'planType must be "monthly" or "yearly"' }, 400);
      }

      // TODO: Nedarim Plus API call — create a recurring charge (הוראת
      // קבע) for this plan and return the hosted payment page URL. Needs
      // confirmation from their technical contact on how a NEW standing
      // order is actually created (see comment at top of file).
      return jsonResponse({ error: 'Nedarim Plus subscription payments are not implemented yet.' }, 501);
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

      // TODO: Nedarim Plus API call — create a single charge (ביצוע חיוב
      // בודד) for dedication.amount and return the hosted payment page
      // URL, using credentials.mosadId / credentials.apiKey.
      return jsonResponse({ error: 'Nedarim Plus dedication payments are not implemented yet.' }, 501);
    }

    return jsonResponse({ error: 'Invalid request type' }, 400);
  } catch (error) {
    console.error('create-nedarim-payment error:', error);
    return jsonResponse({ error: 'Failed to create payment' }, 500);
  }
});
