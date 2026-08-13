/**
 * expo-router's +html.tsx custom document only runs during "static"
 * export, which crashes on this app (Supabase's AsyncStorage touches
 * `window` during server-side prerendering, which doesn't exist in Node).
 * This app is a fully client-side authenticated SPA with no need for
 * per-route SSR, so it uses "single" output instead — but that mode skips
 * +html.tsx entirely, so the PWA <head> additions are injected here as a
 * plain post-export string edit instead.
 */
const fs = require('fs');
const path = require('path');

// path.resolve (not path.join!) — the second CLI arg is now sometimes an
// absolute path (a system temp dir, when deploying), and path.join doesn't
// reset on an absolute segment the way path.resolve does; it would just
// concatenate "apps/mobile" + the absolute path into a bogus nested path.
const distDir = path.resolve(__dirname, '..', process.argv[2] || 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error(`inject-pwa-head: ${indexPath} not found — run "expo export --platform web" first.`);
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace('<html lang="en">', '<html lang="he" dir="rtl">');

const headAdditions = `
  <meta name="theme-color" content="#128499" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="לימוד יומי" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
`;

if (html.includes('<link rel="icon" href="/favicon.ico"/>')) {
  html = html.replace(
    '<link rel="icon" href="/favicon.ico"/>',
    `<link rel="icon" href="/favicon.ico"/>${headAdditions}`
  );
} else {
  html = html.replace('</head>', `${headAdditions}</head>`);
}

fs.writeFileSync(indexPath, html);
console.log(`inject-pwa-head: PWA metadata injected into ${indexPath}`);
