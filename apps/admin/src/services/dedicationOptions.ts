import type { DedicationDurationOption } from '@daily-learning/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Result<T> {
  data: T | null;
  error: string | null;
}

const COLUMNS = 'id, label, duration_days, price, sort_order, active, created_at, updated_at';

/** Admins see every option, including inactive ones (dedication_duration_options_select_active policy). */
export async function fetchDurationOptions(
  supabase: SupabaseClient
): Promise<Result<DedicationDurationOption[]>> {
  const { data, error } = await supabase
    .from('dedication_duration_options')
    .select(COLUMNS)
    .order('sort_order', { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data as DedicationDurationOption[]) ?? [], error: null };
}

export interface DurationOptionInput {
  label: string;
  duration_days: number;
  price: number;
  sort_order: number;
  active: boolean;
}

export async function createDurationOption(
  supabase: SupabaseClient,
  input: DurationOptionInput
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('dedication_duration_options').insert(input);
  return { error: error?.message ?? null };
}

export async function updateDurationOption(
  supabase: SupabaseClient,
  id: string,
  input: DurationOptionInput
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('dedication_duration_options')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteDurationOption(supabase: SupabaseClient, id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('dedication_duration_options').delete().eq('id', id);
  return { error: error?.message ?? null };
}
