import { Image, StyleSheet } from 'react-native';

const ASPECT_RATIO = 2482 / 1376;

interface Props {
  width?: number;
}

/**
 * The org's real logo, used as-is (not recreated/split into pieces) per
 * explicit request — a single image, exactly matching the source file.
 * Source: assets/brand/logo-full.png (2482x1376, converted from the
 * org-provided CMYK JPEG to sRGB so it renders with correct colors —
 * CMYK JPEGs can render wrong/inverted otherwise). Matches the admin
 * panel's LogoLockup.
 */
export function LogoLockup({ width = 260 }: Props) {
  return (
    <Image
      source={require('../../assets/brand/logo-full.png')}
      style={[styles.image, { width, height: width / ASPECT_RATIO }]}
      resizeMode="contain"
      accessibilityLabel="פרויקט הלימוד היומי — בראשות הגאון רבי יגאל כהן שליט״א"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    alignSelf: 'center',
  },
});
