// Shared "mark this payment paid/failed" logic used by both nedarim-callback
// (the real-time server-to-server confirmation) and reconcile-nedarim-history
// (the periodic safety-net sync via GetHistoryJson, for the rare case a
// CallBack is lost in transit — see their docs: "העדכון נשלח פעם אחת בלבד").
// Kept in one place so the two paths can never silently diverge on what
// "paid" actually means.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface PaymentRow {
  id: string;
  payment_type: string;
  related_id: string | null;
  amount: number;
  status: string;
}

export async function settlePaymentFailure(
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

export async function settleSubscriptionPaid(
  supabase: SupabaseClient,
  payment: PaymentRow,
  rawEvent: Record<string, unknown>,
  transactionId: string | null,
  kevaId: string | null,
  today: string
): Promise<void> {
  const { data: fullPayment } = await supabase
    .from('payments')
    .select('user_id, plan_type, trial_days')
    .eq('id', payment.id)
    .single();
  const userId = fullPayment?.user_id;
  if (!userId) throw new Error('Payment has no associated user');

  // Payments created before plan_type was stored: infer monthly vs yearly
  // from the amount against the configured prices.
  let planType: 'monthly' | 'yearly' | null = fullPayment.plan_type;
  if (!planType) {
    const { data: priceRows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['monthly_price', 'yearly_price']);
    const prices = new Map((priceRows ?? []).map((r: { key: string; value: string }) => [r.key, Number(r.value)]));
    planType = Math.abs(payment.amount - (prices.get('yearly_price') ?? -1)) < 0.01 ? 'yearly' : 'monthly';
  }

  if (fullPayment.trial_days) {
    await settleTrialStarted(supabase, payment, rawEvent, transactionId, kevaId, userId, planType, fullPayment.trial_days);
    return;
  }

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
      // Only a monthly plan is an actual standing order (HK) with a real
      // KevaId to freeze/reactivate/cancel later -- yearly is billed as a
      // one-time charge (Ragil, see create-nedarim-payment), so there's no
      // Keva at all. Storing the one-off transaction id here instead would
      // make the admin panel's "הקפא/בטל הוראת קבע" buttons appear for a
      // subscription that has no recurring charge to actually manage.
      provider_subscription_id: planType === 'monthly' ? (kevaId ?? transactionId) : null,
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

/**
 * A free-trial standing order was set up: the card is authorized but
 * nothing is charged until the trial's last day (StartFrom). Access runs
 * through that day; the first real charge then arrives as a Keva charge
 * (settleKevaCharge) and extends it by the plan period.
 */
async function settleTrialStarted(
  supabase: SupabaseClient,
  payment: PaymentRow,
  rawEvent: Record<string, unknown>,
  transactionId: string | null,
  kevaId: string | null,
  userId: string,
  planType: 'monthly' | 'yearly',
  trialDays: number
): Promise<void> {
  const startDate = new Date();
  const trialEnd = new Date(startDate);
  trialEnd.setDate(trialEnd.getDate() + trialDays);
  const trialEndDate = trialEnd.toISOString().slice(0, 10);

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_type: planType,
      status: 'active',
      start_date: startDate.toISOString().slice(0, 10),
      end_date: trialEndDate,
      trial_ends_at: trialEndDate,
      payment_provider: 'nedarim_plus',
      // Both plans are a standing order during a trial (yearly as a
      // single-charge HK), so both have a Keva to cancel.
      provider_subscription_id: kevaId ?? transactionId,
    })
    .select('id')
    .single();
  if (subscriptionError) throw subscriptionError;

  await supabase.from('profiles').update({ trial_used_at: new Date().toISOString() }).eq('id', userId);

  // No money moved — recorded as a ₪0 settled payment so the payment
  // screen's poll sees 'paid' and no revenue is counted.
  await supabase
    .from('payments')
    .update({
      status: 'paid',
      amount: 0,
      related_id: subscription.id,
      provider_payment_id: transactionId,
      raw_event: rawEvent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id);
}

/**
 * A charge on an existing standing order (Keva) — a monthly renewal, or
 * the first charge after a free trial. Before this existed, these charges
 * were dropped (the CallBack reuses the original payment id, already
 * settled), so a paying monthly subscriber's end_date never moved and
 * access lapsed after the first month.
 *
 * Idempotent by transaction id, so nedarim-callback and
 * reconcile-nedarim-history can both feed it the same charge.
 * Returns false when the Keva doesn't match any subscription.
 */
export async function settleKevaCharge(
  supabase: SupabaseClient,
  kevaId: string,
  transactionId: string | null,
  amount: number,
  rawEvent: Record<string, unknown>,
  today: string
): Promise<boolean> {
  if (transactionId) {
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('provider_payment_id', transactionId)
      .maybeSingle();
    if (existing) return true;
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_type, start_date, end_date, trial_ends_at')
    .eq('provider_subscription_id', kevaId)
    .eq('payment_provider', 'nedarim_plus')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!subscription) return false;

  // A regular (non-trial) standing order already got its first period when
  // it was set up; Nedarim's collection robot makes that first charge a
  // few hours later, so a charge that close to the start is that same
  // period, not a renewal.
  const daysSinceStart = (Date.parse(today) - Date.parse(subscription.start_date)) / 86_400_000;
  const alreadyCovered = !subscription.trial_ends_at && daysSinceStart <= 3;

  const { error: insertError } = await supabase.from('payments').insert({
    user_id: subscription.user_id,
    payment_type: 'subscription',
    related_id: subscription.id,
    amount,
    currency: 'ILS',
    status: 'paid',
    payment_provider: 'nedarim_plus',
    provider_payment_id: transactionId,
    plan_type: subscription.plan_type,
    raw_event: rawEvent,
  });
  if (insertError) {
    // Unique provider_payment_id: the other path settled it first.
    if (insertError.code === '23505') return true;
    throw insertError;
  }

  if (alreadyCovered) return true;

  const base = new Date(subscription.end_date > today ? subscription.end_date : today);
  if (subscription.plan_type === 'yearly') base.setFullYear(base.getFullYear() + 1);
  else base.setMonth(base.getMonth() + 1);

  await supabase
    .from('subscriptions')
    .update({ status: 'active', end_date: base.toISOString().slice(0, 10), updated_at: new Date().toISOString() })
    .eq('id', subscription.id);

  await supabase.rpc('increment_daily_revenue', {
    p_date: today,
    p_subscription_amount: amount,
    p_dedication_amount: 0,
  });
  return true;
}

export async function settleDedicationPaid(
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
