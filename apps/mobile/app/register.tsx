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

import { GradientButton } from '../src/components/GradientButton';
import { LogoLockup } from '../src/components/LogoLockup';
import { useAuth } from '../src/hooks/useAuth';
import { t } from '../src/i18n/strings';
import { colors } from '../src/theme/colors';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../src/constants/legalUrls';
import { isRTL } from '../src/utils/rtl';

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
  // Live-updates as the user toggles the language segment below, so the
  // form itself switches language the moment they pick it — not just
  // screens reached after signing up.
  const s = t(language);

  async function handleSubmit() {
    setError(null);

    if (!fullName || !phone || !email || !password) {
      setError(s.register.missingFields);
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
      <Text style={[styles.title, rtl && styles.textRTL]}>{s.register.title}</Text>

      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        placeholder={s.register.fullNamePlaceholder}
        value={fullName}
        onChangeText={setFullName}
        editable={!submitting}
      />
      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        placeholder={s.register.phonePlaceholder}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        editable={!submitting}
      />
      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        placeholder={s.register.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!submitting}
      />
      <TextInput
        style={[styles.input, rtl && styles.textRTL]}
        placeholder={s.register.passwordPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!submitting}
      />

      <Text style={[styles.label, rtl && styles.textRTL]}>{s.register.trackLabel}</Text>
      <View style={styles.segmentRow}>
        <SegmentButton
          label={s.register.trackMen}
          selected={genderTrack === 'men'}
          onPress={() => setGenderTrack('men')}
          disabled={submitting}
        />
        <SegmentButton
          label={s.register.trackWomen}
          selected={genderTrack === 'women'}
          onPress={() => setGenderTrack('women')}
          disabled={submitting}
        />
      </View>

      <Text style={[styles.label, rtl && styles.textRTL]}>{s.register.languageLabel}</Text>
      <View style={styles.segmentRow}>
        <SegmentButton
          label={s.register.languageHebrew}
          selected={language === 'he'}
          onPress={() => setLanguage('he')}
          disabled={submitting}
        />
        <SegmentButton
          label={s.register.languageEnglish}
          selected={language === 'en'}
          onPress={() => setLanguage('en')}
          disabled={submitting}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <GradientButton style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={colors.onTeal} />
        ) : (
          <Text style={styles.buttonText}>{s.register.submit}</Text>
        )}
      </GradientButton>

      <Link href="/login" style={styles.link}>
        <Text style={styles.linkText}>{s.register.haveAccount}</Text>
      </Link>

      <Text style={[styles.legalText, rtl && styles.textRTL]}>
        {s.register.legalPrefix}
        <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>
          {s.register.termsOfUse}
        </Text>
        {s.register.legalAnd}
        <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          {s.register.privacyPolicy}
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
