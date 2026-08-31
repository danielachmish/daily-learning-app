import { createClient as createServiceRoleClient } from '@supabase/supabase-js';

export const PRIVACY_POLICY_KEY = 'privacy_policy';
export const TERMS_OF_USE_KEY = 'terms_of_use';

function requireEnvVar(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * Reads a legal document's text for the PUBLIC pages (app/legal/privacy,
 * app/legal/terms) — these render for visitors who aren't logged in yet
 * (e.g. reading the terms before signing up), so they use the service-role
 * client to bypass RLS entirely rather than requiring a session. There's
 * nothing sensitive in the value itself; it's the same text an admin wrote
 * to be shown to the public.
 */
export async function getLegalContent(key: string): Promise<string | null> {
  const supabaseUrl = requireEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  const serviceClient = createServiceRoleClient(supabaseUrl, serviceRoleKey);

  const { data } = await serviceClient.from('settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}
