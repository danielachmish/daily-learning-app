import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import { colors } from '../theme/colors';

interface Props {
  uri: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
}

/** Image with a spinner placeholder shown until the remote image finishes loading. */
export function RemoteImage({ uri, style, resizeMode = 'cover' }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={style}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode={resizeMode}
        onLoadEnd={() => setLoaded(true)}
      />
      {!loaded && (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <ActivityIndicator />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal100,
  },
});
