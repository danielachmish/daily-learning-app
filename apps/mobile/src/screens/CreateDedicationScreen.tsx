import type { DedicationDurationOption, DedicationType, UserProfile } from '@daily-learning/shared';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createDedication, fetchDurationOptions } from '../services/dedications';
import { startCheckout } from '../services/payments';
import { colors } from '../theme/colors';
import { addDays, toDateOnlyString } from '../utils/date';
import { DEDICATION_TYPE_LABELS } from '../utils/dedicationLabels';
import { isRTL } from '../utils/rtl';

interface Props {
  profile: UserProfile;
}

const DEDICATION_TYPES: DedicationType[] = ['memory', 'healing', 'success', 'marriage', 'thanks', 'other'];

export function CreateDedicationScreen({ profile }: Props) {
  const router = useRouter();
  const rtl = isRTL(profile.language);

  const [dedicationDate, setDedicationDate] = useState(() => toDateOnlyString(new Date()));
  const [type, setType] = useState<DedicationType>('memory');
  const [dedicationText, setDedicationText] = useState('');
  const [donorName, setDonorName] = useState('');

  const [options, setOptions] = useState<DedicationDurationOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdDedicationId, setCreatedDedicationId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchDurationOptions().then(({ options: fetchedOptions, error: optionsError }) => {
      if (!isMounted) return;
      if (optionsError) setError(optionsError);
      setOptions(fetchedOptions);
      setSelectedOptionId((prev) => prev ?? fetchedOptions[0]?.id ?? null);
      setOptionsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit() {
    setError(null);

    if (!dedicationText.trim()) {
      setError('נא להזין נוסח הקדשה.');
      return;
    }
    if (!selectedOptionId) {
      setError('נא לבחור למשך כמה זמן ההקדשה.');
      return;
    }

    setSubmitting(true);
    const { dedication, error: createError } = await createDedication({
      dedicationDate,
      durationOptionId: selectedOptionId,
      type,
      dedicationText: dedicationText.trim(),
      donorName: donorName.trim(),
    });
    setSubmitting(false);

    if (createError || !dedication) {
      setError(createError);
      return;
    }

    setCreatedDedicationId(dedication.id);
  }

  async function handlePayNow() {
    if (!createdDedicationId) return;

    setCheckingOut(true);
    setCheckoutError(null);
    const { error: payError } = await startCheckout({ type: 'dedication', dedicationId: createdDedicationId });
    setCheckingOut(false);

    if (payError) {
      setCheckoutError(payError);
    }
  }

  if (createdDedicationId) {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <Text style={[styles.successText, rtl && styles.textRTL]}>
          ההקדשה נשמרה! היא תופיע לאחר תשלום ואישור מנהל.
        </Text>

        {checkoutError && <Text style={styles.errorText}>{checkoutError}</Text>}

        <Pressable style={styles.submitButton} onPress={handlePayNow} disabled={checkingOut}>
          {checkingOut ? <ActivityIndicator color={colors.onTeal} /> : <Text style={styles.submitButtonText}>שלם/י עכשיו</Text>}
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => router.push('/dedications/my')}>
          <Text style={styles.linkButtonText}>ההקדשות שלי</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flexFill} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, rtl && styles.textRTL]}>הקדשת לימוד</Text>

      <Text style={[styles.label, rtl && styles.textRTL]}>תאריך ההקדשה</Text>
      <View style={styles.dateRow}>
        <Pressable style={styles.dateNavButton} onPress={() => setDedicationDate((d) => addDays(d, -1))}>
          <Text style={styles.dateNavButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.dateText}>{dedicationDate}</Text>
        <Pressable style={styles.dateNavButton} onPress={() => setDedicationDate((d) => addDays(d, 1))}>
          <Text style={styles.dateNavButtonText}>›</Text>
        </Pressable>
      </View>

      <Text style={[styles.label, rtl && styles.textRTL]}>למשך כמה זמן</Text>
      {optionsLoading ? (
        <Text style={[styles.priceText, rtl && styles.textRTL]}>טוען אפשרויות…</Text>
      ) : options.length === 0 ? (
        <Text style={[styles.errorText, rtl && styles.textRTL]}>אין כרגע אפשרויות הקדשה זמינות.</Text>
      ) : (
        <View style={styles.typeList}>
          {options.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.typeRow, selectedOptionId === option.id && styles.typeRowSelected]}
              onPress={() => setSelectedOptionId(option.id)}
            >
              <Text
                style={[styles.typeRowText, selectedOptionId === option.id && styles.typeRowTextSelected]}
              >
                {option.label} — ₪{option.price}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={[styles.label, rtl && styles.textRTL]}>סוג ההקדשה</Text>
      <View style={styles.typeList}>
        {DEDICATION_TYPES.map((t) => (
          <Pressable
            key={t}
            style={[styles.typeRow, type === t && styles.typeRowSelected]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.typeRowText, type === t && styles.typeRowTextSelected]}>
              {DEDICATION_TYPE_LABELS[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, rtl && styles.textRTL]}>נוסח ההקדשה</Text>
      <TextInput
        style={[styles.textArea, rtl && styles.textRTL]}
        value={dedicationText}
        onChangeText={setDedicationText}
        multiline
        numberOfLines={4}
        editable={!submitting}
      />

      <Text style={[styles.label, rtl && styles.textRTL]}>שם המקדיש (אופציונלי)</Text>
      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        value={donorName}
        onChangeText={setDonorName}
        editable={!submitting}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || optionsLoading || options.length === 0}
      >
        {submitting ? <ActivityIndicator color={colors.onTeal} /> : <Text style={styles.submitButtonText}>הקדש/י</Text>}
      </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexFill: {
    flex: 1,
  },
  container: {
    padding: 24,
    gap: 8,
    backgroundColor: colors.paper0,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: colors.paper0,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.ink900,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: colors.slate500,
    marginTop: 8,
  },
  textRTL: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dateNavButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dateNavButtonText: {
    fontSize: 20,
    color: colors.teal600,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 15,
    color: colors.ink700,
  },
  typeList: {
    gap: 6,
  },
  typeRow: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  typeRowSelected: {
    borderColor: colors.teal400,
    backgroundColor: colors.teal100,
  },
  typeRowText: {
    fontSize: 15,
    color: colors.ink700,
  },
  typeRowTextSelected: {
    color: colors.teal600,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper50,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: 'top',
    color: colors.ink900,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper50,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.ink900,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.amber500,
    marginTop: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: colors.teal400,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.onTeal,
    fontSize: 16,
    fontWeight: '700',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.success,
  },
  linkButton: {
    paddingVertical: 10,
  },
  linkButtonText: {
    color: colors.teal600,
    fontSize: 15,
    fontWeight: '600',
  },
});
