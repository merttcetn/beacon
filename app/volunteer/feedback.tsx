import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { PulseDot } from '@/components/PulseDot';
import { ANKARA_LANDMARKS } from '@/constants/region';
import { colors, fontFamily, spacing } from '@/theme';

const FALLBACK_COORDS = ANKARA_LANDMARKS.odtuTeknokent;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// 8-yön Türkçe cardinal
const CARDINALS_TR = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'] as const;
function headingLabel(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  return CARDINALS_TR[Math.round(norm / 45) % 8];
}

export default function FeedbackCamera() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: FALLBACK_COORDS.latitude,
    lon: FALLBACK_COORDS.longitude,
  });
  const [capturing, setCapturing] = useState(false);
  // MOCK: expo-camera zoom prop 0–1 (1×=0); gerçek ultra-wide yok, toggle sadece etiket
  const [zoomLevel, setZoomLevel] = useState<0.5 | 1>(1);
  const camRef = useRef<CameraView>(null);

  function toggleZoom() {
    Haptics.selectionAsync();
    setZoomLevel((z) => (z === 1 ? 0.5 : 1));
  }

  // --- Sensör state + Reanimated shared values ---
  const [heading, setHeading] = useState<number | null>(null);
  const [tiltDeg, setTiltDeg] = useState(0); // 5Hz throttled, sadece text readout
  const tiltSV = useSharedValue(0); // horizon line için sürekli roll (°)
  const isLevelSV = useSharedValue(0); // 0..1, |roll| < 2° iken 1
  const chromeRotSV = useSharedValue(0); // 0 | 90 | -90 | 180, chrome rotasyonu
  const tiltTextTick = useRef(0); // setTiltDeg throttle
  const lastHeading = useRef(-999); // 1° eşik
  const lastQuadrant = useRef(0); // hysteresis için

  // Pusula yönü
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let sub: Location.LocationSubscription | null = null;
      (async () => {
        try {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (!perm.granted || !alive) return;
          sub = await Location.watchHeadingAsync((h) => {
            const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
            if (deg == null || deg < 0) return;
            if (Math.abs(deg - lastHeading.current) < 1) return;
            lastHeading.current = deg;
            setHeading(deg);
          });
        } catch {
          /* simulator vb. — heading null kalır */
        }
      })();
      return () => {
        alive = false;
        sub?.remove();
      };
    }, []),
  );

  // Eğim + cihaz oryantasyonu (tek accelerometer kaynağı)
  useFocusEffect(
    useCallback(() => {
      Accelerometer.setUpdateInterval(60);
      const sub = Accelerometer.addListener(({ x, y }) => {
        // roll: portrait-up = 0°, sağa yatma = +, sola = -, baş-aşağı = ±180
        const roll = Math.atan2(x, -y) * (180 / Math.PI);
        tiltSV.value = withTiming(roll, { duration: 120 });
        isLevelSV.value = withTiming(Math.abs(roll) < 2 ? 1 : 0, { duration: 200 });

        const now = Date.now();
        if (now - tiltTextTick.current > 200) {
          tiltTextTick.current = now;
          setTiltDeg(roll);
        }

        // 4-quadrant chrome rotasyonu (hysteresis ile)
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        let rot = lastQuadrant.current;
        if (absX > absY + 0.15) {
          rot = x > 0 ? -90 : 90;
        } else if (absY > absX + 0.15) {
          rot = y > 0 ? 180 : 0;
        }
        if (rot !== lastQuadrant.current) {
          lastQuadrant.current = rot;
          chromeRotSV.value = withTiming(rot, { duration: 300 });
        }
      });
      return () => {
        sub.remove();
      };
    }, [tiltSV, isLevelSV, chromeRotSV]),
  );

  const chromeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chromeRotSV.value}deg` }],
  }));
  const horizonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-tiltSV.value}deg` }],
    backgroundColor: interpolateColor(
      isLevelSV.value,
      [0, 1],
      ['rgba(255,255,255,0.65)', colors.status.verified],
    ),
  }));

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
        facing="back"
      />

      {/* Top telemetry bar — GPS readout */}
      <SafeAreaView edges={['top']} style={styles.topSafe} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Animated.View style={[styles.gpsChip, chromeAnimStyle]}>
            <Ionicons name="locate" size={12} color={colors.status.verified} />
            <Text style={styles.gpsCoord}>
              {coords.lat.toFixed(4)}°N  {coords.lon.toFixed(4)}°E
            </Text>
            <View style={styles.gpsDivider} />
            <Text style={styles.gpsLoc}>TEKNOKENT</Text>
            {heading != null ? (
              <>
                <View style={styles.gpsDivider} />
                <Text style={styles.gpsHeading}>
                  {Math.round(heading)}° {headingLabel(heading)}
                </Text>
              </>
            ) : null}
          </Animated.View>
        </View>
      </SafeAreaView>

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
          {/* Horizon level — bracket merkezinde, gravity-aligned */}
          <View style={styles.horizonWrap} pointerEvents="none">
            <Animated.View style={[styles.horizonBar, horizonAnimStyle]}>
              <View style={styles.horizonTick} />
              <View style={styles.horizonTick} />
            </Animated.View>
            <Text style={styles.horizonReadout}>
              {tiltDeg >= 0 ? '+' : ''}{tiltDeg.toFixed(1)}°
            </Text>
          </View>
          {/* Bottom-center nameplate */}
          <View style={styles.kadrajAnchor} pointerEvents="none">
            <Animated.View style={[styles.kadrajBadge, chromeAnimStyle]}>
              <PulseDot color={colors.status.partial} size={5} duration={1200} />
              <Text style={styles.kadrajBadgeText}>KADRAJ</Text>
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Alt kontrol bar */}
      <View style={styles.bottomBar} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fotoğraf çek"
          accessibilityState={{ disabled: capturing }}
          disabled={capturing}
          onPress={capture}
          hitSlop={16}
          style={({ pressed }) => [
            styles.captureOuter,
            pressed && styles.captureOuterPressed,
            capturing && styles.captureOuterDisabled,
          ]}
        >
          <View style={styles.captureCore}>
            <View style={styles.captureDot} />
          </View>
        </Pressable>
        <AnimatedPressable
          style={[styles.zoomBtn, chromeAnimStyle]}
          onPress={toggleZoom}
          accessibilityRole="button"
          accessibilityLabel={`Yakınlaştırma ${zoomLevel === 1 ? '1×' : '0.5×'}, değiştir`}
          hitSlop={12}
        >
          <Text style={styles.zoomBtnText}>
            {zoomLevel === 1 ? '1×' : '.5'}
          </Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={[styles.closeBtn, chromeAnimStyle]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
          hitSlop={12}
        >
          <Ionicons name="close" size={16} color="#fff" />
        </AnimatedPressable>
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

  topSafe: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    zIndex: 5,
  },
  topRow: {
    marginTop: spacing.s2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  closeBtn: {
    position: 'absolute',
    right: 24,
    bottom: 63,
    width: 38, height: 38, borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  zoomBtn: {
    position: 'absolute',
    left: 24,
    bottom: 63,
    width: 38, height: 38, borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  zoomBtnText: {
    fontFamily: fontFamily.monoBold,
    fontSize: 12,
    color: '#fff',
    letterSpacing: 0.3,
  },

  gpsChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  gpsCoord: {
    fontFamily: fontFamily.mono, fontSize: 11, color: '#fff',
    letterSpacing: 0.5,
  },
  gpsDivider: {
    width: 1, height: 11,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 1,
  },
  gpsLoc: {
    fontFamily: fontFamily.monoBold, fontSize: 10.5, color: '#fff',
    letterSpacing: 1.3,
  },
  gpsHeading: {
    fontFamily: fontFamily.mono, fontSize: 11, color: '#fff',
    letterSpacing: 0.5,
  },

  bracketWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  bracket: { width: 280, height: 200, position: 'relative' },
  bracketCorner: {
    position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderRadius: 4,
  },
  horizonWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  horizonBar: {
    width: 96, height: 2,
    borderRadius: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  horizonTick: {
    width: 2, height: 8,
    borderRadius: 1,
    backgroundColor: '#fff',
    marginTop: 0,
  },
  horizonReadout: {
    position: 'absolute',
    bottom: 18,
    fontFamily: fontFamily.monoBold,
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 1.1,
  },
  kadrajAnchor: {
    position: 'absolute',
    left: 0, right: 0, bottom: -14,
    alignItems: 'center',
  },
  kadrajBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  kadrajBadgeText: {
    fontFamily: fontFamily.monoBold, fontSize: 10.5, color: '#fff',
    letterSpacing: 1.4,
  },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 26, paddingHorizontal: 24, paddingBottom: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  captureOuter: {
    width: 84, height: 84, borderRadius: 999,
    borderWidth: 2.5, borderColor: colors.bg.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  captureOuterPressed: { transform: [{ scale: 0.94 }] },
  captureOuterDisabled: { opacity: 0.5 },
  captureCore: {
    width: 64, height: 64, borderRadius: 999,
    backgroundColor: colors.bg.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  captureDot: {
    width: 5, height: 5, borderRadius: 99,
    backgroundColor: colors.accent.primary,
    opacity: 0.85,
  },
});
