import type { GenderTrack, Language } from '@daily-learning/shared';
import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoLockup } from '../src/components/LogoLockup';
import { useAuth } from '../src/hooks/useAuth';
import { colors } from '../src/theme/colors';
import { isRTL } from '../src/utils/rtl';

// Public pages served by the admin panel (apps/admin/src/app/legal/*) —
// no login required, since a visitor needs to be able to read these before
// they even have an account. Content itself is edited by the org in the
// admin panel's "מסמכים משפטיים" screen, not hardcoded here.
const PRIVACY_POLICY_URL = 'https://daily-learning-admin-v2.netlify.app/legal/privacy';
const TERMS_URL = 'https://daily-learning-admin-v2.netlify.app/legal/terms';

export default function RegisterScreen() {
  const { session, loading: authLoading, signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [genderTrack, setGenderTrack] = useState<GenderTrack>('men');
  const [language, setLanguage] = useState<Language>('he');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && session) {
    return <Redirect href="/" />;
  }

  const rtl = isRTL(language);

  async function handleSubmit() {
    setError(null);

    if (!fullName || !phone || !email || !password) {
      setError('נא למלא את כל השדות.');
      return;
    }

    setSubmitting(true);
    const result = await signUp({ fullName, phone, email, password, genderTrack, language });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.logoBlock}>
        <LogoLockup width={180} />
      </View>
      <Text style={[styles.title, rtl && styles.textRTL]}>הרשמה</Text>

      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        placeholder="שם מלא"
        value={fullName}
        onChangeText={setFullName}
        editable={!submitting}
      />
      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        placeholder="טלפון"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        editable={!submitting}
      />
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

      <Text style={[styles.label, rtl && styles.textRTL]}>מסלול</Text>
      <View style={styles.segmentRow}>
        <SegmentButton
          label="גברים"
          selected={genderTrack === 'men'}
          onPress={() => setGenderTrack('men')}
          disabled={submitting}
        />
        <SegmentButton
          label="נשים"
          selected={genderTrack === 'women'}
          onPress={() => setGenderTrack('women')}
          disabled={submitting}
        />
      </View>

      <Text style={[styles.label, rtl && styles.textRTL]}>שפה</Text>
      <View style={styles.segmentRow}>
        <SegmentButton
          label="עברית"
          selected={language === 'he'}
          onPress={() => setLanguage('he')}
          disabled={submitting}
        />
        <SegmentButton
          label="English"
          selected={language === 'en'}
          onPress={() => setLanguage('en')}
          disabled={submitting}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.onTeal} />
        ) : (
          <Text style={styles.buttonText}>הרשמ/י</Text>
        )}
      </Pressable>

      <Link href="/login" style={styles.link}>
        <Text style={styles.linkText}>כבר יש לך חשבון? התחבר/י</Text>
      </Link>

      <Text style={[styles.legalText, rtl && styles.textRTL]}>
        בהרשמה אני מסכים/ה ל
        <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>
          {' '}
          תנאי השימוש{' '}
        </Text>
        ול
        <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          {' '}
          מדיניות הפרטיות
        </Text>
      </Text>
    </SafeAreaView>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      style={[styles.segment, selected && styles.segmentSelected]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink900,
    marginTop: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: colors.slate500,
    marginTop: 4,
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
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.teal400,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.teal400,
  },
  segmentText: {
    color: colors.teal600,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: colors.onTeal,
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
  legalText: {
    marginTop: 20,
    fontSize: 12,
    color: colors.slate300,
    textAlign: 'center',
  },
  legalLink: {
    color: colors.teal600,
    fontWeight: '600',
  },
});
