import type { Metadata } from 'next';

import { getLegalContent, TERMS_OF_USE_KEY } from '../../../services/legalContent';

export const metadata: Metadata = {
  title: 'תנאי שימוש — הלימוד היומי',
};

// Public page — no admin login required (linked from the sign-up screen,
// before an account exists). Content is edited in the admin panel at
// /legal (protected). Not statically cached — always reflects the latest
// saved text.
export const dynamic = 'force-dynamic';

export default async function TermsOfUsePage() {
  const content = await getLegalContent(TERMS_OF_USE_KEY);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-extrabold text-ink-900">תנאי שימוש</h1>
      {content ? (
        <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-ink-700">{content}</p>
      ) : (
        <p className="mt-6 text-sm text-slate-500">תנאי השימוש עדיין לא הוזנו.</p>
      )}
    </main>
  );
}
