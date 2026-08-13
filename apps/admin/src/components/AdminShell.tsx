'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Logo } from './Logo';
import { LogoLockup } from './LogoLockup';
import { SignOutButton } from './SignOutButton';

const NAV_LINKS = [
  { href: '/', label: 'דשבורד' },
  { href: '/users', label: 'משתמשים' },
  { href: '/subscriptions', label: 'מנויים' },
  { href: '/lessons', label: 'לימודים' },
  { href: '/dedications', label: 'הקדשות' },
  { href: '/settings', label: 'הגדרות' },
  { href: '/reports', label: 'דוחות' },
];

interface Props {
  fullName: string;
  children: React.ReactNode;
}

export function AdminShell({ fullName, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile nav whenever the route changes, so tapping a link
  // doesn't leave the menu open behind the newly-loaded page.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      {/* Mobile-only top bar with a menu toggle. Hidden on desktop, where the
          sidebar below is always visible instead. */}
      <div className="flex items-center justify-between border-b border-line bg-paper-50 p-4 md:hidden">
        <div className="flex items-center gap-2">
          <Logo size={24} />
          <span className="text-sm font-extrabold text-ink-900">לימוד יומי</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'סגירת תפריט' : 'פתיחת תפריט'}
          aria-expanded={menuOpen}
          className="rounded-lg border border-line px-3 py-2 text-lg leading-none text-ink-700"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      <aside
        className={`${
          menuOpen ? 'flex' : 'hidden'
        } w-full flex-col gap-1 border-b border-line bg-paper-50 p-4 md:flex md:w-56 md:border-b-0 md:border-e`}
      >
        <div className="mb-5 hidden md:block">
          <LogoLockup />
        </div>
        <p className="mb-4 truncate text-sm font-medium text-slate-500 md:text-center">{fullName}</p>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-teal-100 hover:text-teal-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <SignOutButton />
      </aside>

      <main className="flex-1 bg-paper-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
