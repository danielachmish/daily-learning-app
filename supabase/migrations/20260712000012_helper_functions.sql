-- is_admin: true if the current auth user has role='admin'
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- has_active_access: true if the given user is active and has free_access
-- or a currently-active subscription
create or replace function public.has_active_access(user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = user_uuid
    and p.account_status = 'active'
    and (
      p.free_access = true
      or exists (
        select 1 from subscriptions s
        where s.user_id = user_uuid
        and s.status = 'active'
        and s.end_date >= current_date
      )
    )
  );
$$;
