import type { AccountStatus, GenderTrack, Language, Role } from './enums';

/** Mirrors the `profiles` table. */
export interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
  role: Role;
  gender_track: GenderTrack;
  language: Language;
  account_status: AccountStatus;
  free_access: boolean;
  current_streak: number;
  best_streak: number;
  total_completed_days: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}
