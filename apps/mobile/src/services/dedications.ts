import type { Dedication, DedicationDurationOption, DedicationType } from '@daily-learning/shared';

import { supabase } from './supabase';
import { toDateOnlyString } from '../utils/date';

const DEDICATION_COLUMNS =
  'id, user_id, dedication_date, end_date, duration_option_id, type, dedication_text, donor_name, amount, payment_status, approval_status, payment_provider, provider_payment_id, created_at, approved_at';

/** Admin-managed duration/price tiers — replaces the old single flat dedication_price setting. */
export async function fetchDurationOptions(): Promise<{ options: DedicationDurationOption[]; error: string | null }> {
  const { data, error } = await supabase
    .from('dedication_duration_options')
    .select('id, label, duration_days, price, sort_order, active, created_at, updated_at')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) return { options: [], error: error.message };
  return { options: (data as DedicationDurationOption[]) ?? [], error: null };
}

/** Efficient count-only query — used for the "X מקדישים היום" line on the lesson screen. */
export async function fetchTodayDedicationsCount(): Promise<{ count: number; error: string | null }> {
  const today = toDateOnlyString(new Date());

  const { count, error } = await supabase
    .from('dedications')
    .select('id', { count: 'exact', head: true })
    .lte('dedication_date', today)
    .gte('end_date', today)
    .eq('payment_status', 'paid')
    .eq('approval_status', 'approved');

  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0, error: null };
}

/** Only paid + approved dedications covering today are ever shown publicly. */
export async function fetchTodayDedications(): Promise<{ dedications: Dedication[]; error: string | null }> {
  const today = toDateOnlyString(new Date());

  const { data, error } = await supabase
    .from('dedications')
    .select(DEDICATION_COLUMNS)
    .lte('dedication_date', today)
    .gte('end_date', today)
    .eq('payment_status', 'paid')
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: true });

  if (error) return { dedications: [], error: error.message };
  return { dedications: (data as Dedication[]) ?? [], error: null };
}

export async function fetchMyDedications(
  userId: string
): Promise<{ dedications: Dedication[]; error: string | null }> {
  const { data, error } = await supabase
    .from('dedications')
    .select(DEDICATION_COLUMNS)
    .eq('user_id', userId)
    .order('dedication_date', { ascending: false });

  if (error) return { dedications: [], error: error.message };
  return { dedications: (data as Dedication[]) ?? [], error: null };
}

export interface CreateDedicationInput {
  dedicationDate: string;
  durationOptionId: string;
  type: DedicationType;
  dedicationText: string;
  donorName: string;
}

/**
 * Creates a dedication via the create_dedication() RPC — NOT a plain
 * insert. The price is looked up server-side from the chosen duration
 * option; the client never gets to say what the amount is (a plain insert
 * used to let it set `amount` directly, a real price-tampering gap).
 * payment_status/approval_status still fall through to their DB defaults.
 */
export async function createDedication(
  input: CreateDedicationInput
): Promise<{ dedication: Dedication | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_dedication', {
    p_dedication_date: input.dedicationDate,
    p_duration_option_id: input.durationOptionId,
    p_type: input.type,
    p_dedication_text: input.dedicationText,
    p_donor_name: input.donorName,
  });

  if (error) return { dedication: null, error: error.message };
  return { dedication: data as Dedication, error: null };
}

/** RLS only allows deleting a dedication that is still pending payment. */
export async function deleteDedication(dedicationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('dedications').delete().eq('id', dedicationId);
  if (error) return { error: error.message };
  return { error: null };
}
