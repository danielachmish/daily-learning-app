import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { GradientButton } from './GradientButton';
import { LogoLockup } from './LogoLockup';

/** Hostnames the app used to live on, before moving to the org's own domain. */
const OLD_HOSTNAMES = ['halimudhayomi.co.il', 'www.halimudhayomi.co.il'];
export const NEW_APP_URL = 'https://app.limudyomi.co.il';

function isOnOldDomain(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return OLD_HOSTNAMES.includes(window.location.hostname);
}

/**
 * Web only: when the app is opened on its old domain, covers the whole
 * screen with a "we moved" notice and a button to the new address.
 *
 * Deliberately not an automatic redirect: people who added the old address
 * to their home screen need to understand they should open (and re-add)
 * the new one, and that they'll have to sign in again there — login,
 * notification permission and the installed app are all tied to the
 * domain, so none of it carries over by itself.
 */
export function DomainMovedNotice() {
  if (!isOnOldDomain()) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <LogoLockup width={200} />
        <Text style={styles.title}>האפליקציה עברה לכתובת חדשה</Text>
        <Text style={styles.body}>
          מעכשיו הלימוד היומי נמצא בכתובת:{'\n'}
          <Text style={styles.url}>app.limudyomi.co.il</Text>
        </Text>
        <Text style={styles.body}>
          בכתובת החדשה יש להתחבר שוב עם אותו אימייל וסיסמה. כל הנתונים והמנוי נשמרו.
        </Text>
        <GradientButton style={styles.button} onPress={() => Linking.openURL(NEW_APP_URL)}>
          <Text style={styles.buttonText}>מעבר לכתובת החדשה</Text>
        </GradientButton>
        <Text style={styles.hint}>
          אם הוספת את האפליקציה למסך הבית — כדאי להסיר את הקיצור הישן ולהוסיף מחדש מהכתובת החדשה.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: colors.paper0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink900,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink700,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  url: {
    fontWeight: '800',
    color: colors.teal600,
    writingDirection: 'ltr',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: colors.onTeal,
    fontSize: 18,
    fontWeight: '800',
  },
  hint: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink700,
    textAlign: 'center',
    writingDirection: 'rtl',
    opacity: 0.85,
  },
});
