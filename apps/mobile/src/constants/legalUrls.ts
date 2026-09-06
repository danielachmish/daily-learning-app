// Public pages served by the admin panel (apps/admin/src/app/legal/*) — no
// login required, since a visitor needs to read these before they even have
// an account. Content itself is edited by the org in the admin panel's
// "מסמכים משפטיים" screen, not hardcoded here. Shared by register.tsx and
// about.tsx so both link to the same place.
const ADMIN_BASE_URL = 'https://admin.halimudhayomi.co.il';

export const PRIVACY_POLICY_URL = `${ADMIN_BASE_URL}/legal/privacy`;
export const TERMS_URL = `${ADMIN_BASE_URL}/legal/terms`;
export const ACCESSIBILITY_STATEMENT_URL = `${ADMIN_BASE_URL}/legal/accessibility`;
