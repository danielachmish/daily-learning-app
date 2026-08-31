-- Tracks whether a Nedarim Plus credit-card standing order (Keva) has been
-- frozen (DisableKeva) from the admin panel. Freezing stops future charges
-- without cancelling the subscription outright (status stays whatever it
-- was — the current paid period still runs out normally), so this needs
-- its own column rather than overloading `status`, whose allowed values
-- don't include anything like "frozen".
alter table subscriptions add column keva_frozen_at timestamptz;
