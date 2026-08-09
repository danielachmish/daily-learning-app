# Scheduling send-reminder-pushes

This function needs to run every minute so a reminder actually fires close
to the time each user picked. It isn't triggered by the app — it's wired up
via `pg_cron` + `pg_net` directly on the database, once per environment.

This is a **manual, one-time setup step per environment** (local + cloud),
run by hand — not a committed migration — because the command below embeds
`CRON_SECRET`, and migration files are committed to git.

## 1. Set the function's secrets

```bash
supabase secrets set VAPID_PUBLIC_KEY=<public key> --project-ref <ref>
supabase secrets set VAPID_PRIVATE_KEY=<private key> --project-ref <ref>
supabase secrets set VAPID_SUBJECT="mailto:<real support email once the org has one>" --project-ref <ref>
supabase secrets set CRON_SECRET=<a long random string, e.g. `openssl rand -hex 32`> --project-ref <ref>
```

`VAPID_PUBLIC_KEY` must be the exact same value as the mobile app's
`EXPO_PUBLIC_VAPID_PUBLIC_KEY` (they're the two halves of one key pair —
generate both together with `npx web-push generate-vapid-keys`).

## 2. Register the cron job

Run this once via the SQL editor (dashboard) or `psql`/`supabase db execute`
against the project, substituting the real project ref and the same
`CRON_SECRET` value set above:

```sql
select cron.schedule(
  'send-reminder-pushes-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/send-reminder-pushes',
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
To remove it: `select cron.unschedule('send-reminder-pushes-every-minute');`
