import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { Logo } from './Logo';

interface Props {
  size?: number;
}

/**
 * Full lockup version of the org's mark — icon + "פרויקט הלימוד היומי" +
 * the subtitle line, stacked. See Logo.tsx for the icon-only version used
 * in tight/inline spots. Matches the admin panel's LogoLockup.
 */
export function LogoLockup({ size = 56 }: Props) {
  return (
    <View style={styles.container}>
      <Logo size={size} />
      <View style={styles.textBlock}>
        <Text style={styles.project}>פרויקט</Text>
        <Text style={styles.title}>הלימוד היומי</Text>
      </View>
      <Text style={styles.subtitle}>בראשות הגאון רבי יגאל כהן שליט״א</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 2,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 4,
  },
  project: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.amber500,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink900,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.teal600,
    textAlign: 'center',
  },
});
