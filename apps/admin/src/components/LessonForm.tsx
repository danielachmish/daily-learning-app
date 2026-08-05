'use client';

import type { GenderTrack, Language, LessonStatus } from '@daily-learning/shared';
import { useState } from 'react';

import type { LessonInput } from '../services/lessons';

interface Props {
  initialValues: LessonInput;
  submitLabel: string;
  onSubmit: (input: LessonInput) => Promise<{ error: string | null }>;
}

export function LessonForm({ initialValues, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<LessonInput>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!values.lessonDate || !values.title) {
      setError('נא למלא תאריך וכותרת.');
      return;
    }

    setSubmitting(true);
    const result = await onSubmit(values);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">
          תאריך לועזי
        </label>
        <input
          type="date"
          value={values.lessonDate}
          onChange={(e) => setValues((v) => ({ ...v, lessonDate: e.target.value }))}
          disabled={submitting}
          className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">
          תאריך עברי (אופציונלי)
        </label>
        <input
          type="text"
          value={values.hebrewDate}
          onChange={(e) => setValues((v) => ({ ...v, hebrewDate: e.target.value }))}
          disabled={submitting}
          className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">כותרת</label>
        <input
          type="text"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          disabled={submitting}
          className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-ink-700">מסלול</label>
          <select
            value={values.genderTrack}
            onChange={(e) => setValues((v) => ({ ...v, genderTrack: e.target.value as GenderTrack }))}
            disabled={submitting}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          >
            <option value="men">גברים</option>
            <option value="women">נשים</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-ink-700">שפה</label>
          <select
            value={values.language}
            onChange={(e) => setValues((v) => ({ ...v, language: e.target.value as Language }))}
            disabled={submitting}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          >
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">סטטוס</label>
        <select
          value={values.status}
          onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as LessonStatus }))}
          disabled={submitting}
          className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
        >
          <option value="draft">טיוטה</option>
          <option value="published">פורסם</option>
        </select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-teal-400 px-4 py-2 text-sm font-bold text-on-teal disabled:opacity-60"
      >
        {submitting ? 'שומר…' : submitLabel}
      </button>
    </form>
  );
}
