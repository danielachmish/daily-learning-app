import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../theme/colors';

interface Props {
  days: number;
}

export function StreakBadge({ days }: Props) {
  if (days <= 0) return null;

  return (
    <View style={styles.badge}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2c2.2 3 4.2 5.4 4.2 8.2A4.2 4.2 0 0 1 12 14.4a4.2 4.2 0 0 1-4.2-4.2C7.8 7.4 9.8 5 12 2z"
          fill={colors.amber500}
        />
      </Svg>
      <Text style={styles.num}>{days}</Text>
      <Text style={styles.label}>ימים ברצף</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.amber100,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 14,
  },
  num: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.amber500,
  },
  label: {
    fontSize: 12.5,
    color: colors.slate500,
  },
});
