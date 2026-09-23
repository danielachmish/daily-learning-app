import type { GenderTrack } from '@daily-learning/shared';
import { Redirect, router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoLockup } from '../src/components/LogoLockup';
import { useAuth } from '../src/hooks/useAuth';
import { t } from '../src/i18n/strings';
import { colors } from '../src/theme/colors';
import { isRTL } from '../src/utils/rtl';

/**
 * Gender-track picker, in two modes:
 *
 * - First entry (profile.track_confirmed = false): subscribers bulk-imported
 *   from the org's XLSX have no gender info, so they're created with a
 *   placeholder track and index.tsx redirects here before the first lesson
 *   is ever shown. No header/back — a choice is required to continue.
 * - Change (already confirmed): pushed from the daily lesson screen's
 *   "מסלול" link so anyone can switch tracks at any time.
 *
 * Either way the pick is written to the user's own profile (gender_track +
 * track_confirmed, both in the user's column grant), and every lesson
 * lookup/RLS check follows profile.gender_track from then on.
 */
export default function ChooseTrackScreen() {
  const { session, profile, loading, updateTrack } = useAuth();
  const [saving, setSaving] = useState<GenderTrack | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!session || !profile) {
    return <Redirect href="/" />;
  }

  const rtl = isRTL(profile.language);
  const s = t(profile.language).chooseTrack;
  const firstTime = !profile.track_confirmed;

  async function handleChoose(track: GenderTrack) {
    if (saving) return;
    setError(null);
    setSaving(track);
    const result = await updateTrack(track);
    setSaving(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (!firstTime && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  const options: { track: GenderTrack; label: string }[] = [
    { track: 'men', label: s.men },
    { track: 'women', label: s.women },
  ];

  return (
    <SafeAreaView style={styles.container} edges={firstTime ? ['top', 'bottom'] : ['bottom']}>
      <Stack.Screen options={{ headerShown: !firstTime }} />

      {firstTime && (
        <View style={styles.logoBlock}>
          <LogoLockup />
        </View>
      )}
      <Text style={[styles.title, rtl && styles.centerTextRTL]}>
        {firstTime ? s.firstTimeTitle : s.changeTitle}
      </Text>
      <Text style={[styles.subtitle, rtl && styles.centerTextRTL]}>
        {firstTime ? s.firstTimeSubtitle : s.changeSubtitle}
      </Text>

      {options.map(({ track, label }) => {
        // Only highlight the current track once it's actually been chosen —
        // for an imported subscriber it's just the import's placeholder.
        const isCurrent = !firstTime && profile.gender_track === track;
        return (
          <Pressable
            key={track}
            style={[styles.option, isCurrent && styles.optionCurrent]}
            onPress={() => handleChoose(track)}
            disabled={saving !== null}
          >
            {saving === track ? (
              <ActivityIndicator color={colors.teal600} />
            ) : (
              <>
                <Text style={[styles.optionText, isCurrent && styles.optionTextCurrent]}>{label}</Text>
                {isCurrent && <Text style={styles.currentBadge}>{s.current}</Text>}
              </>
            )}
          </Pressable>
        );
      })}

      {error && <Text style={[styles.errorText, rtl && styles.centerTextRTL]}>{error}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  centerFill: {
    flex: 1,
    backgroundColor: colors.paper0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.ink900,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: 'center',
    marginBottom: 12,
  },
  // Same idea as login: text meant to stay centered in both languages
  // only needs RTL character shaping, not right alignment.
  centerTextRTL: {
    writingDirection: 'rtl',
  },
  option: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper50,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 4,
  },
  optionCurrent: {
    borderColor: colors.teal600,
    borderWidth: 2,
    backgroundColor: colors.teal100,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink900,
  },
  optionTextCurrent: {
    color: colors.teal600,
  },
  currentBadge: {
    fontSize: 12,
    color: colors.teal600,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
});
