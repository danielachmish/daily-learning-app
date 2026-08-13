import Svg, { Defs, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';

import { logoGradients } from '../theme/colors';

interface Props {
  size?: number;
}

const RAYS = [
  '38.2,76.8 14.1,76.9 37.9,81.1',
  '39.7,73.5 11.1,64.3 38.1,77.5',
  '42.1,70.7 12.7,49.8 39.3,74.2',
  '45.1,68.8 20.9,36.9 41.5,71.3',
  '48.6,67.9 34.2,28.4 44.4,69.2',
  '52.2,68 50,24 47.8,68',
  '55.6,69.2 65.8,28.4 51.4,67.9',
  '58.5,71.3 79.1,36.9 54.9,68.8',
  '60.7,74.2 87.3,49.8 57.9,70.7',
  '62.0,77.5 88.9,64.3 60.3,73.5',
  '62.1,81.1 85.9,76.9 61.8,76.8',
];

/**
 * The organization's real mark: a teal sunburst rising behind an
 * orange-gold sun — matches "פרויקט הלימוד היומי" (בראשות הגר"י כהן
 * שליט"א). This is the compact icon version used throughout the app
 * (headers, app icon); the full wordmark isn't baked into this component
 * since the app name is already rendered as real text alongside it.
 */
export function Logo({ size = 40 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="rayGradient" x1="11" y1="0" x2="89" y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={logoGradients.rayStart} />
          <Stop offset="50%" stopColor={logoGradients.rayMid} />
          <Stop offset="100%" stopColor={logoGradients.rayEnd} />
        </LinearGradient>
        <LinearGradient id="sunGradient" x1="0" y1="64" x2="0" y2="80" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={logoGradients.sunStart} />
          <Stop offset="100%" stopColor={logoGradients.sunEnd} />
        </LinearGradient>
      </Defs>
      {RAYS.map((points) => (
        <Polygon key={points} points={points} fill="url(#rayGradient)" />
      ))}
      <Path d="M34,80 A16,16 0 0 1 66,80 Z" fill="url(#sunGradient)" />
    </Svg>
  );
}
