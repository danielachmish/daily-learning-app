import type { GenderTrack, Language } from './enums';

/** Mirrors the `daily_lesson_stats` table (precomputed counters, avoids heavy counts on read). */
export interface DailyLessonStats {
  id: string;
  lesson_date: string;
  gender_track: GenderTrack;
  language: Language;
  completed_count: number;
  dedications_count: number;
  created_at: string;
  updated_at: string;
}
