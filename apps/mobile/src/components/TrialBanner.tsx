import type { Language } from '@daily-learning/shared';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { t } from '../i18n/strings';
import { cancelMySubscription } from '../services/subscriptions';
import { colors } from '../theme/colors';
import { confirmAsync, notify } from '../utils/alerts';

interface Props {
  /** Trial's last day = first charge date (yyyy-mm-dd). */
  endDate: string;
  canceled: boolean;
  onCanceled: () => void;
  rtl: boolean;
  language: Language;
}

/**
 * Shown on the daily lesson screen during the free trial: days left, the
 * first charge date, and a way to cancel before being charged (deletes the
 * standing order at Nedarim via cancel-my-subscription). After canceling,
 * access stays open until the trial's end.
 */
export function TrialBanner({ endDate, canceled, onCanceled, rtl, language }: Props) {
  const s = t(language).trialBanner;
  const [canceling, setCanceling] = useState(false);

  const displayDate = new Date(endDate).toLocaleDateString('he-IL');
  const daysLeft = Math.max(Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000), 0);

  async function handleCancel() {
    const confirmed = await confirmAsync(
      s.confirmTitle,
      s.confirmMessage(displayDate),
      { confirmLabel: s.confirmYes, cancelLabel: s.confirmNo, destructive: true },
      language
    );
    if (!confirmed) return;

    setCanceling(true);
    const { error } = await cancelMySubscription();
    setCanceling(false);
    if (error) {
      notify(s.cancelErrorTitle, error, language);
      return;
    }
    onCanceled();
  }

  if (canceled) {
    return (
      <View style={styles.banner}>
        <Text style={[styles.text, rtl && styles.textRTL]}>{s.canceled(displayDate)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <Text style={[styles.title, rtl && styles.textRTL]}>{daysLeft <= 0 ? s.lastDay : s.daysLeft(daysLeft)}</Text>
      <Text style={[styles.text, rtl && styles.textRTL]}>
        {s.firstChargeOn(displayDate)} ·{' '}
        {canceling ? (
          <ActivityIndicator size="small" color={colors.amber500} />
        ) : (
          <Text style={styles.link} onPress={handleCancel}>
            {s.cancel}
          </Text>
        )}
      </Text>
    </View>
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
    gap: 2,
  },
  title: {
    fontSize: 14,
    color: colors.amber500,
    fontWeight: '800',
    textAlign: 'center',
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
