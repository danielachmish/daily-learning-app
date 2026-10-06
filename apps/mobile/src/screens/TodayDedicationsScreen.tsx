import type { Dedication, UserProfile } from '@daily-learning/shared';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../i18n/strings';
import { fetchDedicationsForDate } from '../services/dedications';
import { colors } from '../theme/colors';
import { getDedicationTypeLabels } from '../utils/dedicationLabels';
import { isRTL } from '../utils/rtl';

interface Props {
  profile: UserProfile;
  /** "YYYY-MM-DD" — the date the lesson screen was showing when this was opened. */
  date: string;
}

export function TodayDedicationsScreen({ profile, date }: Props) {
  const rtl = isRTL(profile.language);
  const s = t(profile.language);
  const dedicationTypeLabels = getDedicationTypeLabels(profile.language);
  const [dedications, setDedications] = useState<Dedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    fetchDedicationsForDate(date).then((result) => {
      if (!isMounted) return;
      if (result.error) setError(result.error);
      setDedications(result.dedications);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [date]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, rtl && styles.textRTL]}>{s.recentDedications.title}</Text>
          {/* Rendered LTR regardless of interface language, so the date's digits don't reorder under RTL. */}
          <Text style={[styles.date, rtl && styles.dateRTL]}>{date}</Text>
        </View>
        <Link href="/dedications/new" style={styles.newLink}>
          <Text style={styles.newLinkText}>{s.recentDedications.newDedicationLink}</Text>
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
          <Text style={[styles.emptyText, rtl && styles.textRTL]}>{s.recentDedications.emptyText}</Text>
        </View>
      ) : (
        <FlatList
          data={dedications}
          keyExtractor={(dedication) => dedication.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: dedication }) => (
            <View style={styles.card}>
              <Text style={[styles.cardType, rtl && styles.textRTL]}>
                {dedicationTypeLabels[dedication.type]}
              </Text>
              <Text style={[styles.cardText, rtl && styles.textRTL]}>{dedication.dedication_text}</Text>
              <Text style={[styles.cardDonor, rtl && styles.textRTL]}>
                {dedication.donor_name ? s.recentDedications.donorPrefix(dedication.donor_name) : s.common.anonymous}
              </Text>
            </View>
          )}
        />
      )}

      <Link href="/dedications/my" style={styles.myLink}>
        <Text style={styles.myLinkText}>{s.myDedications.title}</Text>
      </Link>
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
  date: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal600,
    marginTop: 2,
  },
  dateRTL: {
    textAlign: 'right',
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
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper50,
    borderRadius: 16,
    padding: 12,
    gap: 4,
    marginBottom: 8,
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
  cardDonor: {
    fontSize: 12,
    color: colors.slate300,
    marginTop: 4,
  },
  myLink: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  myLinkText: {
    color: colors.teal600,
    fontSize: 14,
    fontWeight: '600',
  },
});
