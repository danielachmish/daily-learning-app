import type { UserProfile } from '@daily-learning/shared';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cancelReminderNotification, scheduleReminderNotification } from '../services/localNotifications';
import { fetchNotificationSettings, saveNotificationSettings } from '../services/notifications';
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

function formatTimeDisplay(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function NotificationSettingsScreen({ profile }: Props) {
  const rtl = isRTL(profile.language);

  const [enabled, setEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<Date>(() => parseTimeString(null));
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setSaved(false);

    const reminderTimeString = formatTimeString(reminderTime);
    const { error: saveError } = await saveNotificationSettings(profile.id, {
      enabled,
      reminderTime: enabled ? reminderTimeString : null,
    });

    if (saveError) {
      setSaving(false);
      setError(saveError);
      return;
    }

    if (enabled) {
      const { error: scheduleError } = await scheduleReminderNotification(
        reminderTime.getHours(),
        reminderTime.getMinutes(),
        profile.language
      );
      if (scheduleError) {
        setSaving(false);
        setError(scheduleError);
        return;
      }
    } else {
      await cancelReminderNotification();
    }

    setSaving(false);
    setSaved(true);
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
          <Pressable style={styles.timeButton} onPress={() => setShowPicker(true)}>
            <Text style={styles.timeButtonText}>{formatTimeDisplay(reminderTime)}</Text>
          </Pressable>

          {showPicker && (
            <DateTimePicker
              value={reminderTime}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event, selectedDate) => {
                setShowPicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setReminderTime(selectedDate);
                  setSaved(false);
                }
              }}
            />
          )}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
      {saved && <Text style={styles.savedText}>ההגדרות נשמרו.</Text>}

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
  timeButton: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.teal400,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  timeButtonText: {
    fontSize: 18,
    color: colors.teal600,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  savedText: {
    color: colors.success,
    fontSize: 14,
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
