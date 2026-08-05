import type { SupabaseClient } from '@supabase/supabase-js';

import { daysAgo, getMonthRange, toDateOnlyString } from '../utils/date';

export const REVENUE_HISTORY_PAGE_SIZE = 20;

interface Result<T> {
  data: T | null;
  error: string | null;
}

export interface DashboardSummary {
  totalUsers: number;
  activeSubscriptions: number;
  newUsersToday: number;
  newUsersThisMonth: number;
  learnedToday: number;
  learnedThisWeek: number;
  learnedThisMonth: number;
  dedicationsToday: number;
  dedicationsThisMonth: number;
  pendingDedications: number;
  monthSubscriptionRevenue: number;
  monthDedicationRevenue: number;
  monthTotalRevenue: number;
}

export async function fetchDashboardSummary(supabase: SupabaseClient): Promise<Result<DashboardSummary>> {
  const now = new Date();
  const today = toDateOnlyString(now);
  const weekStart = daysAgo(6);
  const { start: monthStart, end: monthEnd } = getMonthRange(now.getFullYear(), now.getMonth());
  const todayStartIso = `${today}T00:00:00.000Z`;
  const monthStartIso = `${monthStart}T00:00:00.000Z`;

  try {
    const [
      totalUsersRes,
      activeSubscriptionsRes,
      newUsersTodayRes,
      newUsersThisMonthRes,
      learnedTodayRes,
      learnedWeekRes,
      learnedMonthRes,
      dedicationsTodayRes,
      dedicationsMonthRes,
      pendingDedicationsRes,
      revenueMonthRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStartIso),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthStartIso),
      supabase.from('daily_lesson_stats').select('completed_count').eq('lesson_date', today),
      supabase.from('daily_lesson_stats').select('completed_count').gte('lesson_date', weekStart).lte('lesson_date', today),
      supabase.from('daily_lesson_stats').select('completed_count').gte('lesson_date', monthStart).lte('lesson_date', monthEnd),
      supabase.from('dedications').select('id', { count: 'exact', head: true }).eq('dedication_date', today),
      supabase
        .from('dedications')
        .select('id', { count: 'exact', head: true })
        .gte('dedication_date', monthStart)
        .lte('dedication_date', monthEnd),
      supabase.from('dedications').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
      supabase
        .from('daily_revenue_stats')
        .select('subscription_revenue, dedication_revenue, total_revenue')
        .gte('stat_date', monthStart)
        .lte('stat_date', monthEnd),
    ]);

    const firstError = [
      totalUsersRes,
      activeSubscriptionsRes,
      newUsersTodayRes,
      newUsersThisMonthRes,
      learnedTodayRes,
      learnedWeekRes,
      learnedMonthRes,
      dedicationsTodayRes,
      dedicationsMonthRes,
      pendingDedicationsRes,
      revenueMonthRes,
    ].find((r) => r.error)?.error;

    if (firstError) {
      return { data: null, error: firstError.message };
    }

    const sumCompleted = (rows: { completed_count: number }[] | null) =>
      (rows ?? []).reduce((sum, row) => sum + row.completed_count, 0);

    const revenueRows = revenueMonthRes.data ?? [];

    return {
      data: {
        totalUsers: totalUsersRes.count ?? 0,
        activeSubscriptions: activeSubscriptionsRes.count ?? 0,
        newUsersToday: newUsersTodayRes.count ?? 0,
        newUsersThisMonth: newUsersThisMonthRes.count ?? 0,
        learnedToday: sumCompleted(learnedTodayRes.data),
        learnedThisWeek: sumCompleted(learnedWeekRes.data),
        learnedThisMonth: sumCompleted(learnedMonthRes.data),
        dedicationsToday: dedicationsTodayRes.count ?? 0,
        dedicationsThisMonth: dedicationsMonthRes.count ?? 0,
        pendingDedications: pendingDedicationsRes.count ?? 0,
        monthSubscriptionRevenue: revenueRows.reduce((s, r) => s + Number(r.subscription_revenue), 0),
        monthDedicationRevenue: revenueRows.reduce((s, r) => s + Number(r.dedication_revenue), 0),
        monthTotalRevenue: revenueRows.reduce((s, r) => s + Number(r.total_revenue), 0),
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to load dashboard' };
  }
}

export interface RevenueHistoryRow {
  stat_date: string;
  subscription_revenue: number;
  dedication_revenue: number;
  total_revenue: number;
}

export interface PagedRevenueHistory {
  rows: RevenueHistoryRow[];
  totalCount: number;
}

export async function fetchRevenueHistory(
  supabase: SupabaseClient,
  page: number,
  dateFrom?: string,
  dateTo?: string
): Promise<Result<PagedRevenueHistory>> {
  let query = supabase
    .from('daily_revenue_stats')
    .select('stat_date, subscription_revenue, dedication_revenue, total_revenue', { count: 'exact' })
    .order('stat_date', { ascending: false });

  if (dateFrom) query = query.gte('stat_date', dateFrom);
  if (dateTo) query = query.lte('stat_date', dateTo);

  const from = (page - 1) * REVENUE_HISTORY_PAGE_SIZE;
  const to = from + REVENUE_HISTORY_PAGE_SIZE - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) return { data: null, error: error.message };
  return { data: { rows: (data as RevenueHistoryRow[]) ?? [], totalCount: count ?? 0 }, error: null };
}
