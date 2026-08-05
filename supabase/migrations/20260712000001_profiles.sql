-- profiles: user profile, linked 1:1 to auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  gender_track text not null check (gender_track in ('men', 'women')),
  language text not null default 'he' check (language in ('he', 'en')),
  account_status text not null default 'active' check (account_status in ('active', 'blocked')),
  free_access boolean not null default false,
  current_streak int not null default 0,
  best_streak int not null default 0,
  total_completed_days int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index profiles_role_idx on profiles(role);
create index profiles_email_idx on profiles(email);
create index profiles_phone_idx on profiles(phone);
create index profiles_gender_language_idx on profiles(gender_track, language);
create index profiles_account_status_idx on profiles(account_status);
