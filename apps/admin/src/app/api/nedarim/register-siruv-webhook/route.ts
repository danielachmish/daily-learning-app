import { createClient as createServiceRoleClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { createClient as createServerClient } from '../../../../services/supabase/server';

const MANAGE_URL = 'https://matara.pro/nedarimplus/Reports/Manage3.aspx';

function requireEnvVar(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * Registers this project's nedarim-siruv-webhook function as the org's
 * "Siruv" (decline) webhook with Nedarim Plus, so standing-order renewal
 * failures reach us in real time (see that function's own header comment
 * for why this matters — otherwise a failed renewal is invisible to us
 * indefinitely, since the main CallBack only fires on success).
 *
 * Self-service by design: no one needs to hand-run a curl command or read
 * Nedarim's dashboard docs — an admin who has already saved Mosad ID /
 * ApiKey in Settings can just click a button.
 */
export async function POST() {
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

  const supabaseUrl = requireEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  const serviceClient = createServiceRoleClient(supabaseUrl, serviceRoleKey);

  const { data: settingsRows, error: settingsError } = await serviceClient
    .from('payment_provider_settings')
    .select('key, value')
    .in('key', ['nedarim_mosad_id', 'nedarim_api_key']);

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }
  const settingsMap = new Map((settingsRows ?? []).map((row) => [row.key, row.value]));
  const mosadId = settingsMap.get('nedarim_mosad_id');
  const apiPassword = settingsMap.get('nedarim_api_key');

  if (!mosadId || !apiPassword) {
    return NextResponse.json({ error: 'יש למלא ולשמור קודם מספר מוסד ומפתח API למטה.' }, { status: 400 });
  }

  const webhookUrl = `${supabaseUrl}/functions/v1/nedarim-siruv-webhook`;

  const form = new URLSearchParams({
    Action: 'SetWebhook',
    MosadId: mosadId,
    ApiPassword: apiPassword,
    Type: 'Siruv',
    Url: webhookUrl,
    // A previously-configured address (e.g. set by hand before this button
    // existed) shouldn't be silently overwritten without deliberately
    // choosing to — but for THIS webhook the only client that should ever
    // own it is this app, so forcing is safe and avoids a confusing
    // no-op the first time this is clicked on a project that already
    // dabbled with the Nedarim dashboard directly.
    Force: '1',
  });

  let nedarimResp: Response;
  try {
    nedarimResp = await fetch(MANAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
  } catch {
    return NextResponse.json({ error: 'לא ניתן היה להתחבר לשרתי נדרים פלוס.' }, { status: 502 });
  }

  let result: { Result?: string; Message?: string; Url?: string };
  try {
    result = await nedarimResp.json();
  } catch {
    return NextResponse.json({ error: 'תשובה לא צפויה מנדרים פלוס.' }, { status: 502 });
  }

  if (result.Result !== 'OK') {
    return NextResponse.json({ error: result.Message ?? 'נדרים פלוס דחו את הבקשה.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, url: result.Url });
}
