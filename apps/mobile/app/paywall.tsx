import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '../src/components/GradientButton';
import { LogoLockup } from '../src/components/LogoLockup';
import { useAuth } from '../src/hooks/useAuth';
import { t } from '../src/i18n/strings';
import { startCheckout } from '../src/services/payments';
import { supabase } from '../src/services/supabase';
import { colors } from '../src/theme/colors';
import { notify } from '../src/utils/alerts';
import { isRTL } from '../src/utils/rtl';

export default function PaywallScreen() {
  const { session, profile, signOut } = useAuth();
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<string | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [checkingOutPlan, setCheckingOutPlan] = useState<'monthly' | 'yearly' | null>(null);

  const language = profile?.language ?? 'he';
  const rtl = isRTL(language);
  const s = t(language);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['monthly_price', 'yearly_price'])
      .then(({ data, error }) => {
        if (!isMounted) return;

        if (error) {
          setPriceError(error.message);
          setLoadingPrices(false);
          return;
        }

        for (const row of data) {
          if (row.key === 'monthly_price') setMonthlyPrice(row.value);
          if (row.key === 'yearly_price') setYearlyPrice(row.value);
        }
        setLoadingPrices(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubscribe(plan: 'monthly' | 'yearly') {
    setCheckingOutPlan(plan);
    const { error } = await startCheckout({ type: 'subscription', planType: plan });
    setCheckingOutPlan(null);

    if (error) {
      notify(s.paywall.checkoutErrorTitle, error, language);
      return;
    }

    notify(s.paywall.processingTitle, s.paywall.processingMessage, language);
  }

  // Placed after all hooks above, never before — signOut() really does
  // clear the session (this screen otherwise has no way to know to leave,
  // since Expo Router doesn't re-route away from whatever screen happens
  // to be mounted just because auth state changed elsewhere), but an early
  // return before a hook call is a Rules-of-Hooks violation: React would
  // call fewer hooks on this render than the last one and throw.
  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.logoBlock}>
        <LogoLockup width={160} />
      </View>
      {/* Generic wording on purpose — this screen is reached two ways now:
          redirected here with no access at all, or navigated here directly
          from the renewal-reminder banner while a yearly plan still has a
          few days left. "You have no active subscription" would be simply
          false in the second case. */}
      <Text style={[styles.title, rtl && styles.textRTL]}>{s.paywall.title}</Text>
      <Text style={[styles.subtitle, rtl && styles.textRTL]}>{s.paywall.subtitle}</Text>

      {loadingPrices ? (
        <ActivityIndicator style={styles.loader} />
      ) : priceError ? (
        <Text style={styles.errorText}>{s.paywall.pricesLoadError(priceError)}</Text>
      ) : (
        <View style={styles.plans}>
          <GradientButton
            style={styles.planButton}
            onPress={() => handleSubscribe('monthly')}
            disabled={checkingOutPlan !== null}
          >
            {checkingOutPlan === 'monthly' ? (
              <ActivityIndicator color={colors.onTeal} />
            ) : (
              <>
                <Text style={styles.planButtonTitle}>{s.paywall.monthlyPlanTitle}</Text>
                {monthlyPrice && (
                  <Text style={styles.planButtonPrice}>{s.paywall.monthlyPlanPrice(monthlyPrice)}</Text>
                )}
              </>
            )}
          </GradientButton>

          <GradientButton
            style={styles.planButton}
            onPress={() => handleSubscribe('yearly')}
            disabled={checkingOutPlan !== null}
          >
            {checkingOutPlan === 'yearly' ? (
              <ActivityIndicator color={colors.onTeal} />
            ) : (
              <>
                <Text style={styles.planButtonTitle}>{s.paywall.yearlyPlanTitle}</Text>
                {yearlyPrice && (
                  <Text style={styles.planButtonPrice}>{s.paywall.yearlyPlanPrice(yearlyPrice)}</Text>
                )}
              </>
            )}
          </GradientButton>
        </View>
      )}

      <Pressable style={styles.signOutLink} onPress={signOut}>
        <Text style={styles.signOutText}>{s.paywall.signOut}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  logoBlock: {
    marginBottom: -4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink900,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: 'center',
    marginBottom: 12,
  },
  textRTL: {
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  loader: {
    marginTop: 12,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
  },
  plans: {
    width: '100%',
    gap: 12,
  },
  planButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  planButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.onTeal,
  },
  planButtonPrice: {
    fontSize: 13,
    color: colors.onTeal,
    marginTop: 2,
  },
  signOutLink: {
    marginTop: 24,
  },
  signOutText: {
    color: colors.slate300,
    fontSize: 12.5,
  },
});
