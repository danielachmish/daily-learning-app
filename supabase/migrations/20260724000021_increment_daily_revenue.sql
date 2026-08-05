-- Atomic increment for daily_revenue_stats — a plain upsert via the JS client
-- can't express "add to the existing value" (it can only overwrite), which
-- would lose concurrent webhook events for the same day. security definer so
-- only trusted server-side code (the payment webhook, via service_role) can
-- call it — never exposed to authenticated/anon.
create or replace function public.increment_daily_revenue(
  p_date date,
  p_subscription_amount numeric,
  p_dedication_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into daily_revenue_stats (stat_date, subscription_revenue, dedication_revenue, total_revenue)
  values (p_date, p_subscription_amount, p_dedication_amount, p_subscription_amount + p_dedication_amount)
  on conflict (stat_date) do update set
    subscription_revenue = daily_revenue_stats.subscription_revenue + excluded.subscription_revenue,
    dedication_revenue = daily_revenue_stats.dedication_revenue + excluded.dedication_revenue,
    total_revenue = daily_revenue_stats.total_revenue + excluded.total_revenue,
    updated_at = now();
end;
$$;

revoke execute on function public.increment_daily_revenue(date, numeric, numeric) from public, anon, authenticated;
grant execute on function public.increment_daily_revenue(date, numeric, numeric) to service_role;
