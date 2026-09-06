/**
 * Central palette for the app's visual identity — matched to the
 * organization's real logo (sunburst mark + "פרויקט הלימוד היומי"
 * wordmark, בראשות הגר"י כהן שליט"א): teal as the primary anchor (the
 * sunburst rays), ink as a navy close to the wordmark, and amber as the
 * sunrise-orange of the mark's rising sun.
 */
export const colors = {
  teal900: '#0C5866',
  // Darkened from the original #128499 — measured contrast against its
  // actual usage backgrounds (teal100 badges, paper0 links) was 3.92:1 and
  // 4.20:1, both below WCAG AA's 4.5:1 minimum for normal text. This value
  // clears 4.5:1 against both while staying the same hue.
  teal600: '#11798D',
  teal400: '#3FC6D6',
  teal100: '#E1F6F8',
  onTeal: '#04262B',

  ink900: '#26324A',
  ink700: '#3B4864',
  slate500: '#59697C',
  // Darkened from the original #9AA7B5 (2.35:1 against paper0 — well below
  // the 4.5:1 WCAG AA minimum for text) to a value that clears 4.5:1. Still
  // the app's most muted text tone, just no longer illegible for low-vision
  // readers.
  slate300: '#647588',

  // Darkened from the original #EF7A1E — measured contrast against its
  // actual usage backgrounds (amber100 badges, paper0 text) was 2.29:1 and
  // 2.69:1, badly below WCAG AA's 4.5:1 minimum. This value clears 4.5:1
  // against both while staying the same hue.
  amber500: '#A7500C',
  amber100: '#FBE4CE',

  paper0: '#FBFAF7',
  paper50: '#FFFFFF',
  line: 'rgba(38, 50, 74, 0.10)',

  danger: '#B00020',
  success: '#1A7A3E',
};
