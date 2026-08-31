# Scheduling reconcile-nedarim-history

Safety net for the rare case a Nedarim Plus CallBack never arrives (their
docs: sent once, no automatic retry). Runs on a schedule via `pg_cron` +
`pg_net`, same mechanism as `send-reminder-pushes` — see that function's own
CRON.md for the one-time `pg_cron`/`pg_net` extension setup if it isn't
already enabled on this project.

This is a **manual, one-time setup step per environment**, run by hand — not
a committed migration — because the command below embeds `CRON_SECRET`.

## 1. Reuse the existing CRON_SECRET

No new secret needed — this function checks the same `CRON_SECRET` already
set for `send-reminder-pushes`. If it isn't set yet:

```bash
supabase secrets set CRON_SECRET=<a long random string, e.g. `openssl rand -hex 32`> --project-ref <ref>
```

## 2. Register the cron job

Every 30 minutes is frequent enough for a safety net without hammering
Nedarim's API. Run this once via the SQL editor (dashboard) or
`psql`/`supabase db execute`, substituting the real project ref and the same
`CRON_SECRET` value:

```sql
select cron.schedule(
  'reconcile-nedarim-history-every-30-min',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/reconcile-nedarim-history',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <CRON_SECRET value>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

To check it's registered: `select * from cron.job;`
To remove it: `select cron.unschedule('reconcile-nedarim-history-every-30-min');`

Nothing runs until Nedarim Plus credentials are actually saved in the admin
settings screen — until then the function just no-ops on each tick.
