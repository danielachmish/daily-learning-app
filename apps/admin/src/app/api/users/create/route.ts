import { createClient as createServiceRoleClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { createClient as createServerClient } from '../../../../services/supabase/server';

function requireEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

interface CreateUserBody {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  genderTrack: 'men' | 'women';
  language: 'he' | 'en';
  freeAccess: boolean;
}

/**
 * Creates a user directly from the admin panel (e.g. for people onboarded
 * in person, without going through the app's own sign-up flow). Runs
 * server-side only — the service role key must never reach the browser.
 */
export async function POST(request: Request) {
  // Verify the caller is an authenticated admin before doing anything
  // privileged. Uses the caller's own session (anon-key client), so this
  // check goes through the same RLS/role checks as everywhere else.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'לא מחובר/ת.' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'אין הרשאת מנהל.' }, { status: 403 });
  }

  const body = (await request.json()) as CreateUserBody;

  if (!body.fullName || !body.email || !body.password) {
    return NextResponse.json({ error: 'שם מלא, אימייל וסיסמה הם שדות חובה.' }, { status: 400 });
  }
  if (body.password.length < 6) {
    return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים.' }, { status: 400 });
  }

  const supabaseUrl = requireEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  const serviceClient = createServiceRoleClient(supabaseUrl, serviceRoleKey);

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? 'יצירת המשתמש נכשלה.' }, { status: 400 });
  }

  const { error: profileError } = await serviceClient.from('profiles').insert({
    id: created.user.id,
    full_name: body.fullName,
    phone: body.phone || null,
    email: body.email,
    gender_track: body.genderTrack,
    language: body.language,
    free_access: body.freeAccess,
  });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned account with no profile.
    await serviceClient.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ id: created.user.id });
}
