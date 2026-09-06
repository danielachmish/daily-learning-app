import type { Metadata } from 'next';

import { ACCESSIBILITY_STATEMENT_KEY, getLegalContent } from '../../../services/legalContent';

export const metadata: Metadata = {
  title: 'הצהרת נגישות — הלימוד היומי',
};

// Public page — no admin login required (same reasoning as /legal/privacy
// and /legal/terms: regulations require this to be reachable by anyone,
// not just signed-in users). Content is edited in the admin panel's
// "מסמכים משפטיים" screen.
export const dynamic = 'force-dynamic';

export default async function AccessibilityStatementPage() {
  const content = await getLegalContent(ACCESSIBILITY_STATEMENT_KEY);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-extrabold text-ink-900">הצהרת נגישות</h1>
      {content ? (
        <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-ink-700">{content}</p>
      ) : (
        <p className="mt-6 text-sm text-slate-500">הצהרת הנגישות עדיין לא הוזנה.</p>
      )}
    </main>
  );
}
