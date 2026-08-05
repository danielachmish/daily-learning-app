import type { GenderTrack, Language, LessonStatus } from './enums';

/** Mirrors the `lessons` table. */
export interface Lesson {
  id: string;
  lesson_date: string;
  hebrew_date: string | null;
  title: string;
  gender_track: GenderTrack;
  language: Language;
  status: LessonStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
