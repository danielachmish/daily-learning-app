import type { SupabaseClient } from '@supabase/supabase-js';

interface Result<T> {
  data: T | null;
  error: string | null;
}

export interface NedarimSettings {
  mosadId: string;
  apiKey: string;
}

const MOSAD_ID_KEY = 'nedarim_mosad_id';
const API_KEY_KEY = 'nedarim_api_key';

/**
 * Reads current settings. The api key is intentionally returned so the
 * admin can confirm what's saved — RLS already restricts this table to
 * admins only, so there's no broader exposure risk in showing it back to
 * the person who's allowed to set it in the first place.
 */
export async function fetchNedarimSettings(supabase: SupabaseClient): Promise<Result<NedarimSettings>> {
  const { data, error } = await supabase
    .from('payment_provider_settings')
    .select('key, value')
    .in('key', [MOSAD_ID_KEY, API_KEY_KEY]);

  if (error) return { data: null, error: error.message };

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    data: {
      mosadId: map.get(MOSAD_ID_KEY) ?? '',
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
    { key: API_KEY_KEY, value: settings.apiKey, updated_at: new Date().toISOString() },
  ]);

  if (error) return { error: error.message };
  return { error: null };
}
