import { supabase } from './supabase';

export interface NotificationSettings {
  enabled: boolean;
  reminderTime: string | null;
}

export async function fetchNotificationSettings(
  userId: string
): Promise<{ settings: NotificationSettings | null; error: string | null }> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('enabled, reminder_time')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { settings: null, error: error.message };
  }

  if (!data) {
    return { settings: { enabled: false, reminderTime: null }, error: null };
  }

  return { settings: { enabled: data.enabled, reminderTime: data.reminder_time }, error: null };
}

export async function saveNotificationSettings(
  userId: string,
  settings: NotificationSettings
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('notification_settings').upsert(
    {
      user_id: userId,
      enabled: settings.enabled,
      reminder_time: settings.reminderTime,
    },
    { onConflict: 'user_id' }
  );

  return { error: error?.message ?? null };
}
