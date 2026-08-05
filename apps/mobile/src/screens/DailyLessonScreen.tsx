import type { Lesson, LessonImage, UserProfile } from '@daily-learning/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RemoteImage } from '../components/RemoteImage';
import { StreakBadge } from '../components/StreakBadge';
import {
  completeLesson,
  fetchCompletionStatus,
  fetchLessonForDate,
  fetchLessonImages,
} from '../services/lessons';
import { fetchTodayDedicationsCount } from '../services/dedications';
import { colors } from '../theme/colors';
import { addDays, toDateOnlyString } from '../utils/date';
import { isRTL } from '../utils/rtl';

interface Props {
  profile: UserProfile;
  onSignOut: () => void;
  /** Date to open initially, e.g. when arriving from the calendar screen. Defaults to today. */
  initialDate?: string;
}

const ENCOURAGEMENT_MESSAGES = (streak: number | undefined): string[] => [
  'כל הכבוד! עוד יום של לימוד.',
  ...(streak ? [`רצף של ${streak} ימים — מדהים!`] : []),
  'המשכת היום, זה מה שבונה התמדה.',
];

// TODO: replace with real App Store / Play Store links once published.
const APP_SHARE_LINK = 'https://dailylearning.app';

const SHARE_MESSAGES: Record<UserProfile['language'], string> = {
  he: `הצטרפו אליי ללימוד היומי! 📖\n${APP_SHARE_LINK}`,
  en: `Join me for the daily lesson! 📖\n${APP_SHARE_LINK}`,
};

export function DailyLessonScreen({ profile, onSignOut, initialDate }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => initialDate ?? toDateOnlyString(new Date()));

  useEffect(() => {
    if (initialDate) setSelectedDate(initialDate);
  }, [initialDate]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [images, setImages] = useState<LessonImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);

  const [dedicationsCount, setDedicationsCount] = useState(0);

  const rtl = isRTL(profile.language);

  useEffect(() => {
    let isMounted = true;
    fetchTodayDedicationsCount().then(({ count }) => {
      if (isMounted) setDedicationsCount(count);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      setLesson(null);
      setImages([]);
      setCompleted(false);
      setEncouragement(null);

      const lessonResult = await fetchLessonForDate(selectedDate, profile.gender_track, profile.language);
      if (!isMounted) return;

      if (lessonResult.error) {
        setError(lessonResult.error);
        setLoading(false);
        return;
      }

      if (!lessonResult.lesson) {
        setLoading(false);
        return;
      }

      setLesson(lessonResult.lesson);

      const [imagesResult, completionResult] = await Promise.all([
        fetchLessonImages(lessonResult.lesson.id),
        fetchCompletionStatus(lessonResult.lesson.id, profile.id),
      ]);
      if (!isMounted) return;

      if (imagesResult.error) {
        setError(imagesResult.error);
        setLoading(false);
        return;
      }

      setImages(imagesResult.images);
      setCompleted(completionResult.completed);
      setLoading(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, profile.gender_track, profile.language, profile.id]);

  async function handleShare() {
    await Share.share({ message: SHARE_MESSAGES[profile.language] });
  }

  async function handleComplete() {
    if (!lesson || completed || completing) return;

    setCompleting(true);
    const { result, error: completeError } = await completeLesson(lesson.id);
    setCompleting(false);

    if (completeError) {
      setError(completeError);
      return;
    }

    setCompleted(true);

    if (result?.status === 'completed') {
      const messages = ENCOURAGEMENT_MESSAGES(result.currentStreak);
      setEncouragement(messages[Math.floor(Math.random() * messages.length)]);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navRow}>
        <Pressable
          style={styles.navButton}
          onPress={() => setSelectedDate((d) => addDays(d, -1))}
        >
          <Text style={styles.navButtonText}>{rtl ? '‹ אתמול' : '‹ Prev'}</Text>
        </Pressable>
        <Text style={styles.dateText}>{selectedDate}</Text>
        <Pressable
          style={styles.navButton}
          onPress={() => setSelectedDate((d) => addDays(d, 1))}
        >
          <Text style={styles.navButtonText}>{rtl ? 'מחר ›' : 'Next ›'}</Text>
        </Pressable>
      </View>

      <View style={styles.utilityRow}>
        <Pressable style={styles.utilityLink} onPress={() => router.push('/calendar')}>
          <Text style={styles.utilityLinkText}>לוח שנה</Text>
        </Pressable>
        <Pressable style={styles.utilityLink} onPress={handleShare}>
          <Text style={styles.utilityLinkText}>שיתוף</Text>
        </Pressable>
        <Pressable style={styles.utilityLink} onPress={() => router.push('/notification-settings')}>
          <Text style={styles.utilityLinkText}>תזכורות</Text>
        </Pressable>
      </View>

      <StreakBadge days={profile.current_streak} />

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !lesson ? (
        <View style={styles.centerFill}>
          <Text style={[styles.emptyText, rtl && styles.textRTL]}>
            לא קיים לימוד לתאריך זה.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.lessonContent}>
            {lesson.hebrew_date && (
              <Text style={[styles.hebrewDate, rtl && styles.textRTL]}>{lesson.hebrew_date}</Text>
            )}
            <Text style={[styles.title, rtl && styles.textRTL]}>{lesson.title}</Text>

            {images.map((image) => (
              <RemoteImage key={image.id} uri={image.image_url} style={styles.lessonImage} resizeMode="contain" />
            ))}
          </ScrollView>

          <View style={styles.completeSection}>
            {encouragement && (
              <Text style={[styles.encouragementText, rtl && styles.textRTL]}>{encouragement}</Text>
            )}
            <Pressable
              style={[styles.completeButton, completed && styles.completeButtonDone]}
              onPress={handleComplete}
              disabled={completed || completing}
            >
              {completing ? (
                <ActivityIndicator color={colors.onTeal} />
              ) : (
                <Text style={styles.completeButtonText}>
                  {completed ? 'הושלם' : 'סיימתי'}
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}

      <Pressable style={styles.dedicationsLink} onPress={() => router.push('/dedications/today')}>
        <Text style={[styles.dedicationsLinkText, rtl && styles.textRTL]}>
          {dedicationsCount > 0
            ? `היום מוקדש על ידי ${dedicationsCount} מקדישים`
            : 'הקדש/י את הלימוד היום'}
        </Text>
      </Pressable>

      <Pressable style={styles.signOutLink} onPress={onSignOut}>
        <Text style={styles.signOutText}>התנתק/י</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navButtonText: {
    color: colors.slate500,
    fontSize: 13,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12.5,
    color: colors.slate300,
  },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  utilityLink: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.teal100,
  },
  utilityLinkText: {
    color: colors.teal600,
    fontSize: 12,
    fontWeight: '600',
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.slate500,
    fontSize: 16,
    textAlign: 'center',
  },
  textRTL: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  lessonContent: {
    padding: 24,
    gap: 16,
  },
  hebrewDate: {
    fontSize: 13,
    color: colors.slate300,
    textAlign: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.ink900,
    textAlign: 'center',
    marginBottom: 8,
  },
  lessonImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: colors.teal100,
  },
  completeSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 10,
  },
  encouragementText: {
    textAlign: 'center',
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: colors.teal400,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  completeButtonDone: {
    backgroundColor: colors.teal900,
  },
  completeButtonText: {
    color: colors.onTeal,
    fontSize: 16,
    fontWeight: '700',
  },
  dedicationsLink: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  dedicationsLinkText: {
    color: colors.amber500,
    fontSize: 14,
    fontWeight: '600',
  },
  signOutLink: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  signOutText: {
    color: colors.slate300,
    fontSize: 12.5,
  },
});
