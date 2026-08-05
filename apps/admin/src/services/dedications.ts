import type { ApprovalStatus, Dedication, DedicationType, PaymentStatus } from '@daily-learning/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

export const DEDICATIONS_PAGE_SIZE = 20;

export interface DedicationFilters {
  date?: string;
  paymentStatus?: PaymentStatus;
  approvalStatus?: ApprovalStatus;
  type?: DedicationType;
}

export interface PagedDedications {
  dedications: Dedication[];
  totalCount: number;
}

interface Result<T> {
  data: T | null;
  error: string | null;
}

const DEDICATION_COLUMNS =
  'id, user_id, dedication_date, type, dedication_text, donor_name, amount, payment_status, approval_status, payment_provider, provider_payment_id, created_at, approved_at';

export async function fetchDedications(
  supabase: SupabaseClient,
  page: number,
  filters: DedicationFilters
): Promise<Result<PagedDedications>> {
  let query = supabase
    .from('dedications')
    .select(DEDICATION_COLUMNS, { count: 'exact' })
    .order('dedication_date', { ascending: false });

  if (filters.date) query = query.eq('dedication_date', filters.date);
  if (filters.paymentStatus) query = query.eq('payment_status', filters.paymentStatus);
  if (filters.approvalStatus) query = query.eq('approval_status', filters.approvalStatus);
  if (filters.type) query = query.eq('type', filters.type);

  const from = (page - 1) * DEDICATIONS_PAGE_SIZE;
  const to = from + DEDICATIONS_PAGE_SIZE - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) return { data: null, error: error.message };
  return {
    data: { dedications: (data as Dedication[]) ?? [], totalCount: count ?? 0 },
    error: null,
  };
}

export async function fetchDedicationById(supabase: SupabaseClient, id: string): Promise<Result<Dedication>> {
  const { data, error } = await supabase.from('dedications').select(DEDICATION_COLUMNS).eq('id', id).single();
  if (error) return { data: null, error: error.message };
  return { data: data as Dedication, error: null };
}

async function setApprovalStatus(
  supabase: SupabaseClient,
  id: string,
  status: ApprovalStatus
): Promise<Result<Dedication>> {
  const { data, error } = await supabase
    .from('dedications')
    .update({ approval_status: status, approved_at: status === 'approved' ? new Date().toISOString() : null })
    .eq('id', id)
    .select(DEDICATION_COLUMNS)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Dedication, error: null };
}

export function approveDedication(supabase: SupabaseClient, id: string) {
  return setApprovalStatus(supabase, id, 'approved');
}

export function rejectDedication(supabase: SupabaseClient, id: string) {
  return setApprovalStatus(supabase, id, 'rejected');
}

export function hideDedication(supabase: SupabaseClient, id: string) {
  return setApprovalStatus(supabase, id, 'hidden');
}

export async function updateDedicationText(
  supabase: SupabaseClient,
  id: string,
  dedicationText: string
): Promise<Result<Dedication>> {
  const { data, error } = await supabase
    .from('dedications')
    .update({ dedication_text: dedicationText })
    .eq('id', id)
    .select(DEDICATION_COLUMNS)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Dedication, error: null };
}
