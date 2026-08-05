import type { GenderTrack, Language, Lesson, LessonImage } from '@daily-learning/shared';

import { supabase } from './supabase';
import { getMonthRange } from '../utils/date';

/**
 * Fetches the single published lesson for a date + gender_track + language,
 * matching the unique (lesson_date, gender_track, language) index. Selects
 * only the columns this screen needs — never `select *`.
 */
export async function fetchLessonForDate(
  lessonDate: string,
  genderTrack: GenderTrack,
  language: Language
): Promise<{ lesson: Lesson | null; error: string | null }> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, lesson_date, hebrew_date, title, gender_track, language, status, created_by, created_at, updated_at')
    .eq('lesson_date', lessonDate)
    .eq('gender_track', genderTrack)
    .eq('language', language)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    return { lesson: null, error: error.message };
  }

  return { lesson: data as Lesson | null, error: null };
}

/** Fetches a lesson's images ordered for display. */
export async function fetchLessonImages(
  lessonId: string
): Promise<{ images: LessonImage[]; error: string | null }> {
  const { data, error } = await supabase
    .from('lesson_images')
    .select('id, lesson_id, image_url, sort_order, created_at')
    .eq('lesson_id', lessonId)
    .order('sort_order', { ascending: true });

  if (error) {
    return { images: [], error: error.message };
  }

  return { images: (data as LessonImage[]) ?? [], error: null };
}

/** Whether the given user has already completed this lesson (single indexed lookup). */
export async function fetchCompletionStatus(
  lessonId: string,
  userId: string
): Promise<{ completed: boolean; error: string | null }> {
  const { data, error } = await supabase
    .from('learning_progress')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { completed: false, error: error.message };
  }

  return { completed: data !== null, error: null };
}

/**
 * Which dates in the given month have a published lesson matching the
 * user's track+language. Only fetches lesson_date for that month — never
 * the whole lessons table.
 */
export async function fetchLessonDatesForMonth(
  year: number,
  month: number,
  genderTrack: GenderTrack,
  language: Language
): Promise<{ dates: Set<string>; error: string | null }> {
  const { start, end } = getMonthRange(year, month);

  const { data, error } = await supabase
    .from('lessons')
    .select('lesson_date')
    .gte('lesson_date', start)
    .lte('lesson_date', end)
    .eq('gender_track', genderTrack)
    .eq('language', language)
    .eq('status', 'published');

  if (error) {
    return { dates: new Set(), error: error.message };
  }

  return { dates: new Set(data.map((row) => row.lesson_date as string)), error: null };
}

/** Which dates in the given month this user has completed. Only that month's rows. */
export async function fetchCompletedDatesForMonth(
  year: number,
  month: number,
  userId: string
): Promise<{ dates: Set<string>; error: string | null }> {
  const { start, end } = getMonthRange(year, month);

  const { data, error } = await supabase
    .from('learning_progress')
    .select('lesson_date')
    .eq('user_id', userId)
    .gte('lesson_date', start)
    .lte('lesson_date', end);

  if (error) {
    return { dates: new Set(), error: error.message };
  }

  return { dates: new Set(data.map((row) => row.lesson_date as string)), error: null };
}

export type CompleteLessonStatus = 'completed' | 'already_completed';

export interface CompleteLessonResult {
  status: CompleteLessonStatus;
  currentStreak?: number;
  bestStreak?: number;
  totalCompletedDays?: number;
}

interface CompleteLessonRpcResponse {
  status: string;
  current_streak?: number;
  best_streak?: number;
  total_completed_days?: number;
}

/**
 * Calls the atomic complete_lesson RPC. The server is the sole source of
 * truth for streak/counters — this never increments anything client-side.
 */
export async function completeLesson(
  lessonId: string
): Promise<{ result: CompleteLessonResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('complete_lesson', { p_lesson_id: lessonId });

  if (error) {
    return { result: null, error: error.message };
  }

  const response = data as CompleteLessonRpcResponse;

  return {
    result: {
      status: response.status as CompleteLessonStatus,
      currentStreak: response.current_streak,
      bestStreak: response.best_streak,
      totalCompletedDays: response.total_completed_days,
    },
    error: null,
  };
}
