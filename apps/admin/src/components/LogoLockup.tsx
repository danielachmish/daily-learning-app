/**
 * The org's real logo, used as-is (not recreated/split into pieces) per
 * explicit request — a single image, exactly matching the source file.
 * Source: apps/admin/public/brand/logo-full.png (2482x1376, converted from
 * the org-provided CMYK JPEG to sRGB so it renders with correct colors on
 * the web — CMYK JPEGs can render wrong/inverted in browsers otherwise).
 */
export function LogoLockup({ width = 180 }: { width?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-full.png"
      alt="פרויקט הלימוד היומי — בראשות הגאון רבי יגאל כהן שליט״א"
      width={width}
      height={Math.round(width / 1.8038)}
      style={{ width, height: 'auto' }}
    />
  );
}
