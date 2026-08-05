import type { AccountStatus, GenderTrack, Language, UserProfile } from '@daily-learning/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

export const USERS_PAGE_SIZE = 20;

export interface PagedUsers {
  users: UserProfile[];
  totalCount: number;
}

interface Result<T> {
  data: T | null;
  error: string | null;
}

const USER_COLUMNS =
  'id, full_name, phone, email, role, gender_track, language, account_status, free_access, current_streak, best_streak, total_completed_days, created_at, updated_at, last_login_at';

/** Strips characters that would break PostgREST's or() filter syntax. */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()]/g, '').trim();
}

export async function fetchUsers(
  supabase: SupabaseClient,
  page: number,
  search: string
): Promise<Result<PagedUsers>> {
  let query = supabase.from('profiles').select(USER_COLUMNS, { count: 'exact' }).order('created_at', { ascending: false });

  const term = sanitizeSearchTerm(search);
  if (term) {
    query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const from = (page - 1) * USERS_PAGE_SIZE;
  const to = from + USERS_PAGE_SIZE - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) return { data: null, error: error.message };
  return { data: { users: (data as UserProfile[]) ?? [], totalCount: count ?? 0 }, error: null };
}

export async function fetchUserById(supabase: SupabaseClient, id: string): Promise<Result<UserProfile>> {
  const { data, error } = await supabase.from('profiles').select(USER_COLUMNS).eq('id', id).single();
  if (error) return { data: null, error: error.message };
  return { data: data as UserProfile, error: null };
}

export async function updateUserTrackAndLanguage(
  supabase: SupabaseClient,
  id: string,
  genderTrack: GenderTrack,
  language: Language
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ gender_track: genderTrack, language })
    .eq('id', id);
  return { error: error?.message ?? null };
}

/** Admin-only column, enforced via RPC (see docs — column grant excludes this from plain UPDATE). */
export async function setFreeAccess(
  supabase: SupabaseClient,
  id: string,
  freeAccess: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_free_access', { p_user_id: id, p_free_access: freeAccess });
  return { error: error?.message ?? null };
}

/** Admin-only column, enforced via RPC (see docs — column grant excludes this from plain UPDATE). */
export async function setAccountStatus(
  supabase: SupabaseClient,
  id: string,
  status: AccountStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_account_status', { p_user_id: id, p_account_status: status });
  return { error: error?.message ?? null };
}
