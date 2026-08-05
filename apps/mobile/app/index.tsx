import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccess } from '../src/hooks/useAccess';
import { useAuth } from '../src/hooks/useAuth';
import { DailyLessonScreen } from '../src/screens/DailyLessonScreen';
import { colors } from '../src/theme/colors';

export default function HomeScreen() {
  const { session, profile, loading, signOut } = useAuth();
  const accessStatus = useAccess(profile);
  const { date } = useLocalSearchParams<{ date?: string }>();

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.errorText}>
          לא הצלחנו לטעון את הפרופיל שלך. נסה/י להתחבר מחדש.
        </Text>
        <Pressable style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>התנתק/י</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (accessStatus === 'loading') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (accessStatus === 'blocked') {
    return <Redirect href="/blocked" />;
  }

  if (accessStatus === 'no_access') {
    return <Redirect href="/paywall" />;
  }

  return <DailyLessonScreen profile={profile} onSignOut={signOut} initialDate={date} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    marginTop: 24,
    backgroundColor: colors.teal400,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  buttonText: {
    color: colors.onTeal,
    fontSize: 16,
    fontWeight: '700',
  },
});
