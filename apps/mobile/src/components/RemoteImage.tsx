import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

import { colors } from '../theme/colors';

interface Props {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
  /**
   * Sizes the image to its own natural aspect ratio at full container
   * width, instead of a fixed height. A fixed height either crops a tall
   * page or (far more often for scanned/designed lesson pages, which are
   * portrait) letterboxes it with big wasted side margins — exactly the
   * "not sitting right on the phone" complaint this was built to fix.
   * Default true, since every current use is exactly this case.
   */
  autoHeight?: boolean;
}

// Reasonable portrait-page guess used only for the brief window before the
// real aspect ratio is known, so the layout doesn't jump much once it is.
const FALLBACK_ASPECT_RATIO = 0.7;

/** Image with a spinner placeholder shown until the remote image finishes loading. */
export function RemoteImage({ uri, style, resizeMode = 'cover', autoHeight = true }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!autoHeight) return;
    let isMounted = true;
    setAspectRatio(null);
    setLoaded(false);
    Image.getSize(
      uri,
      (width, height) => {
        if (isMounted && width > 0 && height > 0) setAspectRatio(width / height);
      },
      () => undefined // Falls back to FALLBACK_ASPECT_RATIO below and stays there.
    );
    return () => {
      isMounted = false;
    };
  }, [uri, autoHeight]);

  const containerStyle: StyleProp<ImageStyle> = autoHeight
    ? [{ width: '100%', aspectRatio: aspectRatio ?? FALLBACK_ASPECT_RATIO }, style]
    : style;

  return (
    <View style={containerStyle}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode={autoHeight ? 'contain' : resizeMode}
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
