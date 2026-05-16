import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
  type CameraType,
  useCameraPermissions,
} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { ShutterButton } from '@/components/camera/ShutterButton';
import { SideButton } from '@/components/camera/SideButton';
import { PulseDot } from '@/components/PulseDot';
import { ANKARA_LANDMARKS } from '@/constants/region';
import { colors, fontFamily, radius, spacing } from '@/theme';

const FALLBACK_COORDS = ANKARA_LANDMARKS.odtuTeknokent;

export default function FeedbackCamera() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: FALLBACK_COORDS.latitude,
    lon: FALLBACK_COORDS.longitude,
  });
  const [capturing, setCapturing] = useState(false);
  const camRef = useRef<CameraView>(null);

  // GPS'i ekran her açıldığında yenile
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (!perm.granted) return;
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (alive) {
            setCoords({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            });
          }
        } catch {
          /* fallback ODTÜ kalır */
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  async function capture() {
    if (!camRef.current || capturing) return;
    setCapturing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await camRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      if (!photo?.uri) {
        setCapturing(false);
        return;
      }
      // Capture anında GPS'i bir kez daha çek (en güncel)
      let lat = coords.lat;
      let lon = coords.lon;
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {
        /* mevcut state'i kullan */
      }
      router.push({
        pathname: '/volunteer/ticket/new',
        params: {
          photoUri: photo.uri,
          lat: String(lat),
          lon: String(lon),
        },
      });
    } finally {
      setCapturing(false);
    }
  }

  function flip() {
    Haptics.selectionAsync();
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  }

  // İzin akışı
  if (!permission) {
    return (
      <View style={styles.fallback}>
        <ActivityIndicator color={colors.text.inverse} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.fallback}>
        <Ionicons name="camera-outline" size={48} color={colors.text.inverse} />
        <Text style={styles.fallbackTitle}>Kamera izni gerekli</Text>
        <Text style={styles.fallbackSub}>
          Problem fotoğrafı çekebilmek için uygulamanın kameraya erişmesi gerekiyor.
        </Text>
        <Button label="İzin ver" size="lg" onPress={requestPermission} />
        <Pressable onPress={() => router.back()} style={styles.fallbackBack}>
          <Text style={styles.fallbackBackText}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        ref={camRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
      />

      {/* Kapat */}
      <SafeAreaView edges={['top']} style={styles.closeSafe} pointerEvents="box-none">
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={16} color="#fff" />
        </Pressable>
      </SafeAreaView>

      {/* GPS chip */}
      <View style={styles.gpsChip}>
        <Ionicons name="locate" size={13} color={colors.status.verified} />
        <Text style={styles.gpsText}>
          {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
        </Text>
        <Text style={styles.gpsSep}>·</Text>
        <Text style={styles.gpsLoc}>Teknokent</Text>
      </View>

      {/* Kadraj bracket */}
      <View style={styles.bracketWrap} pointerEvents="none">
        <View style={styles.bracket}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
            <View
              key={pos}
              style={[
                styles.bracketCorner,
                pos === 'tl' && { top: 0, left: 0, borderTopWidth: 2.5, borderLeftWidth: 2.5 },
                pos === 'tr' && { top: 0, right: 0, borderTopWidth: 2.5, borderRightWidth: 2.5 },
                pos === 'bl' && { bottom: 0, left: 0, borderBottomWidth: 2.5, borderLeftWidth: 2.5 },
                pos === 'br' && { bottom: 0, right: 0, borderBottomWidth: 2.5, borderRightWidth: 2.5 },
              ]}
            />
          ))}
          <View style={styles.kadrajBadge}>
            <PulseDot color={colors.status.partial} size={6} duration={1200} />
            <Text style={styles.kadrajBadgeText}>Kadraj</Text>
          </View>
        </View>
      </View>

      {/* Alt kontrol bar */}
      <View style={styles.bottomBar} pointerEvents="box-none">
        <View style={styles.shutterRow}>
          <SideButton
            icon="images-outline"
            onPress={() => {}}
            accessibilityLabel="Galeri"
            disabled
            badge={{
              value: 2,
              bgColor: colors.status.partial,
              textColor: colors.text.primary,
              borderColor: colors.bg.deep,
            }}
          />
          <ShutterButton
            onPress={capture}
            disabled={capturing}
            ringColor={colors.bg.primary}
            coreColor={colors.bg.primary}
            accentColor={colors.accent.primary}
            glowColor={colors.bg.primary}
            recessedColor={colors.bg.deep}
          />
          <SideButton
            icon="camera-reverse-outline"
            onPress={flip}
            accessibilityLabel="Kamerayı çevir"
          />
        </View>
        <Text style={styles.helper}>
          Shutter'a dokun → tek fotoğraf · konum otomatik eklenir
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  fallback: {
    flex: 1,
    backgroundColor: colors.bg.deep,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s6,
    gap: spacing.s4,
  },
  fallbackTitle: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.text.inverse,
    letterSpacing: -0.4,
  },
  fallbackSub: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: 'rgba(250,247,242,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.s2,
  },
  fallbackBack: { marginTop: spacing.s2 },
  fallbackBackText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: 'rgba(250,247,242,0.6)',
  },

  closeSafe: { position: 'absolute', top: 0, right: 16 },
  closeBtn: {
    marginTop: spacing.s2,
    width: 38, height: 38, borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  gpsChip: {
    position: 'absolute', top: 200, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gpsText: {
    fontFamily: fontFamily.mono, fontSize: 11.5, color: '#fff', letterSpacing: 0.4,
  },
  gpsSep: { color: 'rgba(255,255,255,0.55)', fontSize: 11.5 },
  gpsLoc: { fontFamily: fontFamily.body, fontSize: 11.5, color: '#fff' },

  bracketWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  bracket: { width: 280, height: 200, position: 'relative' },
  bracketCorner: {
    position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderRadius: 4,
  },
  kadrajBadge: {
    position: 'absolute', top: -18, left: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  kadrajBadgeText: {
    fontFamily: fontFamily.bodyMedium, fontSize: 12, color: '#fff',
  },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 22, paddingHorizontal: 24, paddingBottom: 34,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  shutterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  helper: {
    marginTop: 14, textAlign: 'center',
    fontFamily: fontFamily.body, fontSize: 12.5,
    color: 'rgba(255,255,255,0.75)',
  },
});
