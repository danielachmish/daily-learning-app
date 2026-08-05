/** Original app mark: an open book with a small flame above it — a nod to the ner tamid and to an unbroken daily streak. Matches the mobile app's mark. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M6 14C6 12.3 7.3 11 9 11h13v24H9c-1.7 0-3-1.3-3-3V14z" fill="#2CB9AC" />
      <path d="M42 14c0-1.7-1.3-3-3-3H26v24h13c1.7 0 3-1.3 3-3V14z" fill="#167F79" />
      <rect x="22" y="11" width="4" height="24" fill="#0E4F4B" />
      <path
        d="M24 3c1.8 2.3 3.4 4.3 3.4 6.5A3.4 3.4 0 0 1 24 13a3.4 3.4 0 0 1-3.4-3.5C20.6 7.3 22.2 5.3 24 3z"
        fill="#C98A2E"
      />
    </svg>
  );
}
