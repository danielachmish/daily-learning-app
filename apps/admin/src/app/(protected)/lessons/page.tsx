'use client';

import type { GenderTrack, Language, Lesson, LessonStatus } from '@daily-learning/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { createClient } from '../../../services/supabase/client';
import {
  LESSONS_PAGE_SIZE,
  deleteLesson,
  duplicateLesson,
  fetchLessons,
  updateLesson,
  type LessonFilters,
} from '../../../services/lessons';

export default function LessonsListPage() {
  const [filters, setFilters] = useState<LessonFilters>({});
  const [page, setPage] = useState(1);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const result = await fetchLessons(supabase, page, filters);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setLessons(result.data.lessons);
      setTotalCount(result.data.totalCount);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  function updateFilter<K extends keyof LessonFilters>(key: K, value: LessonFilters[K]) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  async function handleTogglePublish(lesson: Lesson) {
    setBusyId(lesson.id);
    const nextStatus: LessonStatus = lesson.status === 'published' ? 'draft' : 'published';
    const supabase = createClient();
    const result = await updateLesson(supabase, lesson.id, {
      lessonDate: lesson.lesson_date,
      hebrewDate: lesson.hebrew_date ?? '',
      title: lesson.title,
      genderTrack: lesson.gender_track,
      language: lesson.language,
      status: nextStatus,
    });
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    reload();
  }

  async function handleDelete(lesson: Lesson) {
    if (!confirm(`למחוק את הלימוד "${lesson.title}" (${lesson.lesson_date})? הפעולה בלתי הפיכה.`)) {
      return;
    }
    setBusyId(lesson.id);
    const supabase = createClient();
    const result = await deleteLesson(supabase, lesson.id);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    reload();
  }

  async function handleDuplicate(lesson: Lesson) {
    const newDate = prompt('תאריך ללימוד המשוכפל (YYYY-MM-DD):', lesson.lesson_date);
    if (!newDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      alert('פורמט תאריך לא תקין. יש להשתמש ב-YYYY-MM-DD.');
      return;
    }
    setBusyId(lesson.id);
    const supabase = createClient();
    const result = await duplicateLesson(supabase, lesson.id, newDate);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    reload();
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / LESSONS_PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">לימודים</h1>
        <Link
          href="/lessons/new"
          className="rounded-full bg-teal-400 px-4 py-2 text-sm font-bold text-on-teal"
        >
          + לימוד חדש
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="date"
          value={filters.date ?? ''}
          onChange={(e) => updateFilter('date', e.target.value as LessonFilters['date'])}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        />
        <select
          value={filters.genderTrack ?? ''}
          onChange={(e) => updateFilter('genderTrack', (e.target.value || undefined) as GenderTrack | undefined)}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        >
          <option value="">כל המסלולים</option>
          <option value="men">גברים</option>
          <option value="women">נשים</option>
        </select>
        <select
          value={filters.language ?? ''}
          onChange={(e) => updateFilter('language', (e.target.value || undefined) as Language | undefined)}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        >
          <option value="">כל השפות</option>
          <option value="he">עברית</option>
          <option value="en">English</option>
        </select>
        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilter('status', (e.target.value || undefined) as LessonStatus | undefined)}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        >
          <option value="">כל הסטטוסים</option>
          <option value="draft">טיוטה</option>
          <option value="published">פורסם</option>
        </select>
        <button
          onClick={() => {
            setFilters({});
            setPage(1);
          }}
          className="rounded-full px-3 py-1.5 text-sm text-slate-500 hover:bg-teal-100 hover:text-teal-600"
        >
          נקה סינון
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">טוען…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : lessons.length === 0 ? (
        <p className="text-sm text-slate-500">לא נמצאו לימודים.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-start text-slate-500">
              <th className="py-2 pe-4 text-start font-medium">תאריך</th>
              <th className="py-2 pe-4 text-start font-medium">כותרת</th>
              <th className="py-2 pe-4 text-start font-medium">מסלול</th>
              <th className="py-2 pe-4 text-start font-medium">שפה</th>
              <th className="py-2 pe-4 text-start font-medium">סטטוס</th>
              <th className="py-2 pe-4 text-start font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <tr key={lesson.id} className="border-b border-line">
                <td className="py-2 pe-4">{lesson.lesson_date}</td>
                <td className="py-2 pe-4">{lesson.title}</td>
                <td className="py-2 pe-4">{lesson.gender_track === 'men' ? 'גברים' : 'נשים'}</td>
                <td className="py-2 pe-4">{lesson.language === 'he' ? 'עברית' : 'English'}</td>
                <td className="py-2 pe-4">
                  <button
                    onClick={() => handleTogglePublish(lesson)}
                    disabled={busyId === lesson.id}
                    className={
                      lesson.status === 'published'
                        ? 'rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success'
                        : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-500'
                    }
                  >
                    {lesson.status === 'published' ? 'פורסם' : 'טיוטה'}
                  </button>
                </td>
                <td className="flex gap-3 py-2 pe-4">
                  <Link href={`/lessons/${lesson.id}/edit`} className="text-teal-600 hover:underline">
                    עריכה
                  </Link>
                  <button
                    onClick={() => handleDuplicate(lesson)}
                    disabled={busyId === lesson.id}
                    className="text-teal-600 hover:underline"
                  >
                    שכפול
                  </button>
                  <button
                    onClick={() => handleDelete(lesson)}
                    disabled={busyId === lesson.id}
                    className="text-danger hover:underline"
                  >
                    מחיקה
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalCount > 0 && (
        <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full border border-teal-400 px-3 py-1 text-teal-600 disabled:opacity-40"
          >
            הקודם
          </button>
          <span>
            עמוד {page} מתוך {totalPages} ({totalCount} לימודים)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-full border border-teal-400 px-3 py-1 text-teal-600 disabled:opacity-40"
          >
            הבא
          </button>
        </div>
      )}
    </div>
  );
}
