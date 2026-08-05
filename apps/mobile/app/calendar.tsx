import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../src/hooks/useAuth';
import { CalendarScreen } from '../src/screens/CalendarScreen';

export default function CalendarRoute() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <CalendarScreen profile={profile} />;
}
