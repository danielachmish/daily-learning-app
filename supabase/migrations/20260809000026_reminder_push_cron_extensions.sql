-- Extensions needed to schedule send-reminder-pushes on a cron. The actual
-- cron.schedule(...) call is NOT in a migration file on purpose — it needs
-- to carry an auth secret (CRON_SECRET) as a request header, and migration
-- files are committed to git, so that registration is run once by hand
-- directly against each environment instead (see
-- supabase/functions/send-reminder-pushes/CRON.md).
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
