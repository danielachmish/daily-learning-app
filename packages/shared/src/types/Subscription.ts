import type { PlanType, SubscriptionStatus } from './enums';

/** Mirrors the `subscriptions` table. */
export interface Subscription {
  id: string;
  user_id: string;
  plan_type: PlanType;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  payment_provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  /** Set when an admin freezes the Nedarim Plus standing order (DisableKeva); cleared on reactivate. */
  keva_frozen_at: string | null;
  created_at: string;
  updated_at: string;
}
