import { createClient as createServiceRoleClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { createClient as createServerClient } from '../../../../services/supabase/server';

function requireEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

interface BulkInviteBody {
  fullName: string;
  email: string;
  phone: string;
  genderTrack: 'men' | 'women';
  language: 'he' | 'en';
}

// Where the invite email's link lands so the person can set a password —
// see apps/mobile/app/accept-invite.tsx, which reads the access/refresh
// token Supabase appends to this URL and finishes the flow.
const ACCEPT_INVITE_URL = 'https://halimudhayomi.co.il/accept-invite';

/**
 * Bulk-creates one subscriber per call from the admin panel's "ייבוא
 * מנויים מקובץ" (XLSX upload of existing physical-booklet subscribers) —
 * called once per row from the browser so each row gets its own
 * success/failure result and activity-log entry, same pattern as the
 * lesson PDF importer. Unlike /api/users/create (used for one-off,
 * in-person onboarding with a password set on the spot), this sends a
 * real email invite via Supabase's inviteUserByEmail — nobody types a
 * password for someone else, and free_access is set immediately so the
 * account works the moment they do.
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

  const body = (await request.json()) as BulkInviteBody;
  if (!body.fullName || !body.email) {
    return NextResponse.json({ error: 'שם מלא ומייל הם שדות חובה.' }, { status: 400 });
  }

  const supabaseUrl = requireEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  const serviceClient = createServiceRoleClient(supabaseUrl, serviceRoleKey);

  async function logBulkInvite(status: 'success' | 'error', message?: string, entityId?: string) {
    try {
      await serviceClient.from('admin_activity_log').insert({
        actor_id: actorId,
        actor_email: actorEmail,
        action: 'user.bulk_invite',
        entity_type: 'user',
        entity_id: entityId ?? null,
        status,
        message: message ?? null,
        metadata: { email: body.email, genderTrack: body.genderTrack, language: body.language },
      });
    } catch {
      // Never let a logging problem fail the actual response.
    }
  }

  // Re-running the same file (e.g. after fixing a handful of bad rows)
  // shouldn't re-invite or error on rows that already went through —
  // treat an existing profile for this email as a no-op success.
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('email', body.email)
    .maybeSingle();

  if (existingProfile) {
    await logBulkInvite('success', 'כבר קיים חשבון עם המייל הזה — דולג.', existingProfile.id);
    return NextResponse.json({ id: existingProfile.id, skipped: true });
  }

  const { data: created, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(body.email, {
    data: { full_name: body.fullName },
    redirectTo: ACCEPT_INVITE_URL,
  });

  if (inviteError || !created.user) {
    const message = inviteError?.message ?? 'שליחת ההזמנה נכשלה.';
    await logBulkInvite('error', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error: profileError } = await serviceClient.from('profiles').insert({
    id: created.user.id,
    full_name: body.fullName,
    phone: body.phone || null,
    email: body.email,
    gender_track: body.genderTrack,
    language: body.language,
    free_access: true,
    // The file has no gender column, so genderTrack is only a placeholder —
    // the app asks the person to choose their own track on first entry.
    track_confirmed: false,
  });

  if (profileError) {
    // Roll back the auth user (and its already-sent invite) so we don't
    // leave an orphaned account with no profile.
    await serviceClient.auth.admin.deleteUser(created.user.id);
    await logBulkInvite('error', profileError.message, created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  await logBulkInvite('success', undefined, created.user.id);
  return NextResponse.json({ id: created.user.id });
}
