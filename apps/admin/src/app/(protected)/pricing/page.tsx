'use client';

import { useEffect, useState } from 'react';

import { fetchPrices, savePrices, type Prices } from '../../../services/pricing';
import { createClient } from '../../../services/supabase/client';

export default function PricingPage() {
  const [prices, setPrices] = useState<Prices>({ monthlyPrice: '', yearlyPrice: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    fetchPrices(supabase).then((result) => {
      if (!isMounted) return;
      if (result.error) setError(result.error);
      if (result.data) setPrices(result.data);
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
    const { error: saveError } = await savePrices(supabase, prices);

    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-extrabold text-ink-900">מחירי מנוי</h1>
      <p className="mt-2 text-sm text-slate-500">
        המחירים כאן הם מה שיחויב בפועל בפעם הבאה שמישהו נרשם למנוי — שינוי כאן{' '}
        <strong>לא</strong> משפיע על מנויים קיימים, רק על הרשמות חדשות מרגע השמירה.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">טוען…</p>
      ) : (
        <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">מחיר מנוי חודשי (₪)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={prices.monthlyPrice}
              onChange={(e) => {
                setPrices((prev) => ({ ...prev, monthlyPrice: e.target.value }));
                setSaved(false);
              }}
              disabled={saving}
              className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-500">מחיר מנוי שנתי (₪)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={prices.yearlyPrice}
              onChange={(e) => {
                setPrices((prev) => ({ ...prev, yearlyPrice: e.target.value }));
                setSaved(false);
              }}
              disabled={saving}
              className="w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {saved && <p className="text-sm text-success">נשמר בהצלחה.</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-fit rounded-full bg-teal-400 px-6 py-2 text-sm font-bold text-on-teal disabled:opacity-60"
          >
            {saving ? 'שומר…' : 'שמירה'}
          </button>
        </form>
      )}

      <p className="mt-8 text-sm text-slate-500">
        מחירי הקדשה מנוהלים בנפרד, כי לכל הקדשה יש משך זמן משלה — ראו{' '}
        <a href="/dedication-options" className="text-teal-600 hover:underline">
          אפשרויות הקדשה
        </a>
        .
      </p>
    </div>
  );
}
