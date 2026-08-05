-- dedications: paid dedications tied to a specific date, pending admin approval
create table dedications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  dedication_date date not null,
  type text not null check (type in ('memory', 'healing', 'success', 'marriage', 'thanks', 'other')),
  dedication_text text not null,
  donor_name text,
  amount numeric(10,2) not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'hidden')),
  payment_provider text,
  provider_payment_id text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index dedications_user_id_idx on dedications(user_id);
create index dedications_date_idx on dedications(dedication_date);
create index dedications_payment_status_idx on dedications(payment_status);
create index dedications_approval_status_idx on dedications(approval_status);
create index dedications_public_lookup_idx on dedications(dedication_date, payment_status, approval_status);
