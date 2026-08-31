import { createClient as createServiceRoleClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { createClient as createServerClient } from '../../../../services/supabase/server';

const MANAGE_URL = 'https://matara.pro/nedarimplus/Reports/Manage3.aspx';

type KevaAction = 'freeze' | 'reactivate' | 'cancel';

const ACTION_TO_NEDARIM_ACTION: Record<KevaAction, string> = {
  freeze: 'DisableKeva',
  reactivate: 'EnableKevaNew',
  cancel: 'DeleteKeva',
};

function requireEnvVar(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

interface RequestBody {
  subscriptionId: string;
  action: KevaAction;
}

/**
 * Freezes, reactivates, or permanently cancels a Nedarim Plus credit-card
 * standing order (Keva) — the piece that was missing before: the admin
 * panel's plain "cancel subscription" button used to only update our own
 * `subscriptions.status`, never telling Nedarim to actually stop charging
 * the card. This calls their real Manage3.aspx API with the org's own
 * ApiPassword (server-only secret, read via the service-role client — never
 * sent to the browser) and only updates our DB after Nedarim confirms.
 */
export async function POST(request: Request) {
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

  const body = (await request.json()) as RequestBody;
  if (!body.subscriptionId || !ACTION_TO_NEDARIM_ACTION[body.action]) {
    return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 400 });
  }

  const supabaseUrl = requireEnvVar('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  const serviceClient = createServiceRoleClient(supabaseUrl, serviceRoleKey);

  const { data: subscription, error: subscriptionError } = await serviceClient
    .from('subscriptions')
    .select('id, status, payment_provider, provider_subscription_id')
    .eq('id', body.subscriptionId)
    .single();

  if (subscriptionError || !subscription) {
    return NextResponse.json({ error: 'המנוי לא נמצא.' }, { status: 404 });
  }
  if (subscription.payment_provider !== 'nedarim_plus' || !subscription.provider_subscription_id) {
    return NextResponse.json(
      { error: 'למנוי הזה אין הוראת קבע מזוהה מול נדרים פלוס לניהול.' },
      { status: 400 }
    );
  }

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
    return NextResponse.json({ error: 'פרטי ההתחברות לנדרים פלוס לא מוגדרים בהגדרות.' }, { status: 503 });
  }

  const nedarimAction = ACTION_TO_NEDARIM_ACTION[body.action];
  const form = new URLSearchParams({
    Action: nedarimAction,
    MosadId: mosadId,
    ApiPassword: apiPassword,
    KevaId: subscription.provider_subscription_id,
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

  const responseText = await nedarimResp.text();

  if (body.action === 'reactivate') {
    // EnableKevaNew: success is JSON {"NextDate": "..."}; errors come back
    // as plain, non-JSON text.
    let parsed: { NextDate?: string } | null = null;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // not JSON — treat as an error message below
    }
    if (!parsed?.NextDate) {
      return NextResponse.json({ error: responseText || 'נדרים פלוס דחו את הבקשה.' }, { status: 502 });
    }
  } else {
    // DisableKeva / DeleteKeva: success is the literal text "OK", anything
    // else is an error message.
    if (responseText.trim() !== 'OK') {
      return NextResponse.json({ error: responseText || 'נדרים פלוס דחו את הבקשה.' }, { status: 502 });
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.action === 'freeze') {
    updates.keva_frozen_at = new Date().toISOString();
  } else if (body.action === 'reactivate') {
    updates.keva_frozen_at = null;
  } else {
    updates.status = 'canceled';
    updates.keva_frozen_at = null;
  }

  const { error: updateError } = await serviceClient.from('subscriptions').update(updates).eq('id', subscription.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
