import type { SupabaseClient } from '@supabase/supabase-js';

export interface Prices {
  monthlyPrice: string;
  yearlyPrice: string;
}

interface Result<T> {
  data: T | null;
  error: string | null;
}

const MONTHLY_KEY = 'monthly_price';
const YEARLY_KEY = 'yearly_price';

/**
 * Subscription prices — read by the mobile app's paywall and by
 * create-nedarim-payment (which is the one place that actually charges
 * this amount; a price change here takes effect on the next checkout
 * attempt, never retroactively on an existing subscription).
 */
export async function fetchPrices(supabase: SupabaseClient): Promise<Result<Prices>> {
  const { data, error } = await supabase.from('settings').select('key, value').in('key', [MONTHLY_KEY, YEARLY_KEY]);

  if (error) return { data: null, error: error.message };

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    data: {
      monthlyPrice: map.get(MONTHLY_KEY) ?? '',
      yearlyPrice: map.get(YEARLY_KEY) ?? '',
    },
    error: null,
  };
}

export async function savePrices(supabase: SupabaseClient, prices: Prices): Promise<{ error: string | null }> {
  const { error } = await supabase.from('settings').upsert([
    { key: MONTHLY_KEY, value: prices.monthlyPrice, updated_at: new Date().toISOString() },
    { key: YEARLY_KEY, value: prices.yearlyPrice, updated_at: new Date().toISOString() },
  ]);

  if (error) return { error: error.message };
  return { error: null };
}
