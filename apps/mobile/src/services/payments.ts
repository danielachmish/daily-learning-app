import type { PlanType } from '@daily-learning/shared';
import { router } from 'expo-router';

import { supabase } from './supabase';

type CheckoutRequestBody =
  | { type: 'subscription'; planType: PlanType }
  | { type: 'dedication'; dedicationId: string };

interface CreatePaymentResponse {
  iframeUrl?: string;
  nedarimTransactionId?: string;
  paymentId?: string;
  error?: string;
}

/**
 * Calls create-nedarim-payment and, on success, navigates to the payment
 * screen that embeds Nedarim Plus's secure iframe (see
 * app/payment.web.tsx). Kept as the single entry point every screen
 * already calls — its signature/return shape is unchanged from the old
 * Stripe-based version, so CreateDedicationScreen/MyDedicationsScreen/
 * paywall didn't need to change at all when the payment provider did.
 *
 * The edge function creates the transaction with Nedarim Plus server-side
 * (real, validated amount) and returns only an opaque transaction ID —
 * this app never holds the actual amount/payment fields, so there's
 * nothing here for a technical user to tamper with before it reaches the
 * iframe.
 */
export async function startCheckout(body: CheckoutRequestBody): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke<CreatePaymentResponse>('create-nedarim-payment', {
    body,
  });

  if (error) {
    return { error: error.message };
  }
  if (!data?.iframeUrl || !data?.nedarimTransactionId || !data?.paymentId) {
    return { error: data?.error ?? 'לא ניתן היה להתחיל את התשלום.' };
  }

  router.push({
    pathname: '/payment',
    params: {
      paymentId: data.paymentId,
      iframeUrl: data.iframeUrl,
      nedarimTransactionId: data.nedarimTransactionId,
    },
  });

  return { error: null };
}
