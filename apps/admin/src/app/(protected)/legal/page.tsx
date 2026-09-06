'use client';

import { useEffect, useState } from 'react';

import { ACCESSIBILITY_STATEMENT_KEY, PRIVACY_POLICY_KEY, TERMS_OF_USE_KEY } from '../../../services/legalContent';
import { createClient } from '../../../services/supabase/client';

// Starter draft, not a certified compliance claim — Israeli accessibility
// statements (per תקנות שוויון זכויות לאנשים עם מוגבלות) conventionally
// include these elements, but the bracketed placeholders (coordinator name/
// contact, actual conformance level) need the org's real details filled in,
// ideally after a real accessibility audit, before this is trustworthy to
// publish as-is.
const ACCESSIBILITY_DRAFT = `עמותת "הלימוד היומי" רואה חשיבות רבה במתן שירות שוויוני ונגיש לכלל הציבור, לרבות אנשים עם מוגבלות.

אנו פועלים להנגשת האתר והאפליקציה בהתאם לתקן הישראלי ת"י 5568 להנגשת תכנים באינטרנט, המבוסס על הנחיות WCAG 2.0 ברמה AA, ובהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013.

רכז/ת הנגישות של הארגון:
שם: [להשלים]
טלפון: [להשלים]
דוא"ל: [להשלים]

אם נתקלתם בבעיית נגישות באתר או באפליקציה, נשמח שתפנו אלינו לפרטים שלעיל ונטפל בפנייה בהקדם.

הצהרה זו עודכנה לאחרונה בתאריך: [להשלים]`;

export default function LegalContentPage() {
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [termsOfUse, setTermsOfUse] = useState('');
  const [accessibilityStatement, setAccessibilityStatement] = useState('');
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
      .in('key', [PRIVACY_POLICY_KEY, TERMS_OF_USE_KEY, ACCESSIBILITY_STATEMENT_KEY])
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) setError(fetchError.message);
        const map = new Map((data ?? []).map((row) => [row.key, row.value]));
        setPrivacyPolicy(map.get(PRIVACY_POLICY_KEY) ?? '');
        setTermsOfUse(map.get(TERMS_OF_USE_KEY) ?? '');
        // Pre-fills a starter draft only when nothing was ever saved yet —
        // once the org has their own text saved, that's always what loads.
        setAccessibilityStatement(map.get(ACCESSIBILITY_STATEMENT_KEY) ?? ACCESSIBILITY_DRAFT);
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
      { key: ACCESSIBILITY_STATEMENT_KEY, value: accessibilityStatement, updated_at: new Date().toISOString() },
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">הצהרת נגישות</label>
            <p className="mb-1 text-xs text-slate-500">
              מולא כאן טיוטת פתיחה עם מקומות ל[השלמה] (פרטי רכז נגישות, תאריך) — יש להשלים ולעדכן
              לפני פרסום, רצוי לאחר בדיקת נגישות אמיתית.
            </p>
            <textarea
              value={accessibilityStatement}
              onChange={(e) => {
                setAccessibilityStatement(e.target.value);
                setSaved(false);
              }}
              disabled={saving}
              rows={12}
              className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
            />
            <a
              href="/legal/accessibility"
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
