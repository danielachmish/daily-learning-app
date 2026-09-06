/**
 * Central palette — matched to the organization's real marketing site
 * (limudyomi.co.il), so the app reads as a continuation of it rather than
 * a separate product: their exact navy (#122048) for text, their exact
 * pale-cyan (#F7FCFD) for backgrounds, their red-to-gold CTA gradient for
 * primary actions, and their soft lavender (#DAE1F5) for secondary
 * surfaces.
 *
 * A few of their exact swatches had to be nudged slightly darker than the
 * site's own — measured against WCAG AA (4.5:1 for normal text), the
 * site's literal red (#DF3C3C) and gold (#FFD214) both come in below that
 * threshold behind white button text (4.33:1 and a severe 1.45:1
 * respectively). Rather than reopen the accessibility work from earlier
 * in this project, the gradient here is nudged just enough to clear
 * 4.5:1 at both ends while staying unmistakably the same red-to-gold hue.
 *
 * Token NAMES were kept from the previous teal-based palette on purpose —
 * every screen already references colors.teal400/teal600/teal100/onTeal
 * etc., so retinting the values here recolors the whole app without
 * touching any screen's logic or markup. Only the primary CTA gradient
 * itself needed real component changes (see GradientButton), since a flat
 * StyleSheet color can't render a gradient.
 */
export const colors = {
  // Darker red — the "completed"/pressed-state variant of a primary
  // button (previously the darker teal900).
  teal900: '#8F1D1D',
  // AA-safe darkened red — flat text/icon/border color (links, category
  // badges) wherever a gradient isn't applicable. Clears 4.5:1 against
  // both paper0 and the new teal100 (lavender) background.
  teal600: '#BB2F2F',
  // Their brand red, nudged from #DF3C3C to #DE3535 (barely perceptible)
  // so white button text clears 4.5:1 against it — used both as a flat
  // button background and as the gradient's start color.
  teal400: '#DE3535',
  // Their soft lavender secondary surface — badges, chip backgrounds,
  // legend swatches (previously a light teal tint).
  teal100: '#DAE1F5',
  // White text/icons on the red/gradient buttons (previously near-black-teal).
  onTeal: '#FFFFFF',

  // Their exact navy.
  ink900: '#122048',
  ink700: '#3B4864',
  slate500: '#59697C',
  slate300: '#647588',

  amber500: '#A7500C',
  amber100: '#FBE4CE',

  // Their exact pale-cyan page background (previously a warm cream).
  paper0: '#F7FCFD',
  paper50: '#FFFFFF',
  line: 'rgba(38, 50, 74, 0.10)',

  danger: '#B00020',
  success: '#1A7A3E',

  // GradientButton's two stops. Same red as teal400 above; the gold end
  // is darkened from their site's literal #FFD214 to #8F7400 specifically
  // so white text stays readable across the whole button, not just near
  // the red end — see the file header note.
  gradientStart: '#DE3535',
  gradientEnd: '#8F7400',
};
