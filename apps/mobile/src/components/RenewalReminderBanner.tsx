import type { Language } from '@daily-learning/shared';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { t } from '../i18n/strings';
import { colors } from '../theme/colors';

interface Props {
  daysLeft: number;
  rtl: boolean;
  language: Language;
}

/**
 * Shown on the daily lesson screen when the user's yearly subscription is
 * close to its end_date — yearly has no automatic renewal (see
 * create-nedarim-payment's comment on why), so this is the reliable
 * backstop for send-renewal-reminders' best-effort push notification:
 * this checks the same end_date live every time the app opens, regardless
 * of whether that push ever reached the user.
 */
export function RenewalReminderBanner({ daysLeft, rtl, language }: Props) {
  const router = useRouter();
  const s = t(language).renewalReminder;

  const message = daysLeft <= 1 ? s.endingTomorrow : s.endingInDays(daysLeft);

  return (
    <Pressable style={styles.banner} onPress={() => router.push('/paywall')}>
      <Text style={[styles.text, rtl && styles.textRTL]}>
        {message} <Text style={styles.link}>{s.renewNow}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.amber100,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  text: {
    fontSize: 13,
    color: colors.amber500,
    fontWeight: '600',
    textAlign: 'center',
  },
  textRTL: {
    writingDirection: 'rtl',
  },
  link: {
    textDecorationLine: 'underline',
  },
});
