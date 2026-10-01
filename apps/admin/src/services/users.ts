import type { AccountStatus, GenderTrack, Language, UserProfile } from '@daily-learning/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

import { logActivity } from './activityLog';

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
  'id, full_name, phone, email, role, gender_track, language, account_status, free_access, track_confirmed, current_streak, best_streak, total_completed_days, created_at, updated_at, last_login_at';

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

export interface UserDetailsUpdate {
  fullName: string;
  phone: string | null;
  genderTrack: GenderTrack;
  language: Language;
}

/** Email is deliberately excluded — it's also the auth login and must change via auth.users, not profiles. */
export async function updateUserDetails(
  supabase: SupabaseClient,
  id: string,
  details: UserDetailsUpdate
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: details.fullName,
      phone: details.phone,
      gender_track: details.genderTrack,
      language: details.language,
    })
    .eq('id', id);
  await logActivity(supabase, {
    action: 'user.update_details',
    entityType: 'user',
    entityId: id,
    status: error ? 'error' : 'success',
    message: error?.message ?? null,
    metadata: { ...details },
  });
  return { error: error?.message ?? null };
}

/**
 * Sets a new password for an existing user, no email involved — the admin
 * communicates it to the subscriber directly (phone call, in person, etc).
 * Goes through the API route (not a direct Supabase call) because setting
 * another user's password requires the service-role key, which must never
 * reach the browser; the route itself re-checks admin status server-side
 * and logs the action (without the password value).
 */
export async function resetUserPassword(id: string, password: string): Promise<{ error: string | null }> {
  const response = await fetch(`/api/users/${id}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const body = await response.json();
  if (!response.ok) return { error: body.error ?? 'איפוס הסיסמה נכשל.' };
  return { error: null };
}

/** Admin-only column, enforced via RPC (see docs — column grant excludes this from plain UPDATE). */
export async function setFreeAccess(
  supabase: SupabaseClient,
  id: string,
  freeAccess: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_free_access', { p_user_id: id, p_free_access: freeAccess });
  await logActivity(supabase, {
    action: 'user.set_free_access',
    entityType: 'user',
    entityId: id,
    status: error ? 'error' : 'success',
    message: error?.message ?? null,
    metadata: { freeAccess },
  });
  return { error: error?.message ?? null };
}

/** Admin-only column, enforced via RPC (see docs — column grant excludes this from plain UPDATE). */
export async function setAccountStatus(
  supabase: SupabaseClient,
  id: string,
  status: AccountStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_account_status', { p_user_id: id, p_account_status: status });
  await logActivity(supabase, {
    action: 'user.set_account_status',
    entityType: 'user',
    entityId: id,
    status: error ? 'error' : 'success',
    message: error?.message ?? null,
    metadata: { accountStatus: status },
  });
  return { error: error?.message ?? null };
}

/** Admin-only column, enforced via RPC (see docs — column grant excludes this from plain UPDATE). */
export async function setRole(
  supabase: SupabaseClient,
  id: string,
  role: 'user' | 'admin'
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_role', { p_user_id: id, p_role: role });
  await logActivity(supabase, {
    action: 'user.set_role',
    entityType: 'user',
    entityId: id,
    status: error ? 'error' : 'success',
    message: error?.message ?? null,
    metadata: { role },
  });
  return { error: error?.message ?? null };
}
