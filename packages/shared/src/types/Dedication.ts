import type { ApprovalStatus, DedicationType, PaymentStatus } from './enums';

/** Mirrors the `dedications` table. */
export interface Dedication {
  id: string;
  user_id: string | null;
  /** Start of the covered date range (inclusive). */
  dedication_date: string;
  /** End of the covered date range (inclusive) — equals dedication_date for a 1-day dedication. */
  end_date: string;
  duration_option_id: string | null;
  type: DedicationType;
  dedication_text: string;
  donor_name: string | null;
  amount: number;
  payment_status: PaymentStatus;
  approval_status: ApprovalStatus;
  payment_provider: string | null;
  provider_payment_id: string | null;
  created_at: string;
  approved_at: string | null;
}
