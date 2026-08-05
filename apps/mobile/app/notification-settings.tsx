import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../src/hooks/useAuth';
import { NotificationSettingsScreen } from '../src/screens/NotificationSettingsScreen';

export default function NotificationSettingsRoute() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <NotificationSettingsScreen profile={profile} />;
}
