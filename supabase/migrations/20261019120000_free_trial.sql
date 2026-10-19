-- Free trial week: a new subscriber enters their card, nothing is charged
-- for `free_trial_days`, then the Nedarim Plus standing order (HK) starts
-- charging on its own (its first charge date is set via StartFrom — see
-- create-nedarim-payment). Once per user, ever.
--
-- During the trial the subscription row is a normal status='active' row
-- whose end_date is the trial's last day, so has_active_access() needs no
-- change; the first real charge (nedarim-callback's renewal path) extends
-- end_date by the plan period.

-- Rollout switch: 'off' | 'admins' (only role=admin sees the trial — for
-- testing against the real Nedarim account) | 'all'.
insert into settings (key, value) values
  ('free_trial_mode', 'off'),
  ('free_trial_days', '7')
on conflict (key) do nothing;

-- Set once when a user's trial standing order is created; never cleared,
-- so a trial can't be repeated by cancelling and re-subscribing. Written
-- only by service-role edge functions (authenticated users have no UPDATE
-- privilege on this column — see 20260713000017).
alter table profiles add column trial_used_at timestamptz;

-- Last day of the trial (null = subscription had no trial). Kept after the
-- first charge as history.
alter table subscriptions add column trial_ends_at date;

-- Set when the subscriber cancels from the app: the standing order is
-- deleted at Nedarim, access continues until end_date and then lapses.
alter table subscriptions add column canceled_at timestamptz;

-- Plan and trial length chosen at checkout, so settlement doesn't have to
-- infer the plan from the amount, and knows a callback is a trial setup
-- (no money moved) rather than a charge.
alter table payments add column plan_type text check (plan_type in ('monthly', 'yearly'));
alter table payments add column trial_days integer;

-- Whether the current user would get a free trial at checkout right now.
-- Used by the paywall to show "שבוע ראשון חינם"; create-nedarim-payment
-- re-checks the same rule server-side before actually deferring a charge.
create or replace function public.free_trial_eligible()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.trial_used_at is null
      and (
        (select value from settings where key = 'free_trial_mode') = 'all'
        or ((select value from settings where key = 'free_trial_mode') = 'admins' and p.role = 'admin')
      )
  );
$$;

grant execute on function public.free_trial_eligible() to authenticated;
