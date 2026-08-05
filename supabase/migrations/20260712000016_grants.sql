-- Newer Supabase versions no longer auto-expose newly created tables/functions
-- to the Data API roles (see config.toml: auto_expose_new_tables). RLS policies
-- alone are not enough — the roles also need the underlying table-level GRANT,
-- which RLS then restricts row-by-row. Without this, every request fails with
-- "permission denied for table X" regardless of how permissive the RLS policy is.
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

grant execute on all functions in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
