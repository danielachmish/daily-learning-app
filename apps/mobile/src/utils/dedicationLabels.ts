import type { ApprovalStatus, DedicationType, PaymentStatus } from '@daily-learning/shared';

export const DEDICATION_TYPE_LABELS: Record<DedicationType, string> = {
  memory: 'לעילוי נשמת',
  healing: 'לרפואה',
  success: 'להצלחה',
  marriage: 'לזיווג',
  thanks: 'הודיה',
  other: 'אחר',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'ממתין לתשלום',
  paid: 'שולם',
  failed: 'נכשל',
  refunded: 'הוחזר',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'ממתין לאישור',
  approved: 'מאושר',
  rejected: 'נדחה',
  hidden: 'מוסתר',
};
