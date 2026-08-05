'use client';

import type { UserProfile } from '@daily-learning/shared';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { USERS_PAGE_SIZE, fetchUsers } from '../../../services/users';
import { createClient } from '../../../services/supabase/client';

export default function UsersListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    fetchUsers(supabase, page, search).then((result) => {
      if (!isMounted) return;
      if (result.error) setError(result.error);
      else if (result.data) {
        setUsers(result.data.users);
        setTotalCount(result.data.totalCount);
      }
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [page, search]);

  const totalPages = Math.max(1, Math.ceil(totalCount / USERS_PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">משתמשים</h1>

      <input
        type="text"
        placeholder="חיפוש לפי שם, טלפון או אימייל…"
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="mb-4 w-full max-w-sm rounded-lg border border-line bg-paper-50 px-3 py-1.5 text-sm text-ink-900"
      />

      {loading ? (
        <p className="text-sm text-slate-500">טוען…</p>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-500">לא נמצאו משתמשים.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-start text-slate-500">
              <th className="py-2 pe-4 text-start font-medium">שם מלא</th>
              <th className="py-2 pe-4 text-start font-medium">טלפון</th>
              <th className="py-2 pe-4 text-start font-medium">אימייל</th>
              <th className="py-2 pe-4 text-start font-medium">מסלול</th>
              <th className="py-2 pe-4 text-start font-medium">שפה</th>
              <th className="py-2 pe-4 text-start font-medium">גישה חינמית</th>
              <th className="py-2 pe-4 text-start font-medium">סטטוס</th>
              <th className="py-2 pe-4 text-start font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-line">
                <td className="py-2 pe-4">{user.full_name}</td>
                <td className="py-2 pe-4">{user.phone ?? '—'}</td>
                <td className="py-2 pe-4">{user.email}</td>
                <td className="py-2 pe-4">{user.gender_track === 'men' ? 'גברים' : 'נשים'}</td>
                <td className="py-2 pe-4">{user.language === 'he' ? 'עברית' : 'English'}</td>
                <td className="py-2 pe-4">{user.free_access ? 'כן' : 'לא'}</td>
                <td className="py-2 pe-4">
                  {user.account_status === 'blocked' ? (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                      חסום
                    </span>
                  ) : (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                      פעיל
                    </span>
                  )}
                </td>
                <td className="py-2 pe-4">
                  <Link href={`/users/${user.id}`} className="text-teal-600 hover:underline">
                    פרטים
                  </Link>
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
            עמוד {page} מתוך {totalPages} ({totalCount} משתמשים)
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
