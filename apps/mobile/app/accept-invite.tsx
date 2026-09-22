import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '../src/components/GradientButton';
import { LogoLockup } from '../src/components/LogoLockup';
import { t } from '../src/i18n/strings';
import { supabase } from '../src/services/supabase';
import { colors } from '../src/theme/colors';
import { getDeviceLanguage, isRTL } from '../src/utils/rtl';

type Phase = 'verifying' | 'ready' | 'saving' | 'done' | 'invalid';

/**
 * Where a bulk-invited subscriber (see the admin panel's "ייבוא מנויים
 * מקובץ") lands after clicking the invite link in their email. Supabase's
 * inviteUserByEmail() sends a link carrying an access/refresh token pair
 * in the URL hash (PKCE isn't supported for invites — see their own docs
 * — so it's the older implicit-style hash, not a query string). The app's
 * Supabase client is created with detectSessionInUrl: false (see
 * services/supabase.ts), so nothing establishes that session
 * automatically — this screen does it by hand, then lets the person set
 * the password they'll actually log in with from now on.
 */
export default function AcceptInviteScreen() {
  const router = useRouter();
  const language = getDeviceLanguage();
  const rtl = isRTL(language);
  const s = t(language).acceptInvite;

  const [phase, setPhase] = useState<Phase>('verifying');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function establishSession() {
      if (Platform.OS !== 'web' || typeof window === 'undefined') {
        setPhase('invalid');
        return;
      }

      const rawHash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(rawHash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) {
        setPhase('invalid');
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setPhase('invalid');
        return;
      }

      // The tokens are sensitive and no longer needed once the session is
      // established — drop them from the visible/sharable URL.
      window.history.replaceState(null, '', window.location.pathname);
      setPhase('ready');
    }

    establishSession();
  }, []);

  async function handleSubmit() {
    setError(null);

    if (password.length < 6) {
      setError(s.tooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(s.mismatch);
      return;
    }

    setPhase('saving');
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setPhase('ready');
      return;
    }

    setPhase('done');
    setTimeout(() => router.replace('/'), 1500);
  }

  if (phase === 'verifying') {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" />
        <Text style={[styles.message, rtl && styles.centerTextRTL]}>{s.verifying}</Text>
      </SafeAreaView>
    );
  }

  if (phase === 'invalid') {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <Text style={[styles.title, rtl && styles.centerTextRTL]}>{s.invalidTitle}</Text>
        <Text style={[styles.message, rtl && styles.centerTextRTL]}>{s.invalidMessage}</Text>
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <Text style={[styles.message, rtl && styles.centerTextRTL]}>{s.successMessage}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.logoBlock}>
        <LogoLockup />
      </View>
      <Text style={[styles.title, rtl && styles.centerTextRTL]}>{s.title}</Text>
      <Text style={[styles.subtitle, rtl && styles.centerTextRTL]}>{s.subtitle}</Text>

      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        placeholder={s.passwordPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={phase !== 'saving'}
      />
      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        placeholder={s.confirmPasswordPlaceholder}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={phase !== 'saving'}
      />

      {error && <Text style={[styles.errorText, rtl && styles.textRTL]}>{error}</Text>}

      <GradientButton style={styles.button} onPress={handleSubmit} disabled={phase === 'saving'}>
        {phase === 'saving' ? (
          <ActivityIndicator color={colors.onTeal} />
        ) : (
          <Text style={styles.buttonText}>{s.submit}</Text>
        )}
      </GradientButton>
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
    padding: 24,
    gap: 16,
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
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: colors.ink700,
    textAlign: 'center',
  },
  textRTL: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  // For text that's meant to stay centered regardless of language (hero
  // title/subtitle/status messages) — only fixes character shaping, not
  // alignment, unlike textRTL above which is for right-edge form text.
  centerTextRTL: {
    writingDirection: 'rtl',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper50,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink900,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'right',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: colors.onTeal,
    fontSize: 16,
    fontWeight: '700',
  },
});
