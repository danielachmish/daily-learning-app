import type { Dedication, DedicationType } from '@daily-learning/shared';

import { supabase } from './supabase';
import { toDateOnlyString } from '../utils/date';

const DEDICATION_COLUMNS =
  'id, user_id, dedication_date, type, dedication_text, donor_name, amount, payment_status, approval_status, payment_provider, provider_payment_id, created_at, approved_at';

/** Current dedication price from settings (public, admin-editable). */
export async function fetchDedicationPrice(): Promise<{ price: number | null; error: string | null }> {
  const { data, error } = await supabase.from('settings').select('value').eq('key', 'dedication_price').maybeSingle();

  if (error) return { price: null, error: error.message };
  if (!data) return { price: null, error: null };

  const parsed = Number(data.value);
  return { price: Number.isFinite(parsed) ? parsed : null, error: null };
}

/** Efficient count-only query — used for the "X מקדישים היום" line on the lesson screen. */
export async function fetchTodayDedicationsCount(): Promise<{ count: number; error: string | null }> {
  const today = toDateOnlyString(new Date());

  const { count, error } = await supabase
    .from('dedications')
    .select('id', { count: 'exact', head: true })
    .eq('dedication_date', today)
    .eq('payment_status', 'paid')
    .eq('approval_status', 'approved');

  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0, error: null };
}

/** Only paid + approved dedications are ever shown publicly. */
export async function fetchTodayDedications(): Promise<{ dedications: Dedication[]; error: string | null }> {
  const today = toDateOnlyString(new Date());

  const { data, error } = await supabase
    .from('dedications')
    .select(DEDICATION_COLUMNS)
    .eq('dedication_date', today)
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
  userId: string;
  dedicationDate: string;
  type: DedicationType;
  dedicationText: string;
  donorName: string;
  amount: number;
}

/**
 * Creates a dedication. payment_status/approval_status are never sent from
 * the client — they fall through to the DB defaults ('pending'/'pending'),
 * so there is no field here a client could set to fake a paid/approved state.
 */
export async function createDedication(
  input: CreateDedicationInput
): Promise<{ dedication: Dedication | null; error: string | null }> {
  const { data, error } = await supabase
    .from('dedications')
    .insert({
      user_id: input.userId,
      dedication_date: input.dedicationDate,
      type: input.type,
      dedication_text: input.dedicationText,
      donor_name: input.donorName || null,
      amount: input.amount,
    })
    .select(DEDICATION_COLUMNS)
    .single();

  if (error) return { dedication: null, error: error.message };
  return { dedication: data as Dedication, error: null };
}

/** RLS only allows deleting a dedication that is still pending payment. */
export async function deleteDedication(dedicationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('dedications').delete().eq('id', dedicationId);
  if (error) return { error: error.message };
  return { error: null };
}
