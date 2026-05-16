import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

interface MockMarker {
  id: string;
  pinColor?: string;
}

interface MockCircle {
  id: string;
  fillColor: string;
  strokeColor?: string;
}

interface Props {
  markers?: MockMarker[];
  circles?: MockCircle[];
  onMarkerTap?: (id: string) => void;
}

const MOCK_POSITIONS = [
  { left: '26%', top: '34%' },
  { left: '42%', top: '28%' },
  { left: '56%', top: '38%' },
  { left: '67%', top: '46%' },
  { left: '34%', top: '52%' },
  { left: '48%', top: '61%' },
  { left: '74%', top: '31%' },
  { left: '18%', top: '58%' },
] as const;

// MOCK: Expo web icin native harita yerine demo okunurlugu olan statik zemin.
export function AppMap({ markers, circles, onMarkerTap }: Props) {
  const visibleCircles = circles?.length ? circles : [];
  const visibleMarkers = markers?.length ? markers.slice(0, 24) : [];

  return (
    <View style={styles.root}>
      <View style={styles.parkA} />
      <View style={styles.parkB} />
      <View style={styles.water} />

      <View style={[styles.road, styles.roadMain]} />
      <View style={[styles.road, styles.roadNorth]} />
      <View style={[styles.road, styles.roadEast]} />
      <View style={[styles.road, styles.roadSoftA]} />
      <View style={[styles.road, styles.roadSoftB]} />

      {visibleCircles.map((circle, index) => {
        const pos = MOCK_POSITIONS[index % MOCK_POSITIONS.length];
        return (
          <View
            key={circle.id}
            pointerEvents="none"
            style={[
              styles.heat,
              {
                left: pos.left,
                top: pos.top,
                backgroundColor: circle.fillColor,
                borderColor: circle.strokeColor ?? 'rgba(230,57,70,0.28)',
              },
            ]}
          />
        );
      })}

      {visibleMarkers.map((marker, index) => {
        const pos = MOCK_POSITIONS[index % MOCK_POSITIONS.length];
        return (
          <Pressable
            key={marker.id}
            accessibilityRole="button"
            accessibilityLabel="Harita pini"
            onPress={() => onMarkerTap?.(marker.id)}
            style={[styles.pin, { left: pos.left, top: pos.top }]}
          >
            <View style={[styles.pinDot, { backgroundColor: marker.pinColor ?? colors.accent.primary }]} />
          </Pressable>
        );
      })}

      <View style={styles.tint} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF0E9',
    overflow: 'hidden',
  },
  parkA: {
    position: 'absolute',
    left: -42,
    top: 90,
    width: 190,
    height: 170,
    borderRadius: 95,
    backgroundColor: '#C8D8C2',
    opacity: 0.72,
    transform: [{ rotate: '-14deg' }],
  },
  parkB: {
    position: 'absolute',
    right: -54,
    bottom: 64,
    width: 220,
    height: 180,
    borderRadius: 110,
    backgroundColor: '#D7E1C8',
    opacity: 0.75,
    transform: [{ rotate: '18deg' }],
  },
  water: {
    position: 'absolute',
    right: -80,
    top: 140,
    width: 190,
    height: 90,
    borderRadius: 80,
    backgroundColor: '#9EC7D7',
    opacity: 0.5,
    transform: [{ rotate: '-24deg' }],
  },
  road: {
    position: 'absolute',
    height: 14,
    borderRadius: 99,
    backgroundColor: 'rgba(26,29,36,0.34)',
  },
  roadMain: {
    left: -50,
    right: -40,
    top: '46%',
    transform: [{ rotate: '-18deg' }],
  },
  roadNorth: {
    left: -30,
    right: 70,
    top: '27%',
    height: 9,
    backgroundColor: 'rgba(74,80,96,0.28)',
    transform: [{ rotate: '10deg' }],
  },
  roadEast: {
    right: 22,
    top: -20,
    width: 12,
    height: '76%',
    backgroundColor: 'rgba(74,80,96,0.25)',
    transform: [{ rotate: '21deg' }],
  },
  roadSoftA: {
    left: 16,
    right: 16,
    bottom: '24%',
    height: 7,
    backgroundColor: 'rgba(122,128,144,0.22)',
    transform: [{ rotate: '7deg' }],
  },
  roadSoftB: {
    left: 80,
    right: -30,
    top: '63%',
    height: 7,
    backgroundColor: 'rgba(122,128,144,0.20)',
    transform: [{ rotate: '-28deg' }],
  },
  heat: {
    position: 'absolute',
    width: 142,
    height: 142,
    marginLeft: -71,
    marginTop: -71,
    borderRadius: 71,
    borderWidth: 1,
  },
  pin: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    marginTop: -11,
    borderRadius: 11,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: 'rgba(26,29,36,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1D24',
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pinDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(212,165,116,0.08)',
  },
});
