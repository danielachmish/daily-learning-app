-- Lets an admin add a dedication that wasn't paid for through the app
-- (e.g. a request taken by phone, or a gift from the org). Direct INSERT on
-- dedications is revoked for everyone (see 20260902090000), so this is the
-- only admin path in — same security-definer + is_admin() pattern as
-- admin_set_role / admin_set_free_access.
--
-- Stored as a normal paid+approved row with amount 0 and
-- payment_provider = 'admin_free', so the app shows it like any other
-- dedication while reports can still tell it apart from real revenue.
-- No per-date limit, matching create_dedication().
create or replace function public.admin_create_free_dedication(
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
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
  v_row dedications;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create free dedications';
  end if;

  if p_end_date < p_start_date then
    raise exception 'End date cannot be before start date';
  end if;

  if btrim(coalesce(p_dedication_text, '')) = '' then
    raise exception 'Dedication text is required';
  end if;

  insert into dedications (
    user_id, dedication_date, end_date, type, dedication_text, donor_name,
    amount, payment_status, approval_status, payment_provider, approved_at
  ) values (
    p_user_id, p_start_date, p_end_date, p_type, btrim(p_dedication_text), nullif(btrim(coalesce(p_donor_name, '')), ''),
    0, 'paid', 'approved', 'admin_free', now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.admin_create_free_dedication(uuid, date, date, text, text, text) from public, anon;
grant execute on function public.admin_create_free_dedication(uuid, date, date, text, text, text) to authenticated;
