// Creates a Stripe Checkout Session for a subscription (monthly/yearly) or a
// one-time dedication payment. The client only ever receives a redirect URL
// — it never touches card data or sets any payment/approval status itself.
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

// Custom URL scheme (see apps/mobile/app.json "scheme") — Stripe Checkout
// redirects here after payment; the app listens for it via
// WebBrowser.openAuthSessionAsync and dismisses the browser automatically.
const SUCCESS_URL = 'dailylearning://payment-complete?status=success';
const CANCEL_URL = 'dailylearning://payment-complete?status=cancel';

interface SubscriptionRequest {
  type: 'subscription';
  planType: 'monthly' | 'yearly';
}

interface DedicationRequest {
  type: 'dedication';
  dedicationId: string;
}

type CheckoutRequest = SubscriptionRequest | DedicationRequest;

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

  // Uses the caller's own JWT — reads go through RLS, so a user can only
  // ever create a checkout session for their own dedication (dedications_select_own).
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

  let body: CheckoutRequest;
  try {
    body = (await req.json()) as CheckoutRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  try {
    if (body.type === 'subscription') {
      if (body.planType !== 'monthly' && body.planType !== 'yearly') {
        return jsonResponse({ error: 'planType must be "monthly" or "yearly"' }, 400);
      }

      const priceId =
        body.planType === 'monthly'
          ? Deno.env.get('STRIPE_PRICE_MONTHLY')
          : Deno.env.get('STRIPE_PRICE_YEARLY');

      if (!priceId) {
        return jsonResponse({ error: 'Subscription pricing is not configured' }, 500);
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: SUCCESS_URL,
        cancel_url: CANCEL_URL,
        client_reference_id: user.id,
        metadata: { type: 'subscription', user_id: user.id, plan_type: body.planType },
      });

      return jsonResponse({ url: session.url });
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

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'ils',
              product_data: { name: 'הקדשת לימוד יומי' },
              unit_amount: Math.round(Number(dedication.amount) * 100),
            },
            quantity: 1,
          },
        ],
        success_url: SUCCESS_URL,
        cancel_url: CANCEL_URL,
        client_reference_id: user.id,
        metadata: { type: 'dedication', dedication_id: dedication.id, user_id: user.id },
      });

      return jsonResponse({ url: session.url });
    }

    return jsonResponse({ error: 'Invalid request type' }, 400);
  } catch (error) {
    console.error('create-checkout-session error:', error);
    return jsonResponse({ error: 'Failed to create checkout session' }, 500);
  }
});
