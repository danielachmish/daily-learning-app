import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../../src/hooks/useAuth';
import { CreateDedicationScreen } from '../../src/screens/CreateDedicationScreen';

export default function NewDedicationRoute() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <CreateDedicationScreen profile={profile} />;
}
