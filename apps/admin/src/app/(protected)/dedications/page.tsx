'use client';

import type { ApprovalStatus, Dedication, DedicationType, PaymentStatus } from '@daily-learning/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  DEDICATIONS_PAGE_SIZE,
  approveDedication,
  fetchDedications,
  hideDedication,
  rejectDedication,
  type DedicationFilters,
} from '../../../services/dedications';
import { createClient } from '../../../services/supabase/client';
import { APPROVAL_STATUS_LABELS, DEDICATION_TYPE_LABELS, PAYMENT_STATUS_LABELS } from '../../../utils/dedicationLabels';

export default function DedicationsListPage() {
  const [filters, setFilters] = useState<DedicationFilters>({});
  const [page, setPage] = useState(1);
  const [dedications, setDedications] = useState<Dedication[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const result = await fetchDedications(supabase, page, filters);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setDedications(result.data.dedications);
      setTotalCount(result.data.totalCount);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  function updateFilter<K extends keyof DedicationFilters>(key: K, value: DedicationFilters[K]) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  async function handleAction(
    dedication: Dedication,
    action: (supabase: ReturnType<typeof createClient>, id: string) => ReturnType<typeof approveDedication>
  ) {
    setBusyId(dedication.id);
    const supabase = createClient();
    const result = await action(supabase, dedication.id);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    reload();
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / DEDICATIONS_PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">הקדשות</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="date"
          value={filters.date ?? ''}
          onChange={(e) => updateFilter('date', e.target.value as DedicationFilters['date'])}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        />
        <select
          value={filters.type ?? ''}
          onChange={(e) => updateFilter('type', (e.target.value || undefined) as DedicationType | undefined)}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        >
          <option value="">כל הסוגים</option>
          {Object.entries(DEDICATION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filters.paymentStatus ?? ''}
          onChange={(e) => updateFilter('paymentStatus', (e.target.value || undefined) as PaymentStatus | undefined)}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        >
          <option value="">כל סטטוסי תשלום</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filters.approvalStatus ?? ''}
          onChange={(e) =>
            updateFilter('approvalStatus', (e.target.value || undefined) as ApprovalStatus | undefined)
          }
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        >
          <option value="">כל סטטוסי אישור</option>
          {Object.entries(APPROVAL_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
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
      ) : dedications.length === 0 ? (
        <p className="text-sm text-slate-500">לא נמצאו הקדשות.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-start text-slate-500">
              <th className="py-2 pe-4 text-start font-medium">תאריך</th>
              <th className="py-2 pe-4 text-start font-medium">סוג</th>
              <th className="py-2 pe-4 text-start font-medium">נוסח</th>
              <th className="py-2 pe-4 text-start font-medium">תשלום</th>
              <th className="py-2 pe-4 text-start font-medium">אישור</th>
              <th className="py-2 pe-4 text-start font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {dedications.map((dedication) => (
              <tr key={dedication.id} className="border-b border-line">
                <td className="py-2 pe-4">{dedication.dedication_date}</td>
                <td className="py-2 pe-4">{DEDICATION_TYPE_LABELS[dedication.type]}</td>
                <td className="max-w-xs truncate py-2 pe-4">{dedication.dedication_text}</td>
                <td className="py-2 pe-4">{PAYMENT_STATUS_LABELS[dedication.payment_status]}</td>
                <td className="py-2 pe-4">{APPROVAL_STATUS_LABELS[dedication.approval_status]}</td>
                <td className="flex flex-wrap gap-3 py-2 pe-4">
                  <Link
                    href={`/dedications/${dedication.id}`}
                    className="text-teal-600 hover:underline"
                  >
                    פרטים
                  </Link>
                  {dedication.approval_status !== 'approved' && (
                    <button
                      onClick={() => handleAction(dedication, approveDedication)}
                      disabled={busyId === dedication.id}
                      className="text-success hover:underline"
                    >
                      אישור
                    </button>
                  )}
                  {dedication.approval_status !== 'rejected' && (
                    <button
                      onClick={() => handleAction(dedication, rejectDedication)}
                      disabled={busyId === dedication.id}
                      className="text-danger hover:underline"
                    >
                      דחייה
                    </button>
                  )}
                  {dedication.approval_status !== 'hidden' && (
                    <button
                      onClick={() => handleAction(dedication, hideDedication)}
                      disabled={busyId === dedication.id}
                      className="text-slate-500 hover:underline"
                    >
                      הסתרה
                    </button>
                  )}
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
            עמוד {page} מתוך {totalPages} ({totalCount} הקדשות)
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
