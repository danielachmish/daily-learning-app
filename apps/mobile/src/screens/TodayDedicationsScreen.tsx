import type { Dedication, UserProfile } from '@daily-learning/shared';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchRecentDedications } from '../services/dedications';
import { colors } from '../theme/colors';
import { DEDICATION_TYPE_LABELS } from '../utils/dedicationLabels';
import { isRTL } from '../utils/rtl';

interface Props {
  profile: UserProfile;
}

interface DateSection {
  title: string;
  data: Dedication[];
}

/**
 * Groups dedications by the date/date-range they cover, so a busy day with
 * several dedications shows one date header instead of repeating the same
 * date on every card — dedications is already ordered newest-covered-date
 * first, and Map preserves insertion order, so the sections come out in the
 * same order with no extra sort needed.
 */
function groupByDate(dedications: Dedication[]): DateSection[] {
  const groups = new Map<string, Dedication[]>();
  for (const dedication of dedications) {
    const key =
      dedication.dedication_date === dedication.end_date
        ? dedication.dedication_date
        : `${dedication.dedication_date} – ${dedication.end_date}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(dedication);
    } else {
      groups.set(key, [dedication]);
    }
  }
  return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
}

export function TodayDedicationsScreen({ profile }: Props) {
  const rtl = isRTL(profile.language);
  const [dedications, setDedications] = useState<Dedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchRecentDedications().then((result) => {
      if (!isMounted) return;
      if (result.error) setError(result.error);
      setDedications(result.dedications);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const sections = useMemo(() => groupByDate(dedications), [dedications]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, rtl && styles.textRTL]}>הקדשות אחרונות</Text>
        <Link href="/dedications/new" style={styles.newLink}>
          <Text style={styles.newLinkText}>+ הקדש/י</Text>
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
          <Text style={[styles.emptyText, rtl && styles.textRTL]}>עדיין אין הקדשות מאושרות.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(dedication) => dedication.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            // Rendered LTR regardless of interface language — same bidi fix as
            // MyDedicationsScreen, otherwise a range like "2026-09-02 – 2026-10-01"
            // visually reverses under RTL.
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item: dedication }) => (
            <View style={styles.card}>
              <Text style={[styles.cardType, rtl && styles.textRTL]}>
                {DEDICATION_TYPE_LABELS[dedication.type]}
              </Text>
              <Text style={[styles.cardText, rtl && styles.textRTL]}>{dedication.dedication_text}</Text>
              <Text style={[styles.cardDonor, rtl && styles.textRTL]}>
                {dedication.donor_name ? `מאת: ${dedication.donor_name}` : 'אנונימי'}
              </Text>
            </View>
          )}
        />
      )}

      <Link href="/dedications/my" style={styles.myLink}>
        <Text style={styles.myLinkText}>ההקדשות שלי</Text>
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal600,
    marginTop: 12,
    marginBottom: 6,
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
