'use client';

import type { DedicationDurationOption } from '@daily-learning/shared';
import { useEffect, useState } from 'react';

import {
  createDurationOption,
  deleteDurationOption,
  fetchDurationOptions,
  updateDurationOption,
  type DurationOptionInput,
} from '../../../services/dedicationOptions';
import { createClient } from '../../../services/supabase/client';

const EMPTY_FORM: DurationOptionInput = { label: '', duration_days: 1, price: 0, sort_order: 0, active: true };

export default function DedicationOptionsPage() {
  const [options, setOptions] = useState<DedicationDurationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DurationOptionInput>(EMPTY_FORM);
  const [newForm, setNewForm] = useState<DurationOptionInput>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  async function reload() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const result = await fetchDurationOptions(supabase);
    if (result.error) setError(result.error);
    else if (result.data) setOptions(result.data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  function startEdit(option: DedicationDurationOption) {
    setEditingId(option.id);
    setEditForm({
      label: option.label,
      duration_days: option.duration_days,
      price: option.price,
      sort_order: option.sort_order,
      active: option.active,
    });
  }

  async function handleSaveEdit(id: string) {
    setBusyId(id);
    const supabase = createClient();
    const result = await updateDurationOption(supabase, id, editForm);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    setEditingId(null);
    reload();
  }

  async function handleDelete(option: DedicationDurationOption) {
    if (!confirm(`למחוק את "${option.label}"? הקדשות קיימות עם האפשרות הזו לא יימחקו, רק יאבדו את הקישור אליה.`))
      return;
    setBusyId(option.id);
    const supabase = createClient();
    const result = await deleteDurationOption(supabase, option.id);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    reload();
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!newForm.label.trim()) {
      alert('נא למלא תווית.');
      return;
    }
    setCreating(true);
    const supabase = createClient();
    const result = await createDurationOption(supabase, newForm);
    setCreating(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setNewForm(EMPTY_FORM);
    reload();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-ink-900">אפשרויות הקדשה</h1>
      <p className="mt-2 text-sm text-slate-500">
        כל שורה היא אפשרות שמשתמשים רואים כשהם יוצרים הקדשה — כמה ימים היא מכסה, ובאיזה מחיר. אפשר
        להוסיף, לערוך או להשבית בכל עת; שינוי מחיר לא משפיע על הקדשות שכבר נוצרו.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">טוען…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-danger">{error}</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-start text-slate-500">
                <th className="py-2 pe-4 text-start font-medium">תווית</th>
                <th className="py-2 pe-4 text-start font-medium">ימים</th>
                <th className="py-2 pe-4 text-start font-medium">מחיר (₪)</th>
                <th className="py-2 pe-4 text-start font-medium">סדר</th>
                <th className="py-2 pe-4 text-start font-medium">פעיל</th>
                <th className="py-2 pe-4 text-start font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {options.map((option) => {
                const isEditing = editingId === option.id;
                const busy = busyId === option.id;
                return (
                  <tr key={option.id} className="border-b border-line">
                    {isEditing ? (
                      <>
                        <td className="py-2 pe-4">
                          <input
                            value={editForm.label}
                            onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                            className="w-full rounded-lg border border-line bg-paper-50 px-2 py-1 text-xs text-ink-900"
                          />
                        </td>
                        <td className="py-2 pe-4">
                          <input
                            type="number"
                            min="1"
                            value={editForm.duration_days}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, duration_days: Number(e.target.value) }))
                            }
                            className="w-20 rounded-lg border border-line bg-paper-50 px-2 py-1 text-xs text-ink-900"
                          />
                        </td>
                        <td className="py-2 pe-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.price}
                            onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) }))}
                            className="w-24 rounded-lg border border-line bg-paper-50 px-2 py-1 text-xs text-ink-900"
                          />
                        </td>
                        <td className="py-2 pe-4">
                          <input
                            type="number"
                            value={editForm.sort_order}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, sort_order: Number(e.target.value) }))
                            }
                            className="w-16 rounded-lg border border-line bg-paper-50 px-2 py-1 text-xs text-ink-900"
                          />
                        </td>
                        <td className="py-2 pe-4">
                          <input
                            type="checkbox"
                            checked={editForm.active}
                            onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
                          />
                        </td>
                        <td className="py-2 pe-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(option.id)}
                              disabled={busy}
                              className="text-teal-600 hover:underline"
                            >
                              שמור
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={busy}
                              className="text-slate-500 hover:underline"
                            >
                              ביטול
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 pe-4">{option.label}</td>
                        <td className="py-2 pe-4">{option.duration_days}</td>
                        <td className="py-2 pe-4">₪{option.price}</td>
                        <td className="py-2 pe-4">{option.sort_order}</td>
                        <td className="py-2 pe-4">{option.active ? 'כן' : 'לא'}</td>
                        <td className="py-2 pe-4">
                          <div className="flex gap-3">
                            <button onClick={() => startEdit(option)} className="text-teal-600 hover:underline">
                              ערוך
                            </button>
                            <button
                              onClick={() => handleDelete(option)}
                              disabled={busy}
                              className="text-danger hover:underline"
                            >
                              מחק
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-8 rounded-2xl border border-line bg-paper-50 p-4">
        <h2 className="mb-3 text-sm font-bold text-ink-900">אפשרות חדשה</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">תווית</label>
            <input
              value={newForm.label}
              onChange={(e) => setNewForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="לדוגמה: שבוע"
              className="rounded-lg border border-line bg-paper-0 px-2 py-1.5 text-sm text-ink-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">ימים</label>
            <input
              type="number"
              min="1"
              value={newForm.duration_days}
              onChange={(e) => setNewForm((f) => ({ ...f, duration_days: Number(e.target.value) }))}
              className="w-20 rounded-lg border border-line bg-paper-0 px-2 py-1.5 text-sm text-ink-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">מחיר (₪)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newForm.price}
              onChange={(e) => setNewForm((f) => ({ ...f, price: Number(e.target.value) }))}
              className="w-24 rounded-lg border border-line bg-paper-0 px-2 py-1.5 text-sm text-ink-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">סדר תצוגה</label>
            <input
              type="number"
              value={newForm.sort_order}
              onChange={(e) => setNewForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              className="w-16 rounded-lg border border-line bg-paper-0 px-2 py-1.5 text-sm text-ink-900"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-full bg-teal-400 px-5 py-1.5 text-sm font-bold text-on-teal disabled:opacity-60"
          >
            {creating ? 'מוסיף…' : 'הוסף'}
          </button>
        </div>
      </form>
    </div>
  );
}
