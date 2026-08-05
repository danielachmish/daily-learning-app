import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../../src/hooks/useAuth';
import { MyDedicationsScreen } from '../../src/screens/MyDedicationsScreen';

export default function MyDedicationsRoute() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <MyDedicationsScreen profile={profile} />;
}
