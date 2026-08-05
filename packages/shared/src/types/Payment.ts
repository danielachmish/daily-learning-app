import type { PaymentRecordType, PaymentStatus } from './enums';

/** Mirrors the `payments` table. `raw_event` is the provider's webhook payload. */
export interface Payment {
  id: string;
  user_id: string | null;
  payment_type: PaymentRecordType;
  related_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_provider: string | null;
  provider_payment_id: string | null;
  raw_event: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
