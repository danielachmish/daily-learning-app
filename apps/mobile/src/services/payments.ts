import type { PlanType } from '@daily-learning/shared';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

type CheckoutRequestBody =
  | { type: 'subscription'; planType: PlanType }
  | { type: 'dedication'; dedicationId: string };

interface CheckoutResponse {
  url?: string;
  error?: string;
}

/**
 * Calls the create-checkout-session Edge Function and opens the returned
 * Stripe Checkout URL. The app never sees card data or sets any payment
 * status itself — only the verified webhook does that, asynchronously.
 */
export async function startCheckout(body: CheckoutRequestBody): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke<CheckoutResponse>('create-checkout-session', {
    body,
  });

  if (error) {
    return { error: error.message };
  }
  if (!data?.url) {
    return { error: data?.error ?? 'לא התקבל קישור לתשלום.' };
  }

  await WebBrowser.openAuthSessionAsync(data.url, 'dailylearning://payment-complete');

  return { error: null };
}
