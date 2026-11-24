import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Level = 'info' | 'warning' | 'error';

let client: SupabaseClient | null = null;

function serviceClient(): SupabaseClient | null {
  if (client) return client;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/** Makes thrown values / Supabase error objects JSON-safe for the context column. */
function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack?.split('\n').slice(0, 15).join('\n') };
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (value === undefined) return null;
  try {
    const json = JSON.stringify(value);
    if (json === undefined) return String(value);
    // Keep a single row small even if a provider returns a huge body.
    return json.length > 8000 ? { truncated: true, preview: json.slice(0, 8000) } : JSON.parse(json);
  } catch {
    return String(value);
  }
}

/**
 * Writes to console (Supabase function logs, as before) AND to
 * app_event_log, so server-side failures — a payment callback that
 * couldn't be matched, a cron that failed to read its table — show up in
 * the admin panel's "יומן מערכת" next to the app-side events, instead of
 * only in the Supabase dashboard's function logs that nobody looks at.
 *
 * Never throws: a logging failure must not change the function's response.
 */
export async function logServerEvent(
  level: Level,
  functionName: string,
  message: string,
  details?: unknown,
  user?: { id?: string | null; email?: string | null }
): Promise<void> {
  const line = `${functionName}: ${message}`;
  if (level === 'error') console.error(line, details ?? '');
  else if (level === 'warning') console.warn(line, details ?? '');
  else console.log(line, details ?? '');

  try {
    const db = serviceClient();
    if (!db) return;
    await db.from('app_event_log').insert({
      source: 'server',
      level,
      event: `server.${functionName.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
      message: message.slice(0, 4000),
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      context: { function: functionName, details: serialize(details) },
    });
  } catch {
    // Nowhere further to report it.
  }
}
