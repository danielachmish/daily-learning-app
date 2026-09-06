# Scheduling send-renewal-reminders

Reminds yearly subscribers before their subscription lapses — see this
function's own header comment for why (yearly has no automatic renewal;
Nedarim standing orders are monthly-only). Runs on a schedule via
`pg_cron` + `pg_net`, same mechanism as `send-reminder-pushes` — see that
function's own CRON.md for the one-time extension setup if it isn't
already enabled on this project.

This is a **manual, one-time setup step per environment**, run by hand —
not a committed migration — because the command below embeds
`CRON_SECRET`.

## 1. Reuse the existing CRON_SECRET

No new secret needed — this function checks the same `CRON_SECRET`
already set for `send-reminder-pushes` / `reconcile-nedarim-history`.

## 2. Register the cron job

Once a day is enough — the function only sends at three exact milestones
(14/7/1 days before end_date), so running it more often would just waste
calls. Run this once via the SQL editor (dashboard) or `psql`, substituting
the real project ref and the same `CRON_SECRET` value:

```sql
select cron.schedule(
  'send-renewal-reminders-daily',
  '0 9 * * *', -- 09:00 UTC daily (~11/12:00 Israel time)
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/send-renewal-reminders',
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
To remove it: `select cron.unschedule('send-renewal-reminders-daily');`

Push notifications are best-effort only (not every user has granted push
permission) — the reliable backstop is the in-app banner on the daily
lesson screen, which checks the same end_date live every time the app
opens regardless of whether this push ever reached the user.
