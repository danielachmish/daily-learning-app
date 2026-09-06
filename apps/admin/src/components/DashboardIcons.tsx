/**
 * Small hand-authored outline icons for the dashboard tiles — kept as
 * plain inline SVG (no icon-library dependency) since only a handful are
 * needed. Each inherits color from its parent via currentColor, sized by
 * the wrapping element's font-size/width-height.
 */

type IconProps = { className?: string };

export function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" strokeLinecap="round" />
      <circle cx="17" cy="8.5" r="2.3" />
      <path d="M15.8 13.3c2.4.3 4.2 2.1 4.2 4.7" strokeLinecap="round" />
    </svg>
  );
}

export function BookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 6.5c-1.6-1.2-3.6-1.7-5.8-1.7-.7 0-1.2.5-1.2 1.2v11c0 .7.5 1.2 1.2 1.2 2.2 0 4.2.5 5.8 1.7" />
      <path d="M12 6.5c1.6-1.2 3.6-1.7 5.8-1.7.7 0 1.2.5 1.2 1.2v11c0 .7-.5 1.2-1.2 1.2-2.2 0-4.2.5-5.8 1.7" />
      <path d="M12 6.5v13" />
    </svg>
  );
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M12 19.5s-7-4.4-9-8.4C1.6 8 3 5 6.3 5c1.9 0 3.3 1 4.7 2.6.3.4.9.4 1.2 0C13.6 6 15 5 16.9 5c3.3 0 4.7 3 3.3 6.1-2 4-9 8.4-9 8.4z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShekelIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <text x="12" y="17" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">
        ₪
      </text>
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.3 12.2l2.4 2.4 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
