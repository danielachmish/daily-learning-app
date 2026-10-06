'use client';

import type { DedicationType, UserProfile } from '@daily-learning/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createFreeDedication } from '../../../../services/dedications';
import { createClient } from '../../../../services/supabase/client';
import { fetchUsers } from '../../../../services/users';
import { DEDICATION_TYPE_LABELS } from '../../../../utils/dedicationLabels';

const inputClass = 'w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900';

export default function NewFreeDedicationPage() {
  const router = useRouter();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<DedicationType>('memory');
  const [text, setText] = useState('');
  const [donorName, setDonorName] = useState('');
  const [saving, setSaving] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  async function handleSearchUsers() {
    const term = userSearch.trim();
    if (!term) {
      setUserResults([]);
      return;
    }
    const result = await fetchUsers(createClient(), 1, term);
    setUserResults(result.data?.users.slice(0, 5) ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) {
      alert('נא לבחור תאריך.');
      return;
    }
    const effectiveEnd = endDate || startDate;
    if (effectiveEnd < startDate) {
      alert('תאריך הסיום לא יכול להיות לפני תאריך ההתחלה.');
      return;
    }
    if (!text.trim()) {
      alert('נוסח ההקדשה הוא שדה חובה.');
      return;
    }

    setSaving(true);
    const result = await createFreeDedication(createClient(), {
      userId: selectedUser?.id ?? null,
      startDate,
      endDate: effectiveEnd,
      type,
      dedicationText: text.trim(),
      donorName: donorName.trim(),
    });
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.push('/dedications');
  }

  return (
    <div className="max-w-lg">
      <button onClick={() => router.push('/dedications')} className="mb-4 text-sm text-slate-500 hover:underline">
        ‹ חזרה להקדשות
      </button>
      <h1 className="mb-2 text-2xl font-extrabold text-ink-900">הוספת הקדשה ללא תשלום</h1>
      <p className="mb-6 text-sm text-slate-500">
        ההקדשה נוצרת כמאושרת ומוצגת באפליקציה מיד, כמו כל הקדשה רגילה. אין הגבלה על כמות הקדשות בתאריך.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-ink-700">מתאריך</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-ink-700">עד תאריך (אופציונלי)</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">סוג</label>
          <select value={type} onChange={(e) => setType(e.target.value as DedicationType)} className={inputClass}>
            {Object.entries(DEDICATION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">נוסח ההקדשה</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={inputClass} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">שם המקדיש (אופציונלי)</label>
          <input type="text" value={donorName} onChange={(e) => setDonorName(e.target.value)} className={inputClass} />
        </div>

        <div className="rounded-xl border border-line p-4">
          <label className="mb-1 block text-sm font-medium text-ink-700">שיוך למשתמש (אופציונלי)</label>
          {selectedUser ? (
            <p className="flex items-center justify-between text-sm text-ink-900">
              <span>
                {selectedUser.full_name} · {selectedUser.email}
              </span>
              <button type="button" onClick={() => setSelectedUser(null)} className="text-danger hover:underline">
                הסר
              </button>
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchUsers();
                    }
                  }}
                  placeholder="שם, מייל או טלפון"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleSearchUsers}
                  className="rounded-full border border-slate-300 px-3 py-2 text-xs font-bold text-ink-700"
                >
                  חפש
                </button>
              </div>
              {userResults.length > 0 && (
                <ul className="mt-2 divide-y divide-line rounded-lg border border-line text-sm">
                  {userResults.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setUserResults([]);
                        }}
                        className="w-full px-3 py-2 text-start hover:bg-teal-100"
                      >
                        {u.full_name} · {u.email}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-slate-500">בלי בחירה — ההקדשה לא תהיה משויכת לאף משתמש.</p>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-teal-400 px-4 py-2 text-sm font-bold text-on-teal disabled:opacity-50"
        >
          {saving ? 'שומר…' : 'הוסף הקדשה'}
        </button>
      </form>
    </div>
  );
}
