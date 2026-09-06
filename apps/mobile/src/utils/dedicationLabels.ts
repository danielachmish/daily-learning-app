import type { ApprovalStatus, DedicationType, Language, PaymentStatus } from '@daily-learning/shared';

import { t } from '../i18n/strings';

export function getDedicationTypeLabels(language: Language): Record<DedicationType, string> {
  return t(language).dedicationTypes;
}

export function getPaymentStatusLabels(language: Language): Record<PaymentStatus, string> {
  return t(language).paymentStatus;
}

export function getApprovalStatusLabels(language: Language): Record<ApprovalStatus, string> {
  return t(language).approvalStatus;
}
