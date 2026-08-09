-- push_subscriptions: Web Push subscriptions for the browser/PWA build.
-- expo-notifications has no local-scheduling support on web (see
-- localNotifications.ts) — real daily reminders in the browser go through
-- Web Push instead, which needs the server to hold each browser's push
-- endpoint + keys and send to them on a schedule (see the
-- send-reminder-pushes edge function).
--
-- One-to-many by design: a user may install the PWA on more than one
-- device/browser, each getting its own subscription.
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

-- User manages only their own subscriptions; admin can read all (support/debugging).
create policy push_subscriptions_own on push_subscriptions
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
