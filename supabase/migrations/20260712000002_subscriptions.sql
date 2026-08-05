-- subscriptions: user subscription history/state
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_type text not null check (plan_type in ('monthly', 'yearly')),
  status text not null check (status in ('active', 'expired', 'canceled', 'payment_failed')),
  start_date date not null,
  end_date date not null,
  payment_provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on subscriptions(user_id);
create index subscriptions_status_idx on subscriptions(status);
create index subscriptions_end_date_idx on subscriptions(end_date);
create index subscriptions_user_status_idx on subscriptions(user_id, status);
