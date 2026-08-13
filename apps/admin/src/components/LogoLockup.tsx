import { Logo } from './Logo';

/**
 * Full lockup version of the org's mark — icon + "פרויקט הלימוד היומי" +
 * the subtitle line, stacked to fit a narrow sidebar column. See Logo.tsx
 * for the icon-only version used in tight/inline spots (mobile top bar,
 * login page heading).
 */
export function LogoLockup() {
  return (
    <div className="flex flex-col items-center gap-1 px-1 text-center">
      <Logo size={44} />
      <div className="mt-1 leading-tight">
        <div className="text-xs font-bold text-amber-500">פרויקט</div>
        <div className="text-base font-extrabold text-ink-900">הלימוד היומי</div>
      </div>
      <div className="text-[11px] leading-tight text-teal-600">בראשות הגאון רבי יגאל כהן שליט״א</div>
    </div>
  );
}
