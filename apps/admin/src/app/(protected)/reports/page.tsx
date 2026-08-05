'use client';

import { useEffect, useState } from 'react';

import { REVENUE_HISTORY_PAGE_SIZE, fetchRevenueHistory, type RevenueHistoryRow } from '../../../services/reports';
import { createClient } from '../../../services/supabase/client';

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<RevenueHistoryRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    fetchRevenueHistory(supabase, page, dateFrom || undefined, dateTo || undefined).then((result) => {
      if (!isMounted) return;
      if (result.error) setError(result.error);
      else if (result.data) {
        setRows(result.data.rows);
        setTotalCount(result.data.totalCount);
      }
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [page, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(totalCount / REVENUE_HISTORY_PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">דוחות — היסטוריית הכנסות</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-500">מתאריך</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setPage(1);
            setDateFrom(e.target.value);
          }}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        />
        <label className="text-sm text-slate-500">עד תאריך</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setPage(1);
            setDateTo(e.target.value);
          }}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        />
        <button
          onClick={() => {
            setPage(1);
            setDateFrom('');
            setDateTo('');
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
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">אין נתוני הכנסות בטווח הזה.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-start text-slate-500">
              <th className="py-2 pe-4 text-start font-medium">תאריך</th>
              <th className="py-2 pe-4 text-start font-medium">הכנסות ממנויים</th>
              <th className="py-2 pe-4 text-start font-medium">הכנסות מהקדשות</th>
              <th className="py-2 pe-4 text-start font-medium">סה״כ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.stat_date} className="border-b border-line">
                <td className="py-2 pe-4">{row.stat_date}</td>
                <td className="py-2 pe-4">₪{Number(row.subscription_revenue).toLocaleString()}</td>
                <td className="py-2 pe-4">₪{Number(row.dedication_revenue).toLocaleString()}</td>
                <td className="py-2 pe-4 font-medium">₪{Number(row.total_revenue).toLocaleString()}</td>
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
            עמוד {page} מתוך {totalPages} ({totalCount} ימים)
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
