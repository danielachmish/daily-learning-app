'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  genderTrack: 'men' | 'women';
  language: 'he' | 'en';
  freeAccess: boolean;
}

const INITIAL_STATE: FormState = {
  fullName: '',
  phone: '',
  email: '',
  password: '',
  genderTrack: 'men',
  language: 'he',
  freeAccess: false,
};

export default function NewUserPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? 'שגיאה ביצירת המשתמש.');
      return;
    }

    router.push(`/users/${data.id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">הוספת משתמש חדש</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-500">שם מלא</label>
          <input
            type="text"
            required
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            disabled={submitting}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-500">טלפון</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            disabled={submitting}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-500">אימייל</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            disabled={submitting}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-500">סיסמה זמנית</label>
          <input
            type="text"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            disabled={submitting}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          />
          <p className="mt-1 text-xs text-slate-500">
            יש למסור את הסיסמה הזו למשתמש בעצמכם — הוא/היא יוכל/תוכל לשנות אותה בהמשך.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-500">מסלול</label>
          <select
            value={form.genderTrack}
            onChange={(e) => setForm((prev) => ({ ...prev, genderTrack: e.target.value as 'men' | 'women' }))}
            disabled={submitting}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          >
            <option value="men">גברים</option>
            <option value="women">נשים</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-500">שפה</label>
          <select
            value={form.language}
            onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value as 'he' | 'en' }))}
            disabled={submitting}
            className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
          >
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.freeAccess}
            onChange={(e) => setForm((prev) => ({ ...prev, freeAccess: e.target.checked }))}
            disabled={submitting}
          />
          לתת גישה חינמית (בלי צורך במנוי)
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded-full bg-teal-400 px-6 py-2 text-sm font-bold text-on-teal disabled:opacity-60"
        >
          {submitting ? 'יוצר…' : 'צור משתמש'}
        </button>
      </form>
    </div>
  );
}
