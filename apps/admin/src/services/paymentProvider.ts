import type { SupabaseClient } from '@supabase/supabase-js';

interface Result<T> {
  data: T | null;
  error: string | null;
}

export interface NedarimSettings {
  mosadId: string;
  apiValid: string;
  apiKey: string;
}

const MOSAD_ID_KEY = 'nedarim_mosad_id';
const API_VALID_KEY = 'nedarim_api_valid';
const API_KEY_KEY = 'nedarim_api_key';

/**
 * Reads current settings. Nedarim Plus has two distinct secrets under one
 * "API keys" admin screen on their side: ApiValid (used to embed their
 * secure payment iframe — safe to hand to the browser, it's not enough on
 * its own to move money) and the ApiPassword/API key proper, prefixed
 * npk_ (used only for server-to-server calls — creating charges, managing
 * standing orders — and must never reach the client). Stored/returned
 * separately here so the edge function can hand out apiValid to the app
 * while keeping apiKey server-side only.
 */
export async function fetchNedarimSettings(supabase: SupabaseClient): Promise<Result<NedarimSettings>> {
  const { data, error } = await supabase
    .from('payment_provider_settings')
    .select('key, value')
    .in('key', [MOSAD_ID_KEY, API_VALID_KEY, API_KEY_KEY]);

  if (error) return { data: null, error: error.message };

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    data: {
      mosadId: map.get(MOSAD_ID_KEY) ?? '',
      apiValid: map.get(API_VALID_KEY) ?? '',
      apiKey: map.get(API_KEY_KEY) ?? '',
    },
    error: null,
  };
}

export async function saveNedarimSettings(
  supabase: SupabaseClient,
  settings: NedarimSettings
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('payment_provider_settings').upsert([
    { key: MOSAD_ID_KEY, value: settings.mosadId, updated_at: new Date().toISOString() },
    { key: API_VALID_KEY, value: settings.apiValid, updated_at: new Date().toISOString() },
    { key: API_KEY_KEY, value: settings.apiKey, updated_at: new Date().toISOString() },
  ]);

  if (error) return { error: error.message };
  return { error: null };
}
