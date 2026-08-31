import type { PlanType, Subscription, SubscriptionStatus } from '@daily-learning/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

export const SUBSCRIPTIONS_PAGE_SIZE = 20;

export interface SubscriptionFilters {
  status?: SubscriptionStatus;
  planType?: PlanType;
}

interface SubscriptionRow extends Subscription {
  profiles: { full_name: string; email: string } | null;
}

export interface PagedSubscriptions {
  subscriptions: SubscriptionRow[];
  totalCount: number;
}

interface Result<T> {
  data: T | null;
  error: string | null;
}

const SUBSCRIPTION_COLUMNS =
  'id, user_id, plan_type, status, start_date, end_date, payment_provider, provider_customer_id, provider_subscription_id, keva_frozen_at, created_at, updated_at, profiles(full_name, email)';

export async function fetchSubscriptions(
  supabase: SupabaseClient,
  page: number,
  filters: SubscriptionFilters
): Promise<Result<PagedSubscriptions>> {
  let query = supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_COLUMNS, { count: 'exact' })
    .order('end_date', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.planType) query = query.eq('plan_type', filters.planType);

  const from = (page - 1) * SUBSCRIPTIONS_PAGE_SIZE;
  const to = from + SUBSCRIPTIONS_PAGE_SIZE - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) return { data: null, error: error.message };
  return {
    data: { subscriptions: (data as unknown as SubscriptionRow[]) ?? [], totalCount: count ?? 0 },
    error: null,
  };
}

export async function extendSubscription(
  supabase: SupabaseClient,
  id: string,
  newEndDate: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ end_date: newEndDate, status: 'active' })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function cancelSubscription(supabase: SupabaseClient, id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('subscriptions').update({ status: 'canceled' }).eq('id', id);
  return { error: error?.message ?? null };
}

/**
 * Freezes, reactivates, or cancels the actual Nedarim Plus standing order
 * behind a subscription (not just our own DB row) — see
 * apps/admin/src/app/api/subscriptions/keva/route.ts. Use this instead of
 * cancelSubscription for anything with payment_provider === 'nedarim_plus',
 * or the customer's card keeps getting charged after "cancellation".
 */
export async function manageNedarimKeva(
  subscriptionId: string,
  action: 'freeze' | 'reactivate' | 'cancel'
): Promise<{ error: string | null }> {
  try {
    const resp = await fetch('/api/subscriptions/keva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId, action }),
    });
    const data = await resp.json();
    if (!resp.ok) return { error: data.error ?? 'הפעולה נכשלה.' };
    return { error: null };
  } catch {
    return { error: 'שגיאת תקשורת.' };
  }
}
