import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActivityLogEntry } from './activityLog';

export type EventLevel = 'info' | 'warning' | 'error';
export type EventSource = 'app' | 'server' | 'admin';

export interface AppEventEntry {
  id: string;
  created_at: string;
  source: EventSource;
  level: EventLevel;
  event: string;
  user_id: string | null;
  user_email: string | null;
  message: string | null;
  context: Record<string, unknown> | null;
}

export const APP_EVENT_PAGE_SIZE = 50;

export type EventPeriod = '1h' | '24h' | '7d' | '30d' | 'all';

export interface AppEventFilters {
  level?: EventLevel;
  /** 'problems' = warning + error together — the default view. */
  levelGroup?: 'problems';
  source?: EventSource;
  event?: string;
  userSearch?: string;
  period: EventPeriod;
}

const PERIOD_MS: Record<Exclude<EventPeriod, 'all'>, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const COLUMNS = 'id, created_at, source, level, event, user_id, user_email, message, context';

function applyFilters<T extends { eq: (c: string, v: string) => T; in: (c: string, v: string[]) => T; gte: (c: string, v: string) => T; ilike: (c: string, v: string) => T }>(
  query: T,
  filters: AppEventFilters
): T {
  let q = query;
  if (filters.level) q = q.eq('level', filters.level);
  else if (filters.levelGroup === 'problems') q = q.in('level', ['warning', 'error']);
  if (filters.source) q = q.eq('source', filters.source);
  if (filters.event) q = q.eq('event', filters.event);
  const search = filters.userSearch?.trim();
  if (search) q = q.ilike('user_email', `%${search.replace(/[%_]/g, '')}%`);
  if (filters.period !== 'all') {
    q = q.gte('created_at', new Date(Date.now() - PERIOD_MS[filters.period]).toISOString());
  }
  return q;
}

export async function fetchAppEvents(
  supabase: SupabaseClient,
  page: number,
  filters: AppEventFilters
): Promise<{ data: { entries: AppEventEntry[]; totalCount: number } | null; error: string | null }> {
  const base = supabase
    .from('app_event_log')
    .select(COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false });
  const from = (page - 1) * APP_EVENT_PAGE_SIZE;
  const { data, error, count } = await applyFilters(base, filters).range(from, from + APP_EVENT_PAGE_SIZE - 1);
  if (error) return { data: null, error: error.message };
  return { data: { entries: (data as AppEventEntry[]) ?? [], totalCount: count ?? 0 }, error: null };
}

/** For "copy all problems": up to `limit` matching rows, newest first. */
export async function fetchAppEventsForReport(
  supabase: SupabaseClient,
  filters: AppEventFilters,
  limit = 60
): Promise<{ entries: AppEventEntry[]; error: string | null }> {
  const base = supabase.from('app_event_log').select(COLUMNS).order('created_at', { ascending: false });
  const { data, error } = await applyFilters(base, filters).limit(limit);
  if (error) return { entries: [], error: error.message };
  return { entries: (data as AppEventEntry[]) ?? [], error: null };
}

/** Counts for the summary strip at the top of the page (last 24h). */
export async function fetchLast24hCounts(
  supabase: SupabaseClient
): Promise<{ errors: number; warnings: number; loginFailures: number }> {
  const since = new Date(Date.now() - PERIOD_MS['24h']).toISOString();
  const head = { count: 'exact' as const, head: true };
  const [errors, warnings, logins] = await Promise.all([
    supabase.from('app_event_log').select('id', head).eq('level', 'error').gte('created_at', since),
    supabase.from('app_event_log').select('id', head).eq('level', 'warning').gte('created_at', since),
    supabase
      .from('app_event_log')
      .select('id', head)
      .in('event', ['auth.login_failed', 'admin.login_failed'])
      .gte('created_at', since),
  ]);
  return { errors: errors.count ?? 0, warnings: warnings.count ?? 0, loginFailures: logins.count ?? 0 };
}

/** Distinct event codes seen recently, for the filter dropdown. */
export async function fetchDistinctEvents(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from('app_event_log')
    .select('event')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (!data) return [];
  return Array.from(new Set(data.map((row) => row.event as string))).sort();
}

// ---------------------------------------------------------------------------
// Copy-paste reports. The point of these is to be pasted straight into a
// conversation with Claude (or a developer) — so they're plain text, carry
// every technical detail (exact error text, codes, stack, screen, device),
// and say up front which repo/table they came from.
// ---------------------------------------------------------------------------

function formatTime(iso: string): string {
  const local = new Date(iso).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  return `${local} (שעון ישראל) | ${iso}`;
}

function formatEntryBody(entry: AppEventEntry): string {
  const lines = [
    `זמן: ${formatTime(entry.created_at)}`,
    `רמה: ${entry.level}`,
    `מקור: ${entry.source}`,
    `אירוע: ${entry.event}`,
    `משתמש: ${entry.user_email ?? '—'}${entry.user_id ? ` (id: ${entry.user_id})` : ''}`,
    `הודעה: ${entry.message ?? '—'}`,
  ];
  if (entry.context && Object.keys(entry.context).length > 0) {
    lines.push('פרטים טכניים:', JSON.stringify(entry.context, null, 2));
  }
  lines.push(`מזהה רשומה: ${entry.id}`);
  return lines.join('\n');
}

const REPORT_HEADER =
  'דיווח תקלה מעמדת הניהול — אפליקציית לימוד יומי (ריפו danielachmish/daily-learning-app, טבלה app_event_log).\n' +
  'נא לבדוק מה הבעיה ולתקן.';

export function formatEventReport(entry: AppEventEntry): string {
  return `${REPORT_HEADER}\n\n${formatEntryBody(entry)}`;
}

export function formatEventsReport(entries: AppEventEntry[], description: string): string {
  const body = entries.map((e, i) => `--- #${i + 1} ---\n${formatEntryBody(e)}`).join('\n\n');
  return `${REPORT_HEADER}\n${description} — ${entries.length} רשומות (מהחדשה לישנה).\n\n${body}`;
}

export function formatActivityReport(entry: ActivityLogEntry): string {
  const lines = [
    'דיווח מיומן פעולות הניהול — אפליקציית לימוד יומי (ריפו danielachmish/daily-learning-app, טבלה admin_activity_log).',
    'נא לבדוק מה הבעיה ולתקן.',
    '',
    `זמן: ${formatTime(entry.created_at)}`,
    `פעולה: ${entry.action}`,
    `סטטוס: ${entry.status}`,
    `מבצע: ${entry.actor_email ?? '—'}`,
    `ישות: ${entry.entity_type ?? '—'} ${entry.entity_id ?? ''}`.trim(),
    `הודעה: ${entry.message ?? '—'}`,
  ];
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    lines.push('פרטים:', JSON.stringify(entry.metadata, null, 2));
  }
  lines.push(`מזהה רשומה: ${entry.id}`);
  return lines.join('\n');
}

/** navigator.clipboard needs a secure context; fall back to execCommand. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}
