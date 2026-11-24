'use client';

import { useState } from 'react';

import { AdminActivityLogView } from '../../../components/AdminActivityLogView';
import { SystemEventLogView } from '../../../components/SystemEventLogView';

type Tab = 'system' | 'admin';

export default function LogsPage() {
  const [tab, setTab] = useState<Tab>('system');

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium ${
      active ? 'bg-teal-600 text-on-teal' : 'text-slate-500 hover:bg-teal-100 hover:text-teal-600'
    }`;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold text-ink-900">יומן מערכת ותקלות</h1>
      <div className="mb-5 flex gap-2">
        <button onClick={() => setTab('system')} className={tabClass(tab === 'system')}>
          אירועי משתמשים ותקלות
        </button>
        <button onClick={() => setTab('admin')} className={tabClass(tab === 'admin')}>
          פעולות בעמדת הניהול
        </button>
      </div>
      {tab === 'system' ? <SystemEventLogView /> : <AdminActivityLogView />}
    </div>
  );
}
