-- The Phase-3 column privilege fix (20260713000017) scopes the authenticated
-- role's UPDATE on profiles to full_name/phone/gender_track/language only —
-- correctly blocking a user from self-granting free_access, but that GRANT
-- restriction applies to the whole role, including admins. These two RPCs
-- give admins a safe, audited path to the columns the column grant excludes,
-- without reopening them to regular users.
create or replace function public.admin_set_free_access(p_user_id uuid, p_free_access boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change free_access';
  end if;

  update profiles set free_access = p_free_access, updated_at = now() where id = p_user_id;
end;
$$;

create or replace function public.admin_set_account_status(p_user_id uuid, p_account_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change account_status';
  end if;

  if p_account_status not in ('active', 'blocked') then
    raise exception 'Invalid account_status: %', p_account_status;
  end if;

  update profiles set account_status = p_account_status, updated_at = now() where id = p_user_id;
end;
$$;

revoke execute on function public.admin_set_free_access(uuid, boolean) from public, anon;
revoke execute on function public.admin_set_account_status(uuid, text) from public, anon;
grant execute on function public.admin_set_free_access(uuid, boolean) to authenticated;
grant execute on function public.admin_set_account_status(uuid, text) to authenticated;
