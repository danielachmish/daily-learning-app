-- daily_revenue_stats: precomputed daily revenue for dashboard/reports
create table daily_revenue_stats (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null unique,
  subscription_revenue numeric(10,2) not null default 0,
  dedication_revenue numeric(10,2) not null default 0,
  total_revenue numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
