import { createClient as createServiceRoleClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { createClient as createServerClient } from '../../../../services/supabase/server';

function requireEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

interface BulkCreateBody {
  fullName: string;
  email: string;
  /** Digits-only phone number — this IS the account's password, not just contact info. */
  phone: string;
}

const MIN_PASSWORD_LENGTH = 6;

// A name/email/phone list gives no reliable signal for which track
// (men/women) each subscriber belongs to, so this is only ever a
// placeholder — apps/mobile/app/choose-track.tsx has the person pick
// their real track (track_confirmed=false routes them there on first
// entry, before any lesson is shown).
const PLACEHOLDER_TRACK = 'women';
const PLACEHOLDER_LANGUAGE = 'he';

/**
 * Bulk-creates one subscriber per call from the admin panel's "ייבוא
 * מנויים מקובץ" (XLSX upload of existing physical-booklet subscribers) —
 * called once per row from the browser so each row gets its own
 * success/failure result and activity-log entry, same pattern as the
 * lesson PDF importer.
 *
 * Each account is created with a real password (the subscriber's own
 * phone number, digits-only — see subscriberImport.ts) instead of an
 * email invite: nobody needs a working email address on file, nothing
 * depends on Supabase's rate-limited default mailer, and the org only
 * ever has to communicate one universal instruction to everyone ("log in
 * with your email and your phone number") instead of distributing 1700
 * individual credentials or links.
 */
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'לא מחובר/ת.' }, { status: 401 });
  }
  const actorId = user.id;
  const actorEmail = user.email ?? null;

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'אין הרשאת מנהל.' }, { status: 403 });
  }

  const body = (await request.json()) as BulkCreateBody;
  if (!body.fullName || !body.email) {
    return NextResponse.json({ error: 'שם מלא ומייל הם שדות חובה.' }, { status: 400 });
  }
  if (body.phone.length < MIN_PASSWORD_LENGTH) {
    // Defense in depth — parseSubscriberFile already filters these out
    // client-side before this route is ever called per-row.
    return NextResponse.json({ error: 'מספר הטלפון קצר מדי לשמש כסיסמה.' }, { status: 400 });
  }

  const supabaseUrl = requireEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  const serviceClient = createServiceRoleClient(supabaseUrl, serviceRoleKey);

  async function logBulkCreate(status: 'success' | 'error', message?: string, entityId?: string) {
    try {
      await serviceClient.from('admin_activity_log').insert({
        actor_id: actorId,
        actor_email: actorEmail,
        action: 'user.bulk_import',
        entity_type: 'user',
        entity_id: entityId ?? null,
        status,
        message: message ?? null,
        metadata: { email: body.email },
      });
    } catch {
      // Never let a logging problem fail the actual response.
    }
  }

  // Re-running the same file (e.g. after fixing a handful of bad rows)
  // shouldn't re-create or error on rows that already went through —
  // treat an existing profile for this email as a no-op success.
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('email', body.email)
    .maybeSingle();

  if (existingProfile) {
    await logBulkCreate('success', 'כבר קיים חשבון עם המייל הזה — דולג.', existingProfile.id);
    return NextResponse.json({ id: existingProfile.id, skipped: true });
  }

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email: body.email,
    password: body.phone,
    email_confirm: true,
  });

  if (createError || !created.user) {
    const message = createError?.message ?? 'יצירת החשבון נכשלה.';
    await logBulkCreate('error', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error: profileError } = await serviceClient.from('profiles').insert({
    id: created.user.id,
    full_name: body.fullName,
    phone: body.phone || null,
    email: body.email,
    gender_track: PLACEHOLDER_TRACK,
    language: PLACEHOLDER_LANGUAGE,
    free_access: true,
    // The file has no gender column, so the track above is only a
    // placeholder — the app asks the person to choose their own track on
    // first entry (see apps/mobile/app/choose-track.tsx).
    track_confirmed: false,
  });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned account with no profile.
    await serviceClient.auth.admin.deleteUser(created.user.id);
    await logBulkCreate('error', profileError.message, created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  await logBulkCreate('success', undefined, created.user.id);
  return NextResponse.json({ id: created.user.id });
}
