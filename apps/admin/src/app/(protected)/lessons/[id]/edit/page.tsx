'use client';

import type { Lesson } from '@daily-learning/shared';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LessonForm } from '../../../../../components/LessonForm';
import { LessonImagesManager } from '../../../../../components/LessonImagesManager';
import { deleteLesson, duplicateLesson, fetchLessonById, updateLesson, type LessonInput } from '../../../../../services/lessons';
import { createClient } from '../../../../../services/supabase/client';

export default function EditLessonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const lessonId = params.id;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const result = await fetchLessonById(supabase, lessonId);
      if (result.error) setLoadError(result.error);
      setLesson(result.data);
      setLoading(false);
    }
    load();
  }, [lessonId]);

  async function handleSubmit(input: LessonInput) {
    const supabase = createClient();
    const result = await updateLesson(supabase, lessonId, input);
    if (result.error) return { error: result.error };
    setLesson(result.data);
    return { error: null };
  }

  async function handleDelete() {
    if (!lesson) return;
    if (!confirm(`למחוק את הלימוד "${lesson.title}" (${lesson.lesson_date})? הפעולה בלתי הפיכה.`)) return;

    const supabase = createClient();
    const result = await deleteLesson(supabase, lessonId);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.push('/lessons');
  }

  async function handleDuplicate() {
    if (!lesson) return;
    const newDate = prompt('תאריך ללימוד המשוכפל (YYYY-MM-DD):', lesson.lesson_date);
    if (!newDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      alert('פורמט תאריך לא תקין. יש להשתמש ב-YYYY-MM-DD.');
      return;
    }

    const supabase = createClient();
    const result = await duplicateLesson(supabase, lessonId, newDate);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.push(`/lessons/${result.data!.id}/edit`);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">טוען…</p>;
  }

  if (loadError || !lesson) {
    return <p className="text-sm text-danger">{loadError ?? 'הלימוד לא נמצא.'}</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">עריכת לימוד</h1>
        <div className="flex gap-3">
          <button onClick={handleDuplicate} className="text-sm text-teal-600 hover:underline">
            שכפול
          </button>
          <button onClick={handleDelete} className="text-sm text-danger hover:underline">
            מחיקה
          </button>
        </div>
      </div>

      <LessonForm
        initialValues={{
          lessonDate: lesson.lesson_date,
          hebrewDate: lesson.hebrew_date ?? '',
          title: lesson.title,
          genderTrack: lesson.gender_track,
          language: lesson.language,
          status: lesson.status,
        }}
        submitLabel="שמור שינויים"
        onSubmit={handleSubmit}
      />

      <LessonImagesManager lessonId={lessonId} />
    </div>
  );
}
