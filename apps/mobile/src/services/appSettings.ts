import { supabase } from './supabase';

/**
 * The Hebrew "invite a friend" share text, editable from the admin panel
 * (settings → "הודעת שיתוף מהאפליקציה"). {לינק} is replaced with the app
 * link. Null when not set, so callers fall back to the built-in string.
 */
export async function fetchShareMessageTemplate(): Promise<string | null> {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'app_share_message_template')
    .maybeSingle();
  return data?.value?.trim() ? data.value : null;
}
