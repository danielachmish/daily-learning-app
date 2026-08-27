'use client';

import { useEffect, useState } from 'react';

import { fetchNedarimSettings, saveNedarimSettings, type NedarimSettings } from '../../../services/paymentProvider';
import { createClient } from '../../../services/supabase/client';

export default function SettingsPage() {
  const [settings, setSettings] = useState<NedarimSettings>({ mosadId: '', apiValid: '', apiKey: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    fetchNedarimSettings(supabase).then((result) => {
      if (!isMounted) return;
      if (result.error) setError(result.error);
      if (result.data) setSettings(result.data);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error: saveError } = await saveNedarimSettings(supabase, settings);

    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-extrabold text-ink-900">הגדרות תשלומים</h1>
      <p className="mt-2 text-sm text-slate-500">
        פרטי חיבור לנדרים פלוס. ברגע שהעמותה תמסור את הפרטים, ניתן להזין אותם כאן — הם נשמרים
        בצורה מאובטחת ונגישים רק למנהלים.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">טוען…</p>
      ) : (
        <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">מספר מוסד (Mosad ID)</label>
            <input
              type="text"
              value={settings.mosadId}
              onChange={(e) => {
                setSettings((prev) => ({ ...prev, mosadId: e.target.value }));
                setSaved(false);
              }}
              disabled={saving}
              className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">
              טקסט אימות (ApiValid)
            </label>
            <p className="mb-1 text-xs text-slate-500">
              משמש להטמעת דף התשלום המאובטח (האייפרם) — נמצא מול המוסד תחת "עוד ‹ מפתחות API".
            </p>
            <input
              type="text"
              value={settings.apiValid}
              onChange={(e) => {
                setSettings((prev) => ({ ...prev, apiValid: e.target.value }));
                setSaved(false);
              }}
              disabled={saving}
              autoComplete="off"
              className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">מפתח API (מתחיל ב-npk_)</label>
            <p className="mb-1 text-xs text-slate-500">
              משמש רק לפעולות בצד השרת (יצירת חיוב, ניהול הוראות קבע) — לא נחשף לאפליקציה.
            </p>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => {
                setSettings((prev) => ({ ...prev, apiKey: e.target.value }));
                setSaved(false);
              }}
              disabled={saving}
              autoComplete="off"
              className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {saved && <p className="text-sm text-success">ההגדרות נשמרו.</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-fit rounded-full bg-teal-400 px-6 py-2 text-sm font-bold text-on-teal disabled:opacity-60"
          >
            {saving ? 'שומר…' : 'שמירה'}
          </button>
        </form>
      )}
    </div>
  );
}
