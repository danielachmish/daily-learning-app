-- Lets an admin define arbitrary duration tiers for dedications (e.g. "יום
-- בודד" / "שבוע" / "חודש", each with its own price), instead of the single
-- fixed dedication_price setting. A dedication now covers a date RANGE
-- (dedication_date..end_date) rather than a single day.
create table dedication_duration_options (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  duration_days integer not null check (duration_days > 0),
  price numeric(10,2) not null check (price >= 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table dedication_duration_options enable row level security;

-- Any signed-in user needs to see the active options (with prices) to pick
-- one when creating a dedication; only admins manage the list itself.
create policy dedication_duration_options_select_active on dedication_duration_options
  for select using (active = true or public.is_admin());

create policy dedication_duration_options_admin_all on dedication_duration_options
  for all using (public.is_admin()) with check (public.is_admin());

-- A dedication now spans dedication_date..end_date (inclusive) instead of a
-- single day. Backfill existing rows to a 1-day range before requiring the
-- column, so this doesn't break on data already in the table.
alter table dedications add column end_date date;
update dedications set end_date = dedication_date where end_date is null;
alter table dedications alter column end_date set not null;

alter table dedications add column duration_option_id uuid references dedication_duration_options(id) on delete set null;

create index dedications_date_range_idx on dedications(dedication_date, end_date);

-- Closes a real price-tampering gap: dedications_insert_own only checked
-- that user_id matched the caller — nothing stopped a client from also
-- setting `amount` to whatever it wanted (e.g. 0.01) before this. Direct
-- INSERT is now revoked entirely; create_dedication() below is the only
-- path in, and it looks up the price itself server-side.
revoke insert on dedications from authenticated;

create or replace function public.create_dedication(
  p_dedication_date date,
  p_duration_option_id uuid,
  p_type text,
  p_dedication_text text,
  p_donor_name text
)
returns dedications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_option dedication_duration_options;
  v_row dedications;
begin
  select * into v_option from dedication_duration_options
  where id = p_duration_option_id and active = true;

  if not found then
    raise exception 'Invalid or inactive duration option';
  end if;

  insert into dedications (
    user_id, dedication_date, end_date, duration_option_id,
    type, dedication_text, donor_name, amount
  ) values (
    auth.uid(), p_dedication_date, p_dedication_date + (v_option.duration_days - 1), p_duration_option_id,
    p_type, p_dedication_text, nullif(p_donor_name, ''), v_option.price
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.create_dedication(date, uuid, text, text, text) from public, anon;
grant execute on function public.create_dedication(date, uuid, text, text, text) to authenticated;

-- Starter options matching the previous flat 36₪/day price, so dedications
-- keep working immediately after this migration — the admin can rename/
-- reprice/add to these from the panel at any time.
insert into dedication_duration_options (label, duration_days, price, sort_order) values
  ('יום בודד', 1, 36, 1),
  ('שבוע', 7, 180, 2),
  ('חודש', 30, 600, 3);
