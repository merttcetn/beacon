import { forwardRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, {
  Circle,
  MapViewProps,
  Marker,
  PROVIDER_DEFAULT,
  UrlTile,
} from 'react-native-maps';
import { DEFAULT_REGION } from '@/constants/region';

const STADIA_KEY = process.env.EXPO_PUBLIC_STADIA_API_KEY ?? '';

// Stadia stilleri: alidade_smooth, alidade_smooth_dark, outdoors,
// stamen_terrain, stamen_toner — https://docs.stadiamaps.com/themes/
const STADIA_STYLE = 'alidade_smooth';
const tileUrl = `https://tiles.stadiamaps.com/tiles/${STADIA_STYLE}/{z}/{x}/{y}@2x.png${
  STADIA_KEY ? `?api_key=${STADIA_KEY}` : ''
}`;

export interface AppMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
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
      {markers?.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          title={m.title}
          description={m.description}
          pinColor={m.pinColor}
          onPress={() => onMarkerTap?.(m.id)}
        />
      ))}
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
  );
});
