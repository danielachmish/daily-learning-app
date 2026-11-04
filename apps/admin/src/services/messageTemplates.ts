import type { SupabaseClient } from '@supabase/supabase-js';

import { logActivity } from './activityLog';

export const APP_SHARE_LINK = 'https://halimudhayomi.co.il';

export interface MessageTemplates {
  /** WhatsApp message sent from a user's admin page when granting access. */
  accessMessage: string;
  /** What a subscriber's "share" button in the app sends to a friend (Hebrew). */
  appShareMessage: string;
}

interface Result<T> {
  data: T | null;
  error: string | null;
}

const ACCESS_KEY = 'access_message_template';
const SHARE_KEY = 'app_share_message_template';

/**
 * Placeholders are written in Hebrew so the admin can read the template as
 * plain text. A line containing {סיסמה} is dropped entirely when there's no
 * password to show (see renderTemplate).
 */
export const PLACEHOLDERS = {
  name: '{שם}',
  link: '{לינק}',
  email: '{אימייל}',
  password: '{סיסמה}',
} as const;

export const DEFAULT_TEMPLATES: MessageTemplates = {
  accessMessage: [
    'שלום {שם},',
    'נפתחה לך גישה לאפליקציית הלימוד היומי.',
    '',
    'להורדת האפליקציה: {לינק}',
    '',
    'אימייל להתחברות: {אימייל}',
    'סיסמה: {סיסמה}',
  ].join('\n'),
  // Must stay in sync with the mobile app's own fallback
  // (apps/mobile/src/i18n/strings.ts → dailyLesson.shareMessage).
  appShareMessage: 'הצטרפו אליי ללימוד היומי! 📖\n{לינק}',
};

/** Missing/blank rows fall back to the defaults, so a fresh database behaves exactly as before. */
export async function fetchMessageTemplates(supabase: SupabaseClient): Promise<Result<MessageTemplates>> {
  const { data, error } = await supabase.from('settings').select('key, value').in('key', [ACCESS_KEY, SHARE_KEY]);

  if (error) return { data: null, error: error.message };

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    data: {
      accessMessage: map.get(ACCESS_KEY)?.trim() ? map.get(ACCESS_KEY)! : DEFAULT_TEMPLATES.accessMessage,
      appShareMessage: map.get(SHARE_KEY)?.trim() ? map.get(SHARE_KEY)! : DEFAULT_TEMPLATES.appShareMessage,
    },
    error: null,
  };
}

export async function saveMessageTemplates(
  supabase: SupabaseClient,
  templates: MessageTemplates
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('settings').upsert([
    { key: ACCESS_KEY, value: templates.accessMessage, updated_at: new Date().toISOString() },
    { key: SHARE_KEY, value: templates.appShareMessage, updated_at: new Date().toISOString() },
  ]);

  await logActivity(supabase, {
    action: 'settings.save_message_templates',
    entityType: 'settings',
    status: error ? 'error' : 'success',
    message: error?.message ?? null,
    metadata: templates as unknown as Record<string, unknown>,
  });

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Fills a template's placeholders. Any line mentioning a placeholder whose
 * value is missing (in practice: {סיסמה} when no password was just reset)
 * is removed, so the message never shows "סיסמה: " with nothing after it.
 */
export function renderTemplate(
  template: string,
  values: { name?: string; link?: string; email?: string; password?: string | null }
): string {
  const entries: [string, string | null | undefined][] = [
    [PLACEHOLDERS.name, values.name],
    [PLACEHOLDERS.link, values.link],
    [PLACEHOLDERS.email, values.email],
    [PLACEHOLDERS.password, values.password],
  ];

  return template
    .split('\n')
    .filter((line) => entries.every(([placeholder, value]) => value || !line.includes(placeholder)))
    .map((line) => entries.reduce((acc, [placeholder, value]) => acc.split(placeholder).join(value ?? ''), line))
    .join('\n');
}
