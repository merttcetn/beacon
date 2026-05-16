import type { Region } from 'react-native-maps';

// Ankara — ODTÜ Teknokent / Mahall Maidan civarı
export const DEFAULT_REGION: Region = {
  latitude: 39.876,
  longitude: 32.755,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

export const ANKARA_LANDMARKS = {
  odtuMainGate: { latitude: 39.8917, longitude: 32.7833 },
  odtuTeknokent: { latitude: 39.8763, longitude: 32.7559 },
  mahallMaidan: { latitude: 39.8755, longitude: 32.7479 },
  bilkentUni: { latitude: 39.8676, longitude: 32.7493 },
} as const;
