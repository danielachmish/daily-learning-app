import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '../src/components/GradientButton';
import { LogoLockup } from '../src/components/LogoLockup';
import { useAuth } from '../src/hooks/useAuth';
import { t } from '../src/i18n/strings';
import { colors } from '../src/theme/colors';
import { getDeviceLanguage, isRTL } from '../src/utils/rtl';

export default function LoginScreen() {
  const { session, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && session) {
    return <Redirect href="/" />;
  }

  // No profile exists yet at this screen — fall back to the device's own
  // locale (both direction and text content) instead of hardcoding
  // Hebrew/RTL.
  const language = getDeviceLanguage();
  const rtl = isRTL(language);
  const s = t(language);

  async function handleSubmit() {
    setError(null);

    if (!email || !password) {
      setError(s.login.missingFields);
      return;
    }

    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.logoBlock}>
        <LogoLockup />
      </View>
      <Text style={[styles.title, rtl && styles.textRTL]}>{s.login.title}</Text>

      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        placeholder={s.login.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!submitting}
      />
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.passwordInput, rtl && styles.textRTL]}
          placeholder={s.login.passwordPlaceholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!submitting}
        />
        <Pressable
          style={[styles.eyeButton, rtl ? styles.eyeButtonRTL : styles.eyeButtonLTR]}
          onPress={() => setShowPassword((prev) => !prev)}
          hitSlop={8}
        >
          <Text style={styles.eyeButtonText}>{showPassword ? '🙈' : '👁️'}</Text>
        </Pressable>
      </View>

      {error && <Text style={[styles.errorText, rtl && styles.textRTL]}>{error}</Text>}

      <GradientButton style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={colors.onTeal} />
        ) : (
          <Text style={styles.buttonText}>{s.login.submit}</Text>
        )}
      </GradientButton>

      <Link href="/register" style={styles.link}>
        <Text style={styles.linkText}>{s.login.noAccount}</Text>
      </Link>
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
  logoBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink900,
    marginTop: 12,
    marginBottom: 8,
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
  textRTL: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  passwordRow: {
    justifyContent: 'center',
  },
  passwordInput: {
    paddingHorizontal: 48,
  },
  eyeButton: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  eyeButtonLTR: {
    right: 12,
  },
  eyeButtonRTL: {
    left: 12,
  },
  eyeButtonText: {
    fontSize: 18,
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
  link: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: colors.teal600,
    fontSize: 14,
    textAlign: 'center',
  },
});
