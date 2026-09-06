import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme/colors';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** Override the two gradient stops — e.g. a single repeated color for a muted/"done" state. */
  colors?: [string, string];
}

/**
 * The site's primary CTA look (limudyomi.co.il): a warm red-to-gold
 * gradient pill. Purely a visual swap for a Pressable that used to have
 * `backgroundColor: colors.teal400` — same onPress/disabled behavior,
 * same `style` (padding/borderRadius/etc. from the call site still apply,
 * just to the gradient layer instead of a flat color).
 */
export function GradientButton({ children, style, disabled, colors: colorsOverride, ...pressableProps }: Props) {
  return (
    // `style` (padding/borderRadius/alignItems/etc.) goes on the gradient
    // layer only — the outer Pressable is just a plain, unsized touch
    // target. If a button needs sizing within a flex row (e.g. flex: 1
    // beside another button), wrap this component in a View with that
    // sizing instead of relying on this component to split "layout" props
    // from "visual" ones out of an arbitrary style object.
    <Pressable disabled={disabled} {...pressableProps}>
      <LinearGradient
        colors={colorsOverride ?? [colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.4 }}
        style={[style, disabled && { opacity: 0.6 }]}
      >
        {children}
      </LinearGradient>
    </Pressable>
  );
}
