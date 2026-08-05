// Verified Stripe webhook handler — the ONLY place payment_status /
// subscriptions / payments / daily_revenue_stats get updated from a payment
// event. Uses the service role key (bypasses RLS) precisely because Stripe's
// signature check, not a user JWT, is what proves this request is trusted.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('Stripe-Signature');
  const rawBody = await req.text();

  if (!signature) {
    return new Response('Missing Stripe-Signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return new Response('Invalid signature', { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(supabase, event);
    } else if (event.type === 'checkout.session.expired') {
      await handleCheckoutExpired(supabase, event);
    }
    // Other event types are intentionally ignored.

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response('Webhook handler failed', { status: 500 });
  }
});

async function alreadyProcessed(supabase: SupabaseClient, providerPaymentId: string): Promise<boolean> {
  const { data } = await supabase
    .from('payments')
    .select('id')
    .eq('provider_payment_id', providerPaymentId)
    .maybeSingle();
  return data !== null;
}

async function handleCheckoutCompleted(supabase: SupabaseClient, event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};

  if (await alreadyProcessed(supabase, session.id)) {
    return;
  }

  const amount = (session.amount_total ?? 0) / 100;
  const today = new Date().toISOString().slice(0, 10);

  if (metadata.type === 'subscription') {
    const userId = metadata.user_id;
    const planType = metadata.plan_type;

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (planType === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: planType,
        status: 'active',
        start_date: startDate.toISOString().slice(0, 10),
        end_date: endDate.toISOString().slice(0, 10),
        payment_provider: 'stripe',
        provider_customer_id: typeof session.customer === 'string' ? session.customer : null,
        provider_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
      })
      .select('id')
      .single();

    if (subscriptionError) throw subscriptionError;

    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: userId,
      payment_type: 'subscription',
      related_id: subscription.id,
      amount,
      currency: 'ILS',
      status: 'paid',
      payment_provider: 'stripe',
      provider_payment_id: session.id,
      raw_event: event as unknown as Record<string, unknown>,
    });
    if (paymentError) throw paymentError;

    const { error: revenueError } = await supabase.rpc('increment_daily_revenue', {
      p_date: today,
      p_subscription_amount: amount,
      p_dedication_amount: 0,
    });
    if (revenueError) throw revenueError;
  } else if (metadata.type === 'dedication') {
    const dedicationId = metadata.dedication_id;

    const { error: dedicationError } = await supabase
      .from('dedications')
      .update({ payment_status: 'paid' })
      .eq('id', dedicationId);
    if (dedicationError) throw dedicationError;

    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: metadata.user_id,
      payment_type: 'dedication',
      related_id: dedicationId,
      amount,
      currency: 'ILS',
      status: 'paid',
      payment_provider: 'stripe',
      provider_payment_id: session.id,
      raw_event: event as unknown as Record<string, unknown>,
    });
    if (paymentError) throw paymentError;

    const { error: revenueError } = await supabase.rpc('increment_daily_revenue', {
      p_date: today,
      p_subscription_amount: 0,
      p_dedication_amount: amount,
    });
    if (revenueError) throw revenueError;
  }
}

async function handleCheckoutExpired(supabase: SupabaseClient, event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};

  if (await alreadyProcessed(supabase, session.id)) {
    return;
  }

  if (metadata.type === 'dedication' && metadata.dedication_id) {
    await supabase.from('dedications').update({ payment_status: 'failed' }).eq('id', metadata.dedication_id);
  }

  await supabase.from('payments').insert({
    user_id: metadata.user_id ?? null,
    payment_type: metadata.type === 'dedication' ? 'dedication' : 'subscription',
    related_id: metadata.dedication_id ?? null,
    amount: (session.amount_total ?? 0) / 100,
    currency: 'ILS',
    status: 'failed',
    payment_provider: 'stripe',
    provider_payment_id: session.id,
    raw_event: event as unknown as Record<string, unknown>,
  });
}
