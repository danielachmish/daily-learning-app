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
      // KevaId (the standing-order id) is what freeze/reactivate/cancel
      // need — not the one-off transaction id. Falls back to the
      // transaction id for a plain one-time charge that isn't a standing
      // order (shouldn't normally happen for a subscription, but keeps
      // this column non-null either way).
      provider_subscription_id: kevaId ?? transactionId,
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
