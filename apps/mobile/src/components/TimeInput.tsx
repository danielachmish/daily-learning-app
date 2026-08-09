import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';

/**
 * Native (iOS/Android) time picker. See TimeInput.web.tsx for the web
 * counterpart — @react-native-community/datetimepicker ships no web
 * implementation at all (no .web.js override anywhere in the package), so
 * on web it silently renders null and just logs a console warning. Without
 * this split, tapping the time button on web did nothing visible, which
 * looked like the time was simply stuck at its default.
 */
interface Props {
  value: Date;
  onChange: (date: Date) => void;
}

function formatTimeDisplay(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function TimeInput({ value, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <Pressable style={styles.timeButton} onPress={() => setShowPicker(true)}>
        <Text style={styles.timeButtonText}>{formatTimeDisplay(value)}</Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={value}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event, selectedDate) => {
            setShowPicker(Platform.OS === 'ios');
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
});
