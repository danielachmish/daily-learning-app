import type { Metadata } from 'next';

import { getLegalContent, PRIVACY_POLICY_KEY } from '../../../services/legalContent';

export const metadata: Metadata = {
  title: 'מדיניות פרטיות — הלימוד היומי',
};

// Public page — no admin login required, since visitors need to be able to
// read this before they even sign up. Content is edited in the admin panel
// at /legal (protected). Not statically cached: this needs to reflect the
// org's latest saved text on every request, not a build-time snapshot.
export const dynamic = 'force-dynamic';

export default async function PrivacyPolicyPage() {
  const content = await getLegalContent(PRIVACY_POLICY_KEY);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-extrabold text-ink-900">מדיניות פרטיות</h1>
      {content ? (
        <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-ink-700">{content}</p>
      ) : (
        <p className="mt-6 text-sm text-slate-500">מדיניות הפרטיות עדיין לא הוזנה.</p>
      )}
    </main>
  );
}
