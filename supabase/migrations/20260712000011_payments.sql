-- payments: general payment record for subscriptions and dedications (no card data)
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  payment_type text not null check (payment_type in ('subscription', 'dedication')),
  related_id uuid,
  amount numeric(10,2) not null,
  currency text not null default 'ILS',
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
  payment_provider text,
  provider_payment_id text,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_user_id_idx on payments(user_id);
create index payments_status_idx on payments(status);
create index payments_type_idx on payments(payment_type);
create index payments_created_at_idx on payments(created_at);
