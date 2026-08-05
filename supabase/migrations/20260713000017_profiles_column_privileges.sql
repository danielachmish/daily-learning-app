-- The profiles RLS UPDATE policy checks id = auth.uid(), but a USING clause
-- alone does not restrict which columns change — as written, any user could
-- update their own free_access, role, account_status, or streak counters.
-- Scope the authenticated role's UPDATE privilege to only the fields a user
-- may edit themselves (Product Spec §13: "שינוי שפה", "שינוי מסלול", plus
-- basic contact info). free_access/role/account_status/streaks must only
-- ever change via admin action or server-side functions.
revoke update on profiles from authenticated;
grant update (full_name, phone, gender_track, language) on profiles to authenticated;

-- Defense in depth: unauthenticated (anon) requests have no legitimate reason
-- to touch business tables directly — auth.signUp() itself is handled by
-- GoTrue, not by anon-role writes to `profiles`. Keep the public dedications
-- lookup (payment_status=paid AND approval_status=approved) and public
-- settings readable, since their RLS policies intentionally allow that
-- without requiring auth.uid().
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

grant usage on schema public to anon;
grant select on dedications, settings to anon;
