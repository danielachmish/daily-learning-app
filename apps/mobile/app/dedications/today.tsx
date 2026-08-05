import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../../src/hooks/useAuth';
import { TodayDedicationsScreen } from '../../src/screens/TodayDedicationsScreen';

export default function TodayDedicationsRoute() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <TodayDedicationsScreen profile={profile} />;
}
