-- settings: simple key/value app configuration (prices, feature flags)
create table settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
