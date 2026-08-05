import type { ApprovalStatus, DedicationType, PaymentStatus } from './enums';

/** Mirrors the `dedications` table. */
export interface Dedication {
  id: string;
  user_id: string | null;
  dedication_date: string;
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
