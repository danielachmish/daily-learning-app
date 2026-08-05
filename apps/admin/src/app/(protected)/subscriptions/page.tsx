'use client';

import type { PlanType, SubscriptionStatus } from '@daily-learning/shared';
import { useEffect, useState } from 'react';

import {
  SUBSCRIPTIONS_PAGE_SIZE,
  cancelSubscription,
  extendSubscription,
  fetchSubscriptions,
  type PagedSubscriptions,
  type SubscriptionFilters,
} from '../../../services/subscriptions';
import { createClient } from '../../../services/supabase/client';

type SubscriptionRow = PagedSubscriptions['subscriptions'][number];

export default function SubscriptionsListPage() {
  const [filters, setFilters] = useState<SubscriptionFilters>({});
  const [page, setPage] = useState(1);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [extendDates, setExtendDates] = useState<Record<string, string>>({});

  async function reload() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const result = await fetchSubscriptions(supabase, page, filters);
    if (result.error) setError(result.error);
    else if (result.data) {
      setSubscriptions(result.data.subscriptions);
      setTotalCount(result.data.totalCount);
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  function updateFilter<K extends keyof SubscriptionFilters>(key: K, value: SubscriptionFilters[K]) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  async function handleExtend(subscription: SubscriptionRow) {
    const newEndDate = extendDates[subscription.id];
    if (!newEndDate) {
      alert('נא לבחור תאריך סיום חדש.');
      return;
    }
    setBusyId(subscription.id);
    const supabase = createClient();
    const result = await extendSubscription(supabase, subscription.id, newEndDate);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    reload();
  }

  async function handleCancel(subscription: SubscriptionRow) {
    if (!confirm('לבטל את המנוי הזה?')) return;
    setBusyId(subscription.id);
    const supabase = createClient();
    const result = await cancelSubscription(supabase, subscription.id);
    setBusyId(null);
    if (result.error) {
      alert(result.error);
      return;
    }
    reload();
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / SUBSCRIPTIONS_PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">מנויים</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilter('status', (e.target.value || undefined) as SubscriptionStatus | undefined)}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        >
          <option value="">כל הסטטוסים</option>
          <option value="active">פעיל</option>
          <option value="expired">פג תוקף</option>
          <option value="canceled">בוטל</option>
          <option value="payment_failed">תשלום נכשל</option>
        </select>
        <select
          value={filters.planType ?? ''}
          onChange={(e) => updateFilter('planType', (e.target.value || undefined) as PlanType | undefined)}
          className="rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
        >
          <option value="">כל התוכניות</option>
          <option value="monthly">חודשי</option>
          <option value="yearly">שנתי</option>
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
      ) : subscriptions.length === 0 ? (
        <p className="text-sm text-slate-500">לא נמצאו מנויים.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-start text-slate-500">
              <th className="py-2 pe-4 text-start font-medium">משתמש</th>
              <th className="py-2 pe-4 text-start font-medium">תוכנית</th>
              <th className="py-2 pe-4 text-start font-medium">סטטוס</th>
              <th className="py-2 pe-4 text-start font-medium">תוקף עד</th>
              <th className="py-2 pe-4 text-start font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((subscription) => (
              <tr key={subscription.id} className="border-b border-line">
                <td className="py-2 pe-4">
                  {subscription.profiles?.full_name ?? '—'}
                  <div className="text-xs text-slate-300">{subscription.profiles?.email}</div>
                </td>
                <td className="py-2 pe-4">{subscription.plan_type === 'monthly' ? 'חודשי' : 'שנתי'}</td>
                <td className="py-2 pe-4">{subscription.status}</td>
                <td className="py-2 pe-4">{subscription.end_date}</td>
                <td className="py-2 pe-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={extendDates[subscription.id] ?? ''}
                      onChange={(e) =>
                        setExtendDates((prev) => ({ ...prev, [subscription.id]: e.target.value }))
                      }
                      className="rounded-lg border border-line bg-paper-50 px-2 py-1 text-xs text-ink-900"
                    />
                    <button
                      onClick={() => handleExtend(subscription)}
                      disabled={busyId === subscription.id}
                      className="text-teal-600 hover:underline"
                    >
                      הארך
                    </button>
                    <button
                      onClick={() => handleCancel(subscription)}
                      disabled={busyId === subscription.id || subscription.status === 'canceled'}
                      className="text-danger hover:underline disabled:opacity-40"
                    >
                      בטל
                    </button>
                  </div>
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
            עמוד {page} מתוך {totalPages} ({totalCount} מנויים)
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
