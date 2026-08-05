export type GenderTrack = 'men' | 'women';

export type Language = 'he' | 'en';

export type Role = 'user' | 'admin';

export type AccountStatus = 'active' | 'blocked';

export type LessonStatus = 'draft' | 'published';

export type SubscriptionStatus = 'active' | 'expired' | 'canceled' | 'payment_failed';

export type PlanType = 'monthly' | 'yearly';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export type DedicationType = 'memory' | 'healing' | 'success' | 'marriage' | 'thanks' | 'other';

/** payments.payment_type — what the payment record is for (distinct from PaymentStatus). */
export type PaymentRecordType = 'subscription' | 'dedication';
