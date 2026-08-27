import type { PlanType } from '@daily-learning/shared';
import { router } from 'expo-router';

import { supabase } from './supabase';

type CheckoutRequestBody =
  | { type: 'subscription'; planType: PlanType }
  | { type: 'dedication'; dedicationId: string };

export interface NedarimIframeParams {
  Mosad: string;
  ApiValid: string;
  PaymentType: 'HK' | 'Ragil';
  Amount: number;
  Tashlumim: string;
  Day?: number;
  CallBack: string;
  Param2: string;
  FirstName: string;
  Phone: string;
  Mail: string;
}

interface CreatePaymentResponse {
  iframeUrl?: string;
  params?: NedarimIframeParams;
  paymentId?: string;
  error?: string;
}

/**
 * Calls create-nedarim-payment and, on success, navigates to the payment
 * screen that actually embeds Nedarim Plus's secure iframe (see
 * app/payment.web.tsx). Kept as the single entry point every screen
 * already calls — its signature/return shape is unchanged from the old
 * Stripe-based version, so CreateDedicationScreen/MyDedicationsScreen/
 * paywall didn't need to change at all when the payment provider did.
 */
export async function startCheckout(body: CheckoutRequestBody): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke<CreatePaymentResponse>('create-nedarim-payment', {
    body,
  });

  if (error) {
    return { error: error.message };
  }
  if (!data?.iframeUrl || !data?.params || !data?.paymentId) {
    return { error: data?.error ?? 'לא ניתן היה להתחיל את התשלום.' };
  }

  router.push({
    pathname: '/payment',
    params: {
      paymentId: data.paymentId,
      iframeUrl: data.iframeUrl,
      params: JSON.stringify(data.params),
    },
  });

  return { error: null };
}
