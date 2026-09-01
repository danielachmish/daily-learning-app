-- profiles.role was already excluded from the authenticated role's plain
-- UPDATE grant by the Phase-3 column privilege fix (20260713000017), same
-- as free_access/account_status — but unlike those two, no RPC was ever
-- added to let an admin actually change it. There was previously no way at
-- all, through the admin panel or otherwise, to promote a user to admin
-- without a manual one-off SQL statement. Follows the exact same
-- security-definer + is_admin() pattern as admin_set_free_access /
-- admin_set_account_status (20260725000022).
create or replace function public.admin_set_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change role';
  end if;

  if p_role not in ('user', 'admin') then
    raise exception 'Invalid role: %', p_role;
  end if;

  update profiles set role = p_role, updated_at = now() where id = p_user_id;
end;
$$;

revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
