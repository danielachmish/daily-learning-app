-- profiles_insert_own's WITH CHECK only verifies id = auth.uid(), not which
-- columns are being set — combined with the blanket
-- `grant insert on all tables in schema public to authenticated` from
-- 20260712000016_grants.sql, this let a self-registering user set
-- free_access, role, account_status, or track_confirmed to anything they
-- wanted on their own very first insert (e.g. free_access: true, bypassing
-- payment entirely). Found during a security review, before adding any
-- self-service code redeemable at sign-up.
--
-- Mirrors the identical fix already applied to UPDATE in
-- 20260713000017_profiles_column_privileges.sql: scope INSERT to only the
-- columns a legitimate sign-up actually needs to write (see useAuth.tsx's
-- signUp()). Anything not listed here falls back to its column default
-- (free_access=false, role='user', account_status='active',
-- track_confirmed=true) regardless of what a crafted request sends.
revoke insert on profiles from authenticated;
grant insert (id, full_name, phone, email, gender_track, language) on profiles to authenticated;
