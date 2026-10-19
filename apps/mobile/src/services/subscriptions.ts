import { supabase } from './supabase';

export interface ActiveSubscriptionSummary {
  planType: 'monthly' | 'yearly';
  endDate: string;
  /** Last day of the free trial — null when the subscription had none. */
  trialEndsAt: string | null;
  /** Set once the subscriber canceled from the app (access runs until endDate). */
  canceledAt: string | null;
}

/**
 * The current user's active subscription, if any — used for the daily
 * lesson screen's banners: the free-trial banner (days left + cancel), and
 * the "your yearly plan is about to end" banner. Monthly subscribers never
 * see the latter: their plan renews itself automatically via Nedarim
 * Plus's standing order, unlike yearly (a one-time charge with no renewal
 * at all — see create-nedarim-payment's own comment on this).
 */
export async function fetchActiveSubscription(
  userId: string
): Promise<{ subscription: ActiveSubscriptionSummary | null; error: string | null }> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan_type, end_date, trial_ends_at, canceled_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { subscription: null, error: error.message };
  if (!data) return { subscription: null, error: null };

  return {
    subscription: {
      planType: data.plan_type,
      endDate: data.end_date,
      trialEndsAt: data.trial_ends_at,
      canceledAt: data.canceled_at,
    },
    error: null,
  };
}

/** Whether checkout would start with a free trial for this user right now. */
export async function fetchFreeTrialOffer(): Promise<{ days: number | null }> {
  const [{ data: eligible }, { data: daysRow }] = await Promise.all([
    supabase.rpc('free_trial_eligible'),
    supabase.from('settings').select('value').eq('key', 'free_trial_days').maybeSingle(),
  ]);
  const days = Number(daysRow?.value ?? '7');
  return { days: eligible === true && Number.isInteger(days) && days > 0 ? days : null };
}

/** Cancels the user's own standing order at Nedarim (see cancel-my-subscription). */
export async function cancelMySubscription(): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ canceled?: boolean; error?: string }>(
    'cancel-my-subscription'
  );
  if (error) {
    // The function's own Hebrew message, when it returned one.
    const context = (error as { context?: Response }).context;
    const body = await context?.json?.().catch(() => null);
    return { error: body?.error ?? error.message };
  }
  return { error: data?.canceled ? null : (data?.error ?? 'הביטול נכשל.') };
}
