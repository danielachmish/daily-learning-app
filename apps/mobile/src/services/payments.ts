import type { PlanType } from '@daily-learning/shared';
import { router } from 'expo-router';

import { supabase } from './supabase';

type CheckoutRequestBody =
  | { type: 'subscription'; planType: PlanType }
  | { type: 'dedication'; dedicationId: string };

/** The `Value` object posted to Nedarim's iframe via postMessage — see app/payment.web.tsx. */
export interface NedarimTransactionValue {
  Mosad: string;
  ApiValid: string;
  PaymentType: 'HK' | 'Ragil';
  Currency: string;
  Amount: number;
  Tashlumim: string;
  Day?: number;
  Zeout: string;
  FirstName: string;
  LastName: string;
  Street: string;
  City: string;
  Phone: string;
  Mail: string;
  Groupe: string;
  Comment: string;
  CallBack: string;
  Param2: string;
}

interface CreatePaymentResponse {
  iframeUrl?: string;
  value?: NedarimTransactionValue;
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
  if (!data?.iframeUrl || !data?.value || !data?.paymentId) {
    return { error: data?.error ?? 'לא ניתן היה להתחיל את התשלום.' };
  }

  router.push({
    pathname: '/payment',
    params: {
      paymentId: data.paymentId,
      iframeUrl: data.iframeUrl,
      value: JSON.stringify(data.value),
    },
  });

  return { error: null };
}
