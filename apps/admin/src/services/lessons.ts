import type { GenderTrack, Language, Lesson, LessonImage, LessonStatus } from '@daily-learning/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

import { logActivity } from './activityLog';
import { retryAsync } from './retry';

export const LESSONS_PAGE_SIZE = 20;

export interface LessonFilters {
  date?: string;
  genderTrack?: GenderTrack;
  language?: Language;
  status?: LessonStatus;
}

export interface PagedLessons {
  lessons: Lesson[];
  totalCount: number;
}

export interface LessonInput {
  lessonDate: string;
  hebrewDate: string;
  title: string;
  genderTrack: GenderTrack;
  language: Language;
  status: LessonStatus;
}

interface Result<T> {
  data: T | null;
  error: string | null;
}

const LESSON_COLUMNS =
  'id, lesson_date, hebrew_date, title, gender_track, language, status, created_by, created_at, updated_at';

function friendlyError(error: { code?: string; message: string }): string {
  if (error.code === '23505') {
    return 'כבר קיים לימוד לתאריך זה עבור אותו מסלול ושפה.';
  }
  return error.message;
}

export async function fetchLessons(
  supabase: SupabaseClient,
  page: number,
  filters: LessonFilters
): Promise<Result<PagedLessons>> {
  let query = supabase
    .from('lessons')
    .select(LESSON_COLUMNS, { count: 'exact' })
    .order('lesson_date', { ascending: false });

  if (filters.date) query = query.eq('lesson_date', filters.date);
  if (filters.genderTrack) query = query.eq('gender_track', filters.genderTrack);
  if (filters.language) query = query.eq('language', filters.language);
  if (filters.status) query = query.eq('status', filters.status);

  const from = (page - 1) * LESSONS_PAGE_SIZE;
  const to = from + LESSONS_PAGE_SIZE - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) return { data: null, error: friendlyError(error) };
  return { data: { lessons: (data as Lesson[]) ?? [], totalCount: count ?? 0 }, error: null };
}

export async function fetchLessonById(supabase: SupabaseClient, id: string): Promise<Result<Lesson>> {
  const { data, error } = await supabase.from('lessons').select(LESSON_COLUMNS).eq('id', id).single();
  if (error) return { data: null, error: friendlyError(error) };
  return { data: data as Lesson, error: null };
}

/**
 * Looks up the lesson for a given (date, track, language) if one already
 * exists — used by the batch importer to detect "retrying a day that
 * partially succeeded last time" (the lesson row was created, but the
 * image loop failed partway through) so a retry resumes uploading the
 * missing pages onto the SAME lesson instead of calling createLesson
 * again and hitting the unique-date conflict.
 */
export async function fetchLessonByDate(
  supabase: SupabaseClient,
  lessonDate: string,
  genderTrack: GenderTrack,
  language: Language
): Promise<Result<Lesson>> {
  const { data, error } = await supabase
    .from('lessons')
    .select(LESSON_COLUMNS)
    .eq('lesson_date', lessonDate)
    .eq('gender_track', genderTrack)
    .eq('language', language)
    .maybeSingle();
  if (error) return { data: null, error: friendlyError(error) };
  return { data: (data as Lesson) ?? null, error: null };
}

export async function createLesson(supabase: SupabaseClient, input: LessonInput): Promise<Result<Lesson>> {
  // A duplicate-date conflict (code 23505) is a real, deterministic
  // rejection — retrying it just fails again three times for nothing. A
  // transient network blip on the other hand has no error code at all
  // (or an unrelated one), so it's the one worth a couple of retries.
  const result = await retryAsync(
    () =>
      supabase
        .from('lessons')
        .insert({
          lesson_date: input.lessonDate,
          hebrew_date: input.hebrewDate || null,
          title: input.title,
          gender_track: input.genderTrack,
          language: input.language,
          status: input.status,
        })
        .select(LESSON_COLUMNS)
        .single(),
    (r) => !!r.error && r.error.code !== '23505'
  );

  if (result.error) {
    const message = friendlyError(result.error);
    await logActivity(supabase, {
      action: 'lesson.create',
      entityType: 'lesson',
      status: 'error',
      message,
      metadata: { lessonDate: input.lessonDate, genderTrack: input.genderTrack, language: input.language },
    });
    return { data: null, error: message };
  }

  await logActivity(supabase, {
    action: 'lesson.create',
    entityType: 'lesson',
    entityId: result.data.id,
    status: 'success',
    metadata: { lessonDate: input.lessonDate, genderTrack: input.genderTrack, language: input.language },
  });
  return { data: result.data as Lesson, error: null };
}

export async function updateLesson(
  supabase: SupabaseClient,
  id: string,
  input: LessonInput
): Promise<Result<Lesson>> {
  const { data, error } = await supabase
    .from('lessons')
    .update({
      lesson_date: input.lessonDate,
      hebrew_date: input.hebrewDate || null,
      title: input.title,
      gender_track: input.genderTrack,
      language: input.language,
      status: input.status,
    })
    .eq('id', id)
    .select(LESSON_COLUMNS)
    .single();

  const message = error ? friendlyError(error) : null;
  await logActivity(supabase, {
    action: 'lesson.update',
    entityType: 'lesson',
    entityId: id,
    status: error ? 'error' : 'success',
    message,
    metadata: { status: input.status },
  });

  if (error) return { data: null, error: message };
  return { data: data as Lesson, error: null };
}

export async function deleteLesson(supabase: SupabaseClient, id: string): Promise<{ error: string | null }> {
  // lesson_images rows cascade-delete via FK, but the underlying Storage
  // objects don't — remove them first or they'd become orphaned.
  const { images } = await fetchLessonImages(supabase, id);
  const paths = images.map((image) => storagePathFromPublicUrl(image.image_url)).filter((p): p is string => p !== null);
  if (paths.length > 0) {
    await supabase.storage.from('lesson-images').remove(paths);
  }

  const { error } = await supabase.from('lessons').delete().eq('id', id);
  const message = error ? friendlyError(error) : null;
  await logActivity(supabase, {
    action: 'lesson.delete',
    entityType: 'lesson',
    entityId: id,
    status: error ? 'error' : 'success',
    message,
    metadata: { imagesRemoved: paths.length },
  });

  if (error) return { error: message };
  return { error: null };
}

export async function duplicateLesson(
  supabase: SupabaseClient,
  sourceId: string,
  newDate: string
): Promise<Result<Lesson>> {
  const { data: source, error: sourceError } = await fetchLessonById(supabase, sourceId);
  if (sourceError || !source) return { data: null, error: sourceError ?? 'Lesson not found.' };

  // createLesson already logs its own create — no need to double-log here.
  const { data: newLesson, error: createError } = await createLesson(supabase, {
    lessonDate: newDate,
    hebrewDate: source.hebrew_date ?? '',
    title: source.title,
    genderTrack: source.gender_track,
    language: source.language,
    status: 'draft',
  });
  if (createError || !newLesson) return { data: null, error: createError };

  const { images, error: imagesError } = await fetchLessonImages(supabase, sourceId);
  if (imagesError) {
    await logActivity(supabase, {
      action: 'lesson.duplicate',
      entityType: 'lesson',
      entityId: newLesson.id,
      status: 'error',
      message: imagesError,
      metadata: { sourceId, newDate },
    });
    return { data: newLesson, error: imagesError };
  }

  if (images.length > 0) {
    const { error: insertImagesError } = await supabase.from('lesson_images').insert(
      images.map((image) => ({
        lesson_id: newLesson.id,
        image_url: image.image_url,
        sort_order: image.sort_order,
      }))
    );
    if (insertImagesError) {
      await logActivity(supabase, {
        action: 'lesson.duplicate',
        entityType: 'lesson',
        entityId: newLesson.id,
        status: 'error',
        message: insertImagesError.message,
        metadata: { sourceId, newDate, imageCount: images.length },
      });
      return { data: newLesson, error: insertImagesError.message };
    }
  }

  await logActivity(supabase, {
    action: 'lesson.duplicate',
    entityType: 'lesson',
    entityId: newLesson.id,
    status: 'success',
    metadata: { sourceId, newDate, imageCount: images.length },
  });
  return { data: newLesson, error: null };
}

export async function fetchLessonImages(
  supabase: SupabaseClient,
  lessonId: string
): Promise<{ images: LessonImage[]; error: string | null }> {
  const { data, error } = await supabase
    .from('lesson_images')
    .select('id, lesson_id, image_url, sort_order, created_at')
    .eq('lesson_id', lessonId)
    .order('sort_order', { ascending: true });

  if (error) return { images: [], error: error.message };
  return { images: (data as LessonImage[]) ?? [], error: null };
}

export async function uploadLessonImage(
  supabase: SupabaseClient,
  lessonId: string,
  file: File
): Promise<{ error: string | null }> {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const path = `${lessonId}/${crypto.randomUUID()}.${extension}`;
  const logMeta = { fileName: file.name, size: file.size };

  // Both network calls below are the exact two steps traced back to a
  // real incident: a batch import's storage upload succeeded but the
  // follow-up database insert silently failed (leaving an orphaned file
  // with no lesson_images row), and separately, a storage upload itself
  // failed outright — both looked like one-off network blips, not a
  // structural bug, since everything immediately around them succeeded.
  const uploadResult = await retryAsync(
    () => supabase.storage.from('lesson-images').upload(path, file),
    (r) => !!r.error
  );
  if (uploadResult.error) {
    await logActivity(supabase, {
      action: 'lesson_image.upload',
      entityType: 'lesson',
      entityId: lessonId,
      status: 'error',
      message: uploadResult.error.message,
      metadata: { ...logMeta, step: 'storage_upload' },
    });
    return { error: uploadResult.error.message };
  }

  const { data: urlData } = supabase.storage.from('lesson-images').getPublicUrl(path);

  const { images: existing, error: existingError } = await fetchLessonImages(supabase, lessonId);
  if (existingError) {
    await logActivity(supabase, {
      action: 'lesson_image.upload',
      entityType: 'lesson',
      entityId: lessonId,
      status: 'error',
      message: existingError,
      metadata: { ...logMeta, step: 'fetch_existing', storagePath: path },
    });
    return { error: existingError };
  }

  const nextSortOrder = existing.length > 0 ? Math.max(...existing.map((i) => i.sort_order)) + 1 : 0;

  const insertResult = await retryAsync(
    () =>
      supabase
        .from('lesson_images')
        .insert({ lesson_id: lessonId, image_url: urlData.publicUrl, sort_order: nextSortOrder }),
    (r) => !!r.error
  );

  if (insertResult.error) {
    await logActivity(supabase, {
      action: 'lesson_image.upload',
      entityType: 'lesson',
      entityId: lessonId,
      status: 'error',
      message: insertResult.error.message,
      // The file itself is already sitting in storage at this path even
      // though the row failed — recorded here so an orphaned file like
      // this is actually findable later instead of just invisible.
      metadata: { ...logMeta, step: 'db_insert', orphanedStoragePath: path },
    });
    return { error: insertResult.error.message };
  }

  await logActivity(supabase, {
    action: 'lesson_image.upload',
    entityType: 'lesson',
    entityId: lessonId,
    status: 'success',
    metadata: logMeta,
  });
  return { error: null };
}

export async function reorderLessonImages(
  supabase: SupabaseClient,
  orderedImageIds: string[]
): Promise<{ error: string | null }> {
  const results = await Promise.all(
    orderedImageIds.map((id, index) => supabase.from('lesson_images').update({ sort_order: index }).eq('id', id))
  );
  const failed = results.find((r) => r.error);
  return { error: failed?.error?.message ?? null };
}

function storagePathFromPublicUrl(imageUrl: string): string | null {
  const marker = '/object/public/lesson-images/';
  const index = imageUrl.indexOf(marker);
  if (index === -1) return null;
  return imageUrl.slice(index + marker.length);
}

export async function deleteLessonImage(
  supabase: SupabaseClient,
  image: LessonImage
): Promise<{ error: string | null }> {
  const path = storagePathFromPublicUrl(image.image_url);
  if (path) {
    await supabase.storage.from('lesson-images').remove([path]);
  }

  const { error } = await supabase.from('lesson_images').delete().eq('id', image.id);
  await logActivity(supabase, {
    action: 'lesson_image.delete',
    entityType: 'lesson_image',
    entityId: image.id,
    status: error ? 'error' : 'success',
    message: error?.message ?? null,
    metadata: { lessonId: image.lesson_id },
  });

  if (error) return { error: error.message };
  return { error: null };
}
