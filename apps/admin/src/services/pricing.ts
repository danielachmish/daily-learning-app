import type { SupabaseClient } from '@supabase/supabase-js';

import { logActivity } from './activityLog';

export type FreeTrialMode = 'off' | 'admins' | 'all';

export interface Prices {
  monthlyPrice: string;
  yearlyPrice: string;
  /** Free trial rollout: off, only admins (for testing), or everyone. */
  freeTrialMode: FreeTrialMode;
  freeTrialDays: string;
}

interface Result<T> {
  data: T | null;
  error: string | null;
}

const MONTHLY_KEY = 'monthly_price';
const YEARLY_KEY = 'yearly_price';
const TRIAL_MODE_KEY = 'free_trial_mode';
const TRIAL_DAYS_KEY = 'free_trial_days';

/**
 * Subscription prices — read by the mobile app's paywall and by
 * create-nedarim-payment (which is the one place that actually charges
 * this amount; a price change here takes effect on the next checkout
 * attempt, never retroactively on an existing subscription).
 */
export async function fetchPrices(supabase: SupabaseClient): Promise<Result<Prices>> {
  const { data, error } = await supabase.from('settings').select('key, value').in('key', [MONTHLY_KEY, YEARLY_KEY, TRIAL_MODE_KEY, TRIAL_DAYS_KEY]);

  if (error) return { data: null, error: error.message };

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    data: {
      monthlyPrice: map.get(MONTHLY_KEY) ?? '',
      yearlyPrice: map.get(YEARLY_KEY) ?? '',
      freeTrialMode: (map.get(TRIAL_MODE_KEY) as FreeTrialMode | undefined) ?? 'off',
      freeTrialDays: map.get(TRIAL_DAYS_KEY) ?? '7',
    },
    error: null,
  };
}

export async function savePrices(supabase: SupabaseClient, prices: Prices): Promise<{ error: string | null }> {
  const { error } = await supabase.from('settings').upsert([
    { key: MONTHLY_KEY, value: prices.monthlyPrice, updated_at: new Date().toISOString() },
    { key: YEARLY_KEY, value: prices.yearlyPrice, updated_at: new Date().toISOString() },
    { key: TRIAL_MODE_KEY, value: prices.freeTrialMode, updated_at: new Date().toISOString() },
    { key: TRIAL_DAYS_KEY, value: prices.freeTrialDays, updated_at: new Date().toISOString() },
  ]);

  await logActivity(supabase, {
    action: 'settings.save_prices',
    entityType: 'settings',
    status: error ? 'error' : 'success',
    message: error?.message ?? null,
    metadata: prices as unknown as Record<string, unknown>,
  });

  if (error) return { error: error.message };
  return { error: null };
}
