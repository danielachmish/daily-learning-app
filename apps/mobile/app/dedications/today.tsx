import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../../src/hooks/useAuth';
import { TodayDedicationsScreen } from '../../src/screens/TodayDedicationsScreen';
import { toDateOnlyString } from '../../src/utils/date';

export default function TodayDedicationsRoute() {
  const { profile, loading } = useAuth();
  // The lesson screen passes the date it's showing; fall back to today for any
  // other entry point (or a malformed param).
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : toDateOnlyString(new Date());

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <TodayDedicationsScreen profile={profile} date={date} />;
}
