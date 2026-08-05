/** Mirrors the `notification_settings` table. `reminder_time` is a "HH:MM:SS" string. */
export interface NotificationSettings {
  user_id: string;
  enabled: boolean;
  reminder_time: string | null;
  created_at: string;
  updated_at: string;
}
