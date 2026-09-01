import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoLockup } from '../src/components/LogoLockup';
import { useAuth } from '../src/hooks/useAuth';
import { startCheckout } from '../src/services/payments';
import { supabase } from '../src/services/supabase';
import { colors } from '../src/theme/colors';
import { isRTL } from '../src/utils/rtl';

export default function PaywallScreen() {
  const { session, profile, signOut } = useAuth();

  // Without this, pressing "התנתק/י" below does sign the user out (their
  // session really is cleared), but this screen has no way to know it
  // should leave — Expo Router doesn't re-route away from whatever screen
  // happens to be mounted just because auth state changed elsewhere. It
  // just sits there looking exactly the same, which reads as "the button
  // doesn't work" even though it did.
  if (!session) {
    return <Redirect href="/login" />;
  }
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<string | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [checkingOutPlan, setCheckingOutPlan] = useState<'monthly' | 'yearly' | null>(null);

  const rtl = isRTL(profile?.language ?? 'he');

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
      Alert.alert('שגיאה', error);
      return;
    }

    Alert.alert(
      'התשלום בעיבוד',
      'אם התשלום הצליח, הגישה תיפתח בעוד רגע. אפשר לחזור למסך הראשי ולנסות שוב אם התוכן עדיין חסום.'
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.logoBlock}>
        <LogoLockup width={160} />
      </View>
      <Text style={[styles.title, rtl && styles.textRTL]}>אין לך מנוי פעיל</Text>
      <Text style={[styles.subtitle, rtl && styles.textRTL]}>
        כדי לצפות בלימוד היומי, יש לרכוש מנוי.
      </Text>

      {loadingPrices ? (
        <ActivityIndicator style={styles.loader} />
      ) : priceError ? (
        <Text style={styles.errorText}>שגיאה בטעינת המחירים: {priceError}</Text>
      ) : (
        <View style={styles.plans}>
          <Pressable
            style={styles.planButton}
            onPress={() => handleSubscribe('monthly')}
            disabled={checkingOutPlan !== null}
          >
            {checkingOutPlan === 'monthly' ? (
              <ActivityIndicator color={colors.teal600} />
            ) : (
              <>
                <Text style={styles.planButtonTitle}>מנוי חודשי</Text>
                {monthlyPrice && <Text style={styles.planButtonPrice}>₪{monthlyPrice} / חודש</Text>}
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.planButton}
            onPress={() => handleSubscribe('yearly')}
            disabled={checkingOutPlan !== null}
          >
            {checkingOutPlan === 'yearly' ? (
              <ActivityIndicator color={colors.teal600} />
            ) : (
              <>
                <Text style={styles.planButtonTitle}>מנוי שנתי</Text>
                {yearlyPrice && <Text style={styles.planButtonPrice}>₪{yearlyPrice} / שנה</Text>}
              </>
            )}
          </Pressable>
        </View>
      )}

      <Pressable style={styles.signOutLink} onPress={signOut}>
        <Text style={styles.signOutText}>התנתק/י</Text>
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
    borderWidth: 1.5,
    borderColor: colors.teal400,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  planButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.teal600,
  },
  planButtonPrice: {
    fontSize: 13,
    color: colors.teal600,
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
