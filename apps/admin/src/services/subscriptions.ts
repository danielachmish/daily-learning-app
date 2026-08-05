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
  'id, user_id, plan_type, status, start_date, end_date, payment_provider, provider_customer_id, provider_subscription_id, created_at, updated_at, profiles(full_name, email)';

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
