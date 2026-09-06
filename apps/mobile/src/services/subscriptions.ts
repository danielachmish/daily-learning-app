import { supabase } from './supabase';

export interface ActiveSubscriptionSummary {
  planType: 'monthly' | 'yearly';
  endDate: string;
}

/**
 * The current user's active subscription, if any — used only to show the
 * "your yearly plan is about to end" banner (DailyLessonScreen). Monthly
 * subscribers never see it: their plan renews itself automatically via
 * Nedarim Plus's standing order, unlike yearly (a one-time charge with no
 * renewal at all — see create-nedarim-payment's own comment on this).
 */
export async function fetchActiveSubscription(
  userId: string
): Promise<{ subscription: ActiveSubscriptionSummary | null; error: string | null }> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan_type, end_date')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { subscription: null, error: error.message };
  if (!data) return { subscription: null, error: null };

  return {
    subscription: { planType: data.plan_type, endDate: data.end_date },
    error: null,
  };
}
