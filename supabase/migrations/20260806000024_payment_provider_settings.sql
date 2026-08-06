-- payment_provider_settings: admin-entered credentials for the payment
-- gateway (Nedarim Plus). Deliberately a SEPARATE table from `settings` —
-- `settings` is intentionally public-readable (prices shown pre-login on
-- the paywall), but credentials must never be exposed that way. RLS
-- restricts this table to admin only; the payment edge function reads it
-- via the service role key, which bypasses RLS entirely.
create table payment_provider_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table payment_provider_settings enable row level security;

create policy payment_provider_settings_admin_all on payment_provider_settings
  for all using (public.is_admin()) with check (public.is_admin());
