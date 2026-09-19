-- admin_activity_log: durable record of admin-panel mutations (create/
-- update/delete/upload/etc), success and failure alike. Built directly in
-- response to a real incident: a batch lesson import silently dropped one
-- day's image mid-run, and the only place the actual failure reason was
-- ever shown was a transient on-screen message in that one browser tab --
-- gone the moment the page changed, with no way to investigate after the
-- fact except comparing the database by hand. Every admin mutation now
-- writes one row here on both success and failure, so a partial failure
-- always leaves a queryable trace.
create table admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text,
  entity_id text,
  status text not null check (status in ('success', 'error')),
  message text,
  metadata jsonb
);

create index admin_activity_log_created_at_idx on admin_activity_log(created_at desc);
create index admin_activity_log_status_idx on admin_activity_log(status);
create index admin_activity_log_action_idx on admin_activity_log(action);

alter table admin_activity_log enable row level security;

-- Admin-only, same pattern as every other admin-facing table (see
-- lesson_images_admin_all etc in 20260712000014_rls_policies.sql).
create policy admin_activity_log_admin_all on admin_activity_log
  for all using (public.is_admin()) with check (public.is_admin());
