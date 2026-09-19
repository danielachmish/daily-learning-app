import type { SupabaseClient } from '@supabase/supabase-js';

export type ActivityStatus = 'success' | 'error';

export interface ActivityLogEntry {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  status: ActivityStatus;
  message: string | null;
  metadata: Record<string, unknown> | null;
}

interface LogInput {
  action: string;
  entityType?: string;
  entityId?: string | null;
  status: ActivityStatus;
  message?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort activity logging for admin mutations — every create/update/
 * delete/upload across the panel writes one row here on both success and
 * failure, so a partial failure (like one day silently dropping out of a
 * multi-day lesson import) leaves a durable, queryable trace instead of
 * only a transient on-screen message that's gone the moment the tab
 * changes or reloads.
 *
 * Never throws and never blocks/fails the calling operation — a logging
 * problem must not become a second, confusing error layered on top of
 * whatever the admin was actually trying to do. Uses getSession() (local,
 * no network round-trip) rather than getUser() (which re-validates
 * against the auth server) since this fires on every single mutation and
 * doesn't need that extra guarantee just to attribute a log line.
 */
export async function logActivity(supabase: SupabaseClient, entry: LogInput): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    await supabase.from('admin_activity_log').insert({
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      status: entry.status,
      message: entry.message ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch {
    // Nowhere further to report a logging failure — swallow it.
  }
}

export const ACTIVITY_LOG_PAGE_SIZE = 30;

export interface ActivityLogFilters {
  status?: ActivityStatus;
  action?: string;
}

export interface PagedActivityLog {
  entries: ActivityLogEntry[];
  totalCount: number;
}

export async function fetchActivityLog(
  supabase: SupabaseClient,
  page: number,
  filters: ActivityLogFilters
): Promise<{ data: PagedActivityLog | null; error: string | null }> {
  let query = supabase
    .from('admin_activity_log')
    .select('id, created_at, actor_email, action, entity_type, entity_id, status, message, metadata', {
      count: 'exact',
    })
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.action) query = query.eq('action', filters.action);

  const from = (page - 1) * ACTIVITY_LOG_PAGE_SIZE;
  const to = from + ACTIVITY_LOG_PAGE_SIZE - 1;

  const { data, error, count } = await query.range(from, to);
  if (error) return { data: null, error: error.message };
  return { data: { entries: (data as ActivityLogEntry[]) ?? [], totalCount: count ?? 0 }, error: null };
}

/** Distinct action values seen so far, for the log page's filter dropdown. */
export async function fetchDistinctActions(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from('admin_activity_log').select('action').limit(1000);
  if (!data) return [];
  return Array.from(new Set(data.map((row) => row.action as string))).sort();
}
