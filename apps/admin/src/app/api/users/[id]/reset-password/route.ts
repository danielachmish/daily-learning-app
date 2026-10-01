import { createClient as createServiceRoleClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { createClient as createServerClient } from '../../../../../services/supabase/server';

function requireEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

interface ResetPasswordBody {
  password: string;
}

const MIN_PASSWORD_LENGTH = 6;

/**
 * Admin-set password reset for an existing user — no email involved, same
 * philosophy as bulk-invite/create (this org has no reliable mailer setup).
 * The admin sets the new password directly and communicates it to the
 * subscriber themselves (phone call, in person, etc).
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

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

  const body = (await request.json()) as ResetPasswordBody;
  if (!body.password || body.password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים.` }, { status: 400 });
  }

  const supabaseUrl = requireEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  const serviceClient = createServiceRoleClient(supabaseUrl, serviceRoleKey);

  // Runs with the service-role client (needed for auth.admin.updateUserById),
  // which has no signed-in session of its own — so the activity-log write
  // passes the caller's identity explicitly, same as create/bulk-invite.
  // The new password value itself is never logged.
  async function logReset(status: 'success' | 'error', message?: string) {
    try {
      await serviceClient.from('admin_activity_log').insert({
        actor_id: actorId,
        actor_email: actorEmail,
        action: 'user.reset_password',
        entity_type: 'user',
        entity_id: id,
        status,
        message: message ?? null,
      });
    } catch {
      // Never let a logging problem fail the actual response.
    }
  }

  const { error } = await serviceClient.auth.admin.updateUserById(id, { password: body.password });

  if (error) {
    await logReset('error', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logReset('success');
  return NextResponse.json({ ok: true });
}
