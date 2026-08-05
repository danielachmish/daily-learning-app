-- Stripe (and most providers) redeliver webhook events at least once, so the
-- webhook handler must be idempotent: this unique index lets it detect an
-- already-processed event (by provider_payment_id) and skip reapplying it,
-- preventing double-credited revenue/subscriptions on retry.
create unique index payments_provider_payment_id_unique_idx
  on payments (provider_payment_id)
  where provider_payment_id is not null;
