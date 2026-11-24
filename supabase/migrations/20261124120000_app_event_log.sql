-- app_event_log: what happens to *users* (not admins) — login/registration
-- failures, app crashes, failed payments, server-side (edge function)
-- errors. admin_activity_log only covers admin-panel mutations, so until
-- now a user reporting "I can't log in" left no trace anywhere to look at.
--
-- Written two ways:
--   * from the app (anon or logged-in) only through log_app_event() below —
--     there is deliberately no INSERT policy, so the table can't be written
--     to directly with arbitrary values/sizes;
--   * from edge functions with the service role (bypasses RLS), source='server'.
-- Read/delete: admins only.
create table app_event_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('app', 'server', 'admin')),
  level text not null check (level in ('info', 'warning', 'error')),
  event text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  message text,
  context jsonb
);

create index app_event_log_created_at_idx on app_event_log(created_at desc);
create index app_event_log_level_created_idx on app_event_log(level, created_at desc);
create index app_event_log_event_idx on app_event_log(event);
create index app_event_log_user_email_idx on app_event_log(lower(user_email));
create index app_event_log_user_id_idx on app_event_log(user_id);

alter table app_event_log enable row level security;

create policy app_event_log_admin_select on app_event_log
  for select using (public.is_admin());

create policy app_event_log_admin_delete on app_event_log
  for delete using (public.is_admin());

-- Client-side entry point. Callable by anon too, because the most important
-- events to capture (failed login, failed registration) happen before there
-- is a session. Everything is validated/truncated here so a client can't
-- write oversized or malformed rows, and there is a light per-user /
-- per-email rate limit so a looping client can't flood the table.
create or replace function public.log_app_event(
  p_level text,
  p_event text,
  p_message text default null,
  p_context jsonb default null,
  p_email text default null,
  p_source text default 'app'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_context jsonb := p_context;
  v_recent int;
begin
  if p_level not in ('info', 'warning', 'error') then
    return;
  end if;
  if p_source not in ('app', 'admin') then
    return;
  end if;
  if p_event is null or p_event !~ '^[a-z0-9_.]{1,64}$' then
    return;
  end if;

  if v_uid is not null then
    select email into v_email from auth.users where id = v_uid;
  end if;
  v_email := coalesce(v_email, nullif(left(lower(trim(p_email)), 254), ''));

  -- Rate limit: 40 events/minute per user (or per email when anonymous),
  -- 300/minute total for fully anonymous events with no email at all.
  if v_uid is not null then
    select count(*) into v_recent from app_event_log
      where user_id = v_uid and created_at > now() - interval '1 minute';
    if v_recent >= 40 then return; end if;
  elsif v_email is not null then
    select count(*) into v_recent from app_event_log
      where lower(user_email) = v_email and created_at > now() - interval '1 minute';
    if v_recent >= 40 then return; end if;
  else
    select count(*) into v_recent from app_event_log
      where user_id is null and user_email is null and created_at > now() - interval '1 minute';
    if v_recent >= 300 then return; end if;
  end if;

  if v_context is not null and (jsonb_typeof(v_context) <> 'object' or pg_column_size(v_context) > 16000) then
    v_context := jsonb_build_object('truncated', true, 'preview', left(v_context::text, 4000));
  end if;

  insert into app_event_log (source, level, event, user_id, user_email, message, context)
  values (p_source, p_level, p_event, v_uid, v_email, left(p_message, 4000), v_context);
end;
$$;

revoke all on function public.log_app_event(text, text, text, jsonb, text, text) from public;
grant execute on function public.log_app_event(text, text, text, jsonb, text, text) to anon, authenticated;

-- Default privileges (20260712000016_grants.sql) hand anon/authenticated
-- full table rights; RLS already blocks writes, but narrow the grant too so
-- the only client write path is log_app_event().
revoke insert, update on app_event_log from anon, authenticated;
revoke select, delete on app_event_log from anon;
grant select, delete on app_event_log to authenticated;
grant all on app_event_log to service_role;

-- Retention: keep 90 days. pg_cron is already enabled
-- (20260809000026_reminder_push_cron_extensions.sql); this job carries no
-- secret, so unlike the reminder cron it's safe to register here.
select cron.schedule(
  'purge-app-event-log',
  '17 3 * * *',
  $$delete from public.app_event_log where created_at < now() - interval '90 days'$$
);
