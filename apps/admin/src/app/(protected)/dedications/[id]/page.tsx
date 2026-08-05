'use client';

import type { Dedication } from '@daily-learning/shared';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  approveDedication,
  fetchDedicationById,
  hideDedication,
  rejectDedication,
  updateDedicationText,
} from '../../../../services/dedications';
import { createClient } from '../../../../services/supabase/client';
import {
  APPROVAL_STATUS_LABELS,
  DEDICATION_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../../../../utils/dedicationLabels';

export default function DedicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [dedication, setDedication] = useState<Dedication | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const result = await fetchDedicationById(supabase, id);
      if (result.error) setLoadError(result.error);
      if (result.data) setText(result.data.dedication_text);
      setDedication(result.data);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSaveText() {
    setSaving(true);
    const supabase = createClient();
    const result = await updateDedicationText(supabase, id, text);
    setSaving(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setDedication(result.data);
  }

  async function handleAction(action: typeof approveDedication) {
    setBusy(true);
    const supabase = createClient();
    const result = await action(supabase, id);
    setBusy(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    setDedication(result.data);
  }

  if (loading) return <p className="text-sm text-slate-500">טוען…</p>;
  if (loadError || !dedication) return <p className="text-sm text-danger">{loadError ?? 'ההקדשה לא נמצאה.'}</p>;

  return (
    <div className="max-w-lg">
      <button onClick={() => router.push('/dedications')} className="mb-4 text-sm text-slate-500 hover:underline">
        ‹ חזרה לרשימה
      </button>

      <h1 className="mb-4 text-2xl font-extrabold text-ink-900">פרטי הקדשה</h1>

      <dl className="mb-6 space-y-2 text-sm">
        <Row label="תאריך" value={dedication.dedication_date} />
        <Row label="סוג" value={DEDICATION_TYPE_LABELS[dedication.type]} />
        <Row label="שם המקדיש" value={dedication.donor_name ?? '—'} />
        <Row label="סכום" value={`₪${dedication.amount}`} />
        <Row label="סטטוס תשלום" value={PAYMENT_STATUS_LABELS[dedication.payment_status]} />
        <Row label="סטטוס אישור" value={APPROVAL_STATUS_LABELS[dedication.approval_status]} />
        <Row label="נוצר בתאריך" value={new Date(dedication.created_at).toLocaleString('he-IL')} />
        {dedication.approved_at && (
          <Row label="אושר בתאריך" value={new Date(dedication.approved_at).toLocaleString('he-IL')} />
        )}
      </dl>

      <label className="mb-1 block text-sm font-medium text-ink-700">נוסח ההקדשה</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="mb-2 w-full rounded-lg border border-line bg-paper-50 px-3 py-2 text-sm text-ink-900"
      />
      <button
        onClick={handleSaveText}
        disabled={saving || text === dedication.dedication_text}
        className="mb-6 rounded-full bg-teal-400 px-4 py-2 text-sm font-bold text-on-teal disabled:opacity-50"
      >
        {saving ? 'שומר…' : 'שמור נוסח'}
      </button>

      <div className="flex gap-3">
        <button
          onClick={() => handleAction(approveDedication)}
          disabled={busy || dedication.approval_status === 'approved'}
          className="rounded-full bg-success px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          אישור
        </button>
        <button
          onClick={() => handleAction(rejectDedication)}
          disabled={busy || dedication.approval_status === 'rejected'}
          className="rounded-full bg-danger px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          דחייה
        </button>
        <button
          onClick={() => handleAction(hideDedication)}
          disabled={busy || dedication.approval_status === 'hidden'}
          className="rounded-full bg-slate-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          הסתרה
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line py-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-ink-900">{value}</dd>
    </div>
  );
}
