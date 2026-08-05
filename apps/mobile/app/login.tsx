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

import { Logo } from '../src/components/Logo';
import { useAuth } from '../src/hooks/useAuth';
import { colors } from '../src/theme/colors';
import { isDeviceRTL } from '../src/utils/rtl';

export default function LoginScreen() {
  const { session, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && session) {
    return <Redirect href="/" />;
  }

  // No profile exists yet at this screen — fall back to the device's own
  // locale direction instead of hardcoding Hebrew/RTL.
  const rtl = isDeviceRTL();

  async function handleSubmit() {
    setError(null);

    if (!email || !password) {
      setError('נא למלא אימייל וסיסמה.');
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
      <Logo size={48} />
      <Text style={[styles.title, rtl && styles.textRTL]}>התחברות</Text>

      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        placeholder="אימייל"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!submitting}
      />
      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        placeholder="סיסמה"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!submitting}
      />

      {error && <Text style={[styles.errorText, rtl && styles.textRTL]}>{error}</Text>}

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.onTeal} />
        ) : (
          <Text style={styles.buttonText}>התחבר/י</Text>
        )}
      </Pressable>

      <Link href="/register" style={styles.link}>
        <Text style={styles.linkText}>אין לך חשבון? הרשמ/י כאן</Text>
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
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'right',
  },
  button: {
    backgroundColor: colors.teal400,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
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
