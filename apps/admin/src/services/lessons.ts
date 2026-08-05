import type { GenderTrack, Language, Lesson, LessonImage, LessonStatus } from '@daily-learning/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

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

export async function createLesson(supabase: SupabaseClient, input: LessonInput): Promise<Result<Lesson>> {
  const { data, error } = await supabase
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
    .single();

  if (error) return { data: null, error: friendlyError(error) };
  return { data: data as Lesson, error: null };
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

  if (error) return { data: null, error: friendlyError(error) };
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
  if (error) return { error: friendlyError(error) };
  return { error: null };
}

export async function duplicateLesson(
  supabase: SupabaseClient,
  sourceId: string,
  newDate: string
): Promise<Result<Lesson>> {
  const { data: source, error: sourceError } = await fetchLessonById(supabase, sourceId);
  if (sourceError || !source) return { data: null, error: sourceError ?? 'Lesson not found.' };

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
  if (imagesError) return { data: newLesson, error: imagesError };

  if (images.length > 0) {
    const { error: insertImagesError } = await supabase.from('lesson_images').insert(
      images.map((image) => ({
        lesson_id: newLesson.id,
        image_url: image.image_url,
        sort_order: image.sort_order,
      }))
    );
    if (insertImagesError) return { data: newLesson, error: insertImagesError.message };
  }

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

  const { error: uploadError } = await supabase.storage.from('lesson-images').upload(path, file);
  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage.from('lesson-images').getPublicUrl(path);

  const { images: existing, error: existingError } = await fetchLessonImages(supabase, lessonId);
  if (existingError) return { error: existingError };

  const nextSortOrder = existing.length > 0 ? Math.max(...existing.map((i) => i.sort_order)) + 1 : 0;

  const { error: insertError } = await supabase
    .from('lesson_images')
    .insert({ lesson_id: lessonId, image_url: urlData.publicUrl, sort_order: nextSortOrder });

  if (insertError) return { error: insertError.message };
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
  if (error) return { error: error.message };
  return { error: null };
}
