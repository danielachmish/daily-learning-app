import type { Dedication, UserProfile } from '@daily-learning/shared';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteDedication, fetchMyDedications } from '../services/dedications';
import { startCheckout } from '../services/payments';
import { colors } from '../theme/colors';
import { APPROVAL_STATUS_LABELS, DEDICATION_TYPE_LABELS, PAYMENT_STATUS_LABELS } from '../utils/dedicationLabels';
import { isRTL } from '../utils/rtl';

interface Props {
  profile: UserProfile;
}

export function MyDedicationsScreen({ profile }: Props) {
  const rtl = isRTL(profile.language);
  const [dedications, setDedications] = useState<Dedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchMyDedications(profile.id).then((result) => {
      if (!isMounted) return;
      if (result.error) setError(result.error);
      setDedications(result.dedications);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  async function handlePay(dedicationId: string) {
    setBusyId(dedicationId);
    const { error: payError } = await startCheckout({ type: 'dedication', dedicationId });
    setBusyId(null);
    if (payError) {
      Alert.alert('שגיאה', payError);
    }
  }

  function handleDelete(dedication: Dedication) {
    Alert.alert('מחיקת הקדשה', 'למחוק את ההקדשה הזו? לא ניתן לשחזר.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק/י',
        style: 'destructive',
        onPress: async () => {
          setBusyId(dedication.id);
          const { error: deleteError } = await deleteDedication(dedication.id);
          setBusyId(null);
          if (deleteError) {
            Alert.alert('שגיאה', deleteError);
            return;
          }
          setDedications((prev) => prev.filter((d) => d.id !== dedication.id));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, rtl && styles.textRTL]}>ההקדשות שלי</Text>
        <Link href="/dedications/new" style={styles.newLink}>
          <Text style={styles.newLinkText}>+ הקדשה חדשה</Text>
        </Link>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : dedications.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={[styles.emptyText, rtl && styles.textRTL]}>עדיין אין לך הקדשות.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {dedications.map((dedication) => {
            const published = dedication.payment_status === 'paid' && dedication.approval_status === 'approved';
            const pendingPayment = dedication.payment_status === 'pending';
            const busy = busyId === dedication.id;
            return (
              <View key={dedication.id} style={styles.card}>
                <Text style={[styles.cardDate, rtl && styles.textRTL]}>
                  {dedication.dedication_date === dedication.end_date
                    ? dedication.dedication_date
                    : `${dedication.dedication_date} – ${dedication.end_date}`}
                </Text>
                <Text style={[styles.cardType, rtl && styles.textRTL]}>
                  {DEDICATION_TYPE_LABELS[dedication.type]}
                </Text>
                <Text style={[styles.cardText, rtl && styles.textRTL]}>{dedication.dedication_text}</Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>{PAYMENT_STATUS_LABELS[dedication.payment_status]}</Text>
                  <Text style={styles.badge}>{APPROVAL_STATUS_LABELS[dedication.approval_status]}</Text>
                  {published && <Text style={[styles.badge, styles.badgePublished]}>פורסם</Text>}
                </View>

                {pendingPayment && (
                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.payButton}
                      onPress={() => handlePay(dedication.id)}
                      disabled={busy}
                    >
                      {busy ? (
                        <ActivityIndicator color={colors.onTeal} size="small" />
                      ) : (
                        <Text style={styles.payButtonText}>שלם/י עכשיו</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDelete(dedication)}
                      disabled={busy}
                    >
                      <Text style={styles.deleteButtonText}>מחק/י</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.ink900,
  },
  newLink: {
    backgroundColor: colors.teal100,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  newLinkText: {
    color: colors.teal600,
    fontSize: 13,
    fontWeight: '700',
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.slate500,
    fontSize: 15,
    textAlign: 'center',
  },
  textRTL: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper50,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  cardDate: {
    fontSize: 13,
    color: colors.slate300,
  },
  cardType: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink900,
  },
  cardText: {
    fontSize: 14,
    color: colors.ink700,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  badge: {
    fontSize: 11,
    color: colors.slate500,
    backgroundColor: colors.teal100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  badgePublished: {
    backgroundColor: colors.amber100,
    color: colors.amber500,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  payButton: {
    flex: 1,
    backgroundColor: colors.teal400,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
  },
  payButtonText: {
    color: colors.onTeal,
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});
