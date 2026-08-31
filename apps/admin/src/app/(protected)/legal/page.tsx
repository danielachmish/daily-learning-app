'use client';

import { useEffect, useState } from 'react';

import { PRIVACY_POLICY_KEY, TERMS_OF_USE_KEY } from '../../../services/legalContent';
import { createClient } from '../../../services/supabase/client';

export default function LegalContentPage() {
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [termsOfUse, setTermsOfUse] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    supabase
      .from('settings')
      .select('key, value')
      .in('key', [PRIVACY_POLICY_KEY, TERMS_OF_USE_KEY])
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) setError(fetchError.message);
        const map = new Map((data ?? []).map((row) => [row.key, row.value]));
        setPrivacyPolicy(map.get(PRIVACY_POLICY_KEY) ?? '');
        setTermsOfUse(map.get(TERMS_OF_USE_KEY) ?? '');
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error: saveError } = await supabase.from('settings').upsert([
      { key: PRIVACY_POLICY_KEY, value: privacyPolicy, updated_at: new Date().toISOString() },
      { key: TERMS_OF_USE_KEY, value: termsOfUse, updated_at: new Date().toISOString() },
    ]);

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-ink-900">מסמכים משפטיים</h1>
      <p className="mt-2 text-sm text-slate-500">
        הטקסט שתמלאו כאן מוצג לציבור בעמודים ציבוריים (לא דורשים התחברות) — הם מקושרים ממסך ההרשמה
        באפליקציה. הדביקו את הנוסח שכבר קיים לעמותה; אין צורך בעיצוב, רק טקסט רגיל (ירידות שורה
        נשמרות).
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">טוען…</p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">מדיניות פרטיות</label>
            <textarea
              value={privacyPolicy}
              onChange={(e) => {
                setPrivacyPolicy(e.target.value);
                setSaved(false);
              }}
              disabled={saving}
              rows={12}
              className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
            />
            <a
              href="/legal/privacy"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-teal-600 hover:underline"
            >
              צפייה בעמוד הציבורי ↗
            </a>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">תנאי שימוש</label>
            <textarea
              value={termsOfUse}
              onChange={(e) => {
                setTermsOfUse(e.target.value);
                setSaved(false);
              }}
              disabled={saving}
              rows={12}
              className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
            />
            <a
              href="/legal/terms"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-teal-600 hover:underline"
            >
              צפייה בעמוד הציבורי ↗
            </a>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {saved && <p className="text-sm text-success">נשמר בהצלחה.</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-fit rounded-full bg-teal-400 px-6 py-2 text-sm font-bold text-on-teal disabled:opacity-60"
          >
            {saving ? 'שומר…' : 'שמירה'}
          </button>
        </div>
      )}
    </div>
  );
}
