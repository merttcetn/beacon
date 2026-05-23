import { forwardRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Circle,
  MapViewProps,
  Marker,
  PROVIDER_DEFAULT,
  UrlTile,
} from 'react-native-maps';
import { DEFAULT_REGION } from '@/constants/region';
import { colors } from '@/theme';

const STADIA_KEY = process.env.EXPO_PUBLIC_STADIA_API_KEY ?? '';

// Stadia stilleri: alidade_smooth, alidade_smooth_dark, outdoors,
// stamen_terrain, stamen_toner — https://docs.stadiamaps.com/themes/
const STADIA_STYLE = 'alidade_smooth';
const tileUrl = `https://tiles.stadiamaps.com/tiles/${STADIA_STYLE}/{z}/{x}/{y}@2x.png${
  STADIA_KEY ? `?api_key=${STADIA_KEY}` : ''
}`;

// Stadia'nın gri-beyaz tile'ını paletimizin sıcak bej tonuna doğru çeker.
// Düşük opaklık — marker'lar parlak renkli ve halo'lu olduğu için okunurluğu bozmaz.
const TINT_OVERLAY_COLOR = 'rgba(212, 165, 116, 0.10)';

export interface AppMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  pinColor?: string;
}

export interface AppMapCircle {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
}

interface Props extends Omit<MapViewProps, 'children' | 'onMarkerPress'> {
  markers?: AppMapMarker[];
  circles?: AppMapCircle[];
  onMarkerTap?: (id: string) => void;
}

export const AppMap = forwardRef<MapView, Props>(function AppMap(
  { markers, circles, onMarkerTap, initialRegion, ...rest },
  ref,
) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion ?? DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        {...rest}
      >
        <UrlTile urlTemplate={tileUrl} maximumZ={20} flipY={false} tileSize={512} />
        {markers?.map((m) => {
          const dotColor = m.pinColor ?? colors.accent.primary;
          // Renk değişirse marker remount olsun (tracksViewChanges=false ile uyumlu).
          return (
            <Marker
              key={`${m.id}-${dotColor}`}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => onMarkerTap?.(m.id)}
              tracksViewChanges={false}
            >
              <View style={pinStyles.halo}>
                <View style={[pinStyles.dot, { backgroundColor: dotColor }]} />
              </View>
            </Marker>
          );
        })}
        {circles?.map((c) => (
          <Circle
            key={c.id}
            center={{ latitude: c.latitude, longitude: c.longitude }}
            radius={c.radius}
            fillColor={c.fillColor}
            strokeColor={c.strokeColor ?? 'transparent'}
            strokeWidth={c.strokeWidth ?? 0}
          />
        ))}
      </MapView>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: TINT_OVERLAY_COLOR }]}
      />
    </View>
  );
});

const pinStyles = StyleSheet.create({
  halo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26,29,36,0.10)',
    shadowColor: '#1A1D24',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
