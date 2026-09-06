import type { UserProfile } from '@daily-learning/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '../i18n/strings';
import { fetchCompletedDatesForMonth, fetchLessonDatesForMonth } from '../services/lessons';
import { colors } from '../theme/colors';
import { getMonthMatrix, toDateOnlyString } from '../utils/date';

interface Props {
  profile: UserProfile;
}

type DayStatus = 'completed' | 'missed' | 'no_lesson' | 'pending';

export function CalendarScreen({ profile }: Props) {
  const router = useRouter();
  const todayStr = toDateOnlyString(new Date());

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [lessonDates, setLessonDates] = useState<Set<string>>(new Set());
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      const [lessonsResult, progressResult] = await Promise.all([
        fetchLessonDatesForMonth(cursor.year, cursor.month, profile.gender_track, profile.language),
        fetchCompletedDatesForMonth(cursor.year, cursor.month, profile.id),
      ]);
      if (!isMounted) return;

      if (lessonsResult.error || progressResult.error) {
        setError(lessonsResult.error ?? progressResult.error);
        setLoading(false);
        return;
      }

      setLessonDates(lessonsResult.dates);
      setCompletedDates(progressResult.dates);
      setLoading(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [cursor, profile.gender_track, profile.language, profile.id]);

  function getStatus(dateStr: string): DayStatus {
    if (completedDates.has(dateStr)) return 'completed';
    if (!lessonDates.has(dateStr)) return 'no_lesson';
    return dateStr < todayStr ? 'missed' : 'pending';
  }

  function goToMonth(delta: number) {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  const s = t(profile.language);
  const weekdayLabels = s.calendar.weekdayLabels;
  const monthLabel = s.calendar.monthLabels[cursor.month];
  const cells = getMonthMatrix(cursor.year, cursor.month);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => goToMonth(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>
          {monthLabel} {cursor.year}
        </Text>
        <Pressable onPress={() => goToMonth(1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View>
          <View style={styles.weekRow}>
            {weekdayLabels.map((label) => (
              <Text key={label} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>

          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((dateStr, dayIndex) => {
                if (!dateStr) {
                  return <View key={dayIndex} style={styles.dayCell} />;
                }

                const status = getStatus(dateStr);
                const isToday = dateStr === todayStr;
                const dayNumber = Number(dateStr.slice(-2));

                return (
                  <Pressable
                    key={dateStr}
                    style={[
                      styles.dayCell,
                      styles.dayCellFilled,
                      status === 'completed' && styles.dayCompleted,
                      status === 'missed' && styles.dayMissed,
                      isToday && styles.dayToday,
                    ]}
                    onPress={() => router.push({ pathname: '/', params: { date: dateStr } })}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        status === 'completed' && styles.dayNumberOnColor,
                        status === 'missed' && styles.dayNumberOnColor,
                      ]}
                    >
                      {dayNumber}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.legend}>
            <LegendItem color={colors.success} label={s.calendar.legendCompleted} />
            <LegendItem color={colors.danger} label={s.calendar.legendMissed} />
            <LegendItem color={colors.teal100} label={s.calendar.legendNoLesson} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navButtonText: {
    fontSize: 20,
    color: colors.teal600,
    fontWeight: '700',
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink900,
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
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekdayLabel: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    color: colors.slate300,
  },
  dayCell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  dayCellFilled: {
    backgroundColor: colors.teal100,
  },
  dayCompleted: {
    backgroundColor: colors.success,
  },
  dayMissed: {
    backgroundColor: colors.danger,
  },
  dayToday: {
    borderWidth: 2,
    borderColor: colors.teal400,
  },
  dayNumber: {
    fontSize: 14,
    color: colors.ink700,
  },
  dayNumberOnColor: {
    color: colors.paper50,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: colors.slate500,
  },
});
