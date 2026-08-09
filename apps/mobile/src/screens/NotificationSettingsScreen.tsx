import type { UserProfile } from '@daily-learning/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TimeInput } from '../components/TimeInput';
import { cancelReminderNotification, scheduleReminderNotification } from '../services/localNotifications';
import { fetchNotificationSettings, saveNotificationSettings } from '../services/notifications';
import { subscribeToWebPush, unsubscribeFromWebPush } from '../services/webPush';
import { colors } from '../theme/colors';
import { isRTL } from '../utils/rtl';

interface Props {
  profile: UserProfile;
}

function parseTimeString(time: string | null): Date {
  const date = new Date();
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
  } else {
    date.setHours(8, 0, 0, 0);
  }
  return date;
}

function formatTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

export function NotificationSettingsScreen({ profile }: Props) {
  const rtl = isRTL(profile.language);

  const [enabled, setEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<Date>(() => parseTimeString(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchNotificationSettings(profile.id).then((result) => {
      if (!isMounted) return;
      if (result.error) setError(result.error);
      if (result.settings) {
        setEnabled(result.settings.enabled);
        setReminderTime(parseTimeString(result.settings.reminderTime));
      }
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [profile.id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);
    setSaved(false);

    // Wrapped defensively: this touches a native module (expo-notifications)
    // whose behavior varies by platform, so an unexpected throw here must
    // never leave the button spinning forever with no feedback.
    try {
      const reminderTimeString = formatTimeString(reminderTime);
      const { error: saveError } = await saveNotificationSettings(profile.id, {
        enabled,
        reminderTime: enabled ? reminderTimeString : null,
      });

      if (saveError) {
        setError(saveError);
        return;
      }

      // The preference itself is saved at this point regardless of whether
      // the platform can actually schedule a notification — surface that as
      // an informational notice rather than an error. Web has no local
      // scheduling API at all (see localNotifications.ts), so it goes
      // through a real Web Push subscription instead; native platforms keep
      // using expo-notifications' local scheduler as before.
      if (enabled) {
        if (Platform.OS === 'web') {
          const { error: pushError } = await subscribeToWebPush(profile.id);
          if (pushError) setNotice(pushError);
        } else {
          const { error: scheduleError } = await scheduleReminderNotification(
            reminderTime.getHours(),
            reminderTime.getMinutes(),
            profile.language
          );
          if (scheduleError) setNotice(scheduleError);
        }
      } else if (Platform.OS === 'web') {
        await unsubscribeFromWebPush();
      } else {
        await cancelReminderNotification();
      }

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'אירעה שגיאה בשמירת ההגדרות.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={[styles.title, rtl && styles.textRTL]}>תזכורת יומית</Text>

      <View style={styles.row}>
        <Text style={[styles.label, rtl && styles.textRTL]}>הפעלת תזכורת</Text>
        <Switch
          value={enabled}
          onValueChange={(value) => {
            setEnabled(value);
            setSaved(false);
          }}
        />
      </View>

      {enabled && (
        <View style={styles.timeSection}>
          <Text style={[styles.label, rtl && styles.textRTL]}>שעת תזכורת</Text>
          <TimeInput
            value={reminderTime}
            onChange={(date) => {
              setReminderTime(date);
              setSaved(false);
            }}
          />
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
      {saved && <Text style={styles.savedText}>ההגדרות נשמרו.</Text>}
      {notice && <Text style={styles.noticeText}>{notice}</Text>}

      <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.onTeal} /> : <Text style={styles.saveButtonText}>שמור</Text>}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
    padding: 24,
    gap: 16,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.ink900,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    color: colors.ink700,
  },
  textRTL: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  timeSection: {
    gap: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  savedText: {
    color: colors.success,
    fontSize: 14,
  },
  noticeText: {
    color: colors.ink700,
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: colors.teal400,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.onTeal,
    fontSize: 16,
    fontWeight: '700',
  },
});
