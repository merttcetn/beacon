import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { PulseDot } from '@/components/PulseDot';
import { Waveform } from '@/components/Waveform';
import { useBuddyVoice } from '@/hooks/useBuddyVoice';
import { hasAiApi } from '@/lib/aiApi';
import { assist } from '@/lib/assist';
import { speakTts, stopTts, subscribeTtsState, waitForTtsIdle } from '@/lib/tts';
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily } from '@/theme';

const HOLD_DURATION_MS = 1000;
const TICK_INTERVAL_MS = 125;
const ANALYZE_INTERVAL_MS = 5000;
const RECENT_GUIDANCE_MAX = 3;
const TICK_PATTERN: Haptics.ImpactFeedbackStyle[] = [
  Haptics.ImpactFeedbackStyle.Rigid,
  Haptics.ImpactFeedbackStyle.Rigid,
  Haptics.ImpactFeedbackStyle.Rigid,
  Haptics.ImpactFeedbackStyle.Heavy,
  Haptics.ImpactFeedbackStyle.Heavy,
  Haptics.ImpactFeedbackStyle.Heavy,
  Haptics.ImpactFeedbackStyle.Heavy,
];

const DEBUG_TAP_THRESHOLD = 3;
const DEBUG_TAP_WINDOW_MS = 1500;
const ONBOARDING_SWIPE_DISTANCE = -70;
const ONBOARDING_SWIPE_VELOCITY = -0.45;

function speak(text: string) {
  void speakTts(text);
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function BuddyMain() {
  useKeepAwake();
  const router = useRouter();
  const reset = useUserStore((s) => s.reset);

  const [lastSpoken, setLastSpoken] = useState<string>('');
  const [debugMode, setDebugMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const debugTapTimes = useRef<number[]>([]);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdProgress = useSharedValue(0);
  const glow = useSharedValue(0.55);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const coordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const vlmInflightRef = useRef(false);
  const ttsSpeakingRef = useRef(false);
  const voiceFlowActiveRef = useRef(false);
  const lastFrameUriRef = useRef<string | null>(null);
  const recentGuidanceRef = useRef<string[]>([]);

  function cancelHold(silent = false) {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (tickTimer.current) {
      clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
    if (!silent && holdProgress.value > 0.05) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    holdProgress.value = withTiming(0, { duration: 200 });
  }

  const stopSession = useCallback(() => {
    void stopTts();
    reset();
    router.replace('/onboarding');
  }, [reset, router]);

  const onboardingSwipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25;
          return isHorizontal && gesture.dx < -18;
        },
        onPanResponderRelease: (_, gesture) => {
          if (
            gesture.dx < ONBOARDING_SWIPE_DISTANCE ||
            gesture.vx < ONBOARDING_SWIPE_VELOCITY
          ) {
            stopSession();
          }
        },
      }),
    [stopSession],
  );

  function startHold() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    holdProgress.value = withTiming(1, { duration: HOLD_DURATION_MS });
    let tickIndex = 0;
    tickTimer.current = setInterval(() => {
      if (tickIndex < TICK_PATTERN.length) {
        Haptics.impactAsync(TICK_PATTERN[tickIndex]);
        tickIndex += 1;
      }
    }, TICK_INTERVAL_MS);
    holdTimer.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 80);
      cancelHold(true);
      stopSession();
    }, HOLD_DURATION_MS);
  }

  const { metering, isSpeaking } = useBuddyVoice({
    enabled: voiceEnabled,
    onSpeechStart: () => {
      // Kullanıcı eşik üstü konuşmaya başladı — çalan TTS varsa kes, voice turn
      // sona erene kadar buddy_frame tick'i atla.
      voiceFlowActiveRef.current = true;
      void stopTts();
    },
    onVoiceFlowChange: (active) => {
      voiceFlowActiveRef.current = active;
    },
    onAssistantSpeech: (text) => {
      setLastSpoken(text);
      const next = [...recentGuidanceRef.current, text];
      recentGuidanceRef.current = next.slice(-RECENT_GUIDANCE_MAX);
    },
    onAssistResult: (result) => {
      if (result.ui_action === 'open_ticket' && result.ticket) {
        // TODO: ticket payload'unu n8n webhook'una ilet (sesli ticket akışı).
        console.warn('[buddy] open_ticket (n8n iletimi henüz yapılmadı):', result.ticket);
      } else if (result.ui_action === 'switch_to_sport') {
        console.warn('[buddy] switch_to_sport istendi — spor modu UI henüz yok');
      }
    },
    onPermissionDenied: () => {
      console.warn('[buddy] mikrofon izni reddedildi — debug moduna geçildi');
      setVoiceEnabled(false);
      setDebugMode(true);
    },
    getVoiceContext: () => ({
      frameUri: lastFrameUriRef.current,
      lat: coordsRef.current?.lat,
      lon: coordsRef.current?.lon,
      screenContext: 'buddy_mode',
    }),
  });

  const waveformMode: 'idle' | 'listening' | 'speaking' = isSpeaking
    ? 'speaking'
    : voiceEnabled
    ? 'listening'
    : 'idle';

  function handleStatusChipTap() {
    const now = Date.now();
    debugTapTimes.current = [
      ...debugTapTimes.current.filter((t) => now - t < DEBUG_TAP_WINDOW_MS),
      now,
    ];
    if (debugTapTimes.current.length >= DEBUG_TAP_THRESHOLD) {
      debugTapTimes.current = [];
      setDebugMode((d) => !d);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }

  useEffect(() => {
    const unsub = subscribeTtsState((s) => {
      ttsSpeakingRef.current = s;
    });
    return unsub;
  }, []);

  // Kamera + konum izinleri.
  useEffect(() => {
    if (!hasAiApi()) return;
    let cancelled = false;
    (async () => {
      if (!cameraPermission?.granted) {
        const res = await requestCameraPermission();
        if (!res.granted || cancelled) return;
      }
      try {
        const loc = await Location.getLastKnownPositionAsync();
        if (loc && !cancelled) {
          coordsRef.current = {
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
          };
        } else {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (perm.granted && !cancelled) {
            const fresh = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (!cancelled) {
              coordsRef.current = {
                lat: fresh.coords.latitude,
                lon: fresh.coords.longitude,
              };
            }
          }
        }
      } catch (err) {
        console.warn('[buddy] konum alınamadı', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cameraPermission, requestCameraPermission]);

  const speakBuddyGuidance = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setLastSpoken(clean);
    const next = [...recentGuidanceRef.current, clean];
    recentGuidanceRef.current = next.slice(-RECENT_GUIDANCE_MAX);
    await speakTts(clean);
    await waitForTtsIdle();
  }, []);

  // test.html canonical akışı: her ANALYZE_INTERVAL_MS'de tek kare → /v1/assist
  // event=buddy_frame. Voice turn veya TTS aktifken atla.
  useEffect(() => {
    if (!hasAiApi()) return;
    if (!cameraPermission?.granted) return;
    if (!cameraReady) return;

    const tick = async () => {
      if (vlmInflightRef.current) return;
      if (ttsSpeakingRef.current) return;
      if (voiceFlowActiveRef.current) return;
      if (!cameraRef.current) return;
      vlmInflightRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.4,
          skipProcessing: true,
          shutterSound: false,
        });
        if (!photo?.uri) return;
        lastFrameUriRef.current = photo.uri;
        const recentGuidance = recentGuidanceRef.current.join('\n');
        const result = await assist({
          event: 'buddy_frame',
          frameUri: photo.uri,
          screenContext: 'buddy_mode',
          lat: coordsRef.current?.lat,
          lon: coordsRef.current?.lon,
          recentGuidance,
        });
        const text = result.speak_text.trim();
        if (text && !voiceFlowActiveRef.current) {
          await speakBuddyGuidance(text);
        }
      } catch (err) {
        console.warn('[buddy] /v1/assist buddy_frame hata', err);
      } finally {
        vlmInflightRef.current = false;
      }
    };

    const id = setInterval(() => {
      void tick();
    }, ANALYZE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [cameraReady, cameraPermission, speakBuddyGuidance]);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      void stopTts();
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, [glow]);

  function replay() {
    if (!lastSpoken) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    speak(lastSpoken);
  }

  const stopEnabled = true;

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${holdProgress.value * 100}%`,
  }));
  const glowProps = useAnimatedProps(() => ({ opacity: glow.value }));

  return (
    <SafeAreaView
      style={styles.root}
      edges={['top', 'left', 'right']}
      {...onboardingSwipe.panHandlers}
    >
      {hasAiApi() && cameraPermission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={styles.hiddenCamera}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />
      ) : null}

        <View style={styles.statusRow}>
          <Pressable
            onPress={handleStatusChipTap}
            accessibilityRole="button"
            accessibilityLabel="Buddy durum çubuğu"
            style={styles.statusChip}
          >
            <PulseDot color={debugMode ? '#FFB377' : colors.status.verified} size={8} />
            <Text style={styles.statusLabel}>{debugMode ? 'DEBUG MODU' : 'BUDDY HAZIR'}</Text>
            <View style={styles.statusDivider} />
            <Text style={styles.statusTime}>12:34</Text>
          </Pressable>
          <View style={styles.statusRight}>
            <Ionicons name="navigate-outline" size={13} color={colors.text.tertiary} />
            <Text style={styles.locText}>ODTÜ Teknokent</Text>
          </View>
        </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Son okunan mesajı tekrarla"
        onPress={replay}
        style={styles.oval}
      >
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          accessible={false}
          importantForAccessibility="no"
        >
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="buddyGlow" cx="50%" cy="40%" r="60%">
                <Stop offset="0%" stopColor="#5BD4B9" stopOpacity="0.22" />
                <Stop offset="60%" stopColor="#5BD4B9" stopOpacity="0.05" />
                <Stop offset="100%" stopColor="#5BD4B9" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <AnimatedRect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="url(#buddyGlow)"
              animatedProps={glowProps}
            />
          </Svg>
        </View>

        {[0, 1, 2].map((i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[styles.ring, { width: 220 + i * 80, height: 220 + i * 80 }]}
          />
        ))}

        <View style={styles.speakingPill}>
          <PulseDot
            color={isSpeaking ? '#5BD4B9' : '#FFB377'}
            size={6}
            duration={1200}
          />
          <Text style={styles.speakingPillText}>
            {isSpeaking ? 'BUDDY KONUŞUYOR' : 'SİZİ DİNLİYOR'}
          </Text>
        </View>

        <View style={styles.waveformWrap} pointerEvents="none">
          <Waveform mode={waveformMode} metering={metering} />
        </View>

        <View
          style={styles.ttsWrap}
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          accessibilityLanguage="tr-TR"
          accessibilityLabel={`Şu an okunuyor: ${lastSpoken}`}
        >
          <Text style={styles.ttsLabel}>ŞU AN OKUNUYOR</Text>
          <Text style={styles.ttsText}>
            {lastSpoken || (voiceEnabled ? 'Dinliyorum…' : '...')}
          </Text>
        </View>

        <View style={styles.ovalFooter} pointerEvents="box-none">
          <View style={styles.askRow}>
            <Ionicons name="ear-outline" size={14} color="rgba(91,212,185,0.75)" />
            <Text style={styles.askText}>Ekrana dokun → tekrar dinle</Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.stopWrap}>
        <Pressable
          disabled={!stopEnabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: !stopEnabled }}
          accessibilityLabel={stopEnabled ? 'Oturumu durdur' : 'Durdur şu an pasif'}
          accessibilityHint="Çıkmak için bir saniye basılı tut"
          onPressIn={stopEnabled ? startHold : undefined}
          onPressOut={stopEnabled ? () => cancelHold(false) : undefined}
          style={({ pressed }) => [
            styles.stopBtn,
            !stopEnabled && styles.stopBtnDisabled,
            pressed && stopEnabled && { opacity: 0.96 },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.stopProgressWrap, progressFillStyle]}
          >
            <View style={styles.stopProgressFill} />
            <View style={styles.stopProgressEdge} />
          </Animated.View>
          <View pointerEvents="none" style={styles.stopRidge} />
          <View style={styles.stopIconWrap}>
            <Ionicons name="stop" size={20} color={stopEnabled ? colors.status.new : colors.text.tertiary} />
          </View>
          <Text style={styles.stopLabel}>DURDUR</Text>
        </Pressable>
        <Text style={styles.stopHint}>
          {stopEnabled ? 'BASILI TUT · TİTREŞİM EŞİĞİ 1SN' : 'OTURUM BAŞLAMADI'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  hiddenCamera: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8,
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1, borderColor: 'rgba(42,157,143,0.35)',
    backgroundColor: 'rgba(42,157,143,0.07)',
  },
  statusLabel: {
    fontFamily: fontFamily.monoBold, fontSize: 11, color: colors.text.primary, letterSpacing: 1.1,
  },
  statusDivider: { width: 1, height: 10, backgroundColor: 'rgba(42,157,143,0.4)' },
  statusTime: {
    fontFamily: fontFamily.monoBold, fontSize: 11.5,
    color: colors.status.verified, letterSpacing: 0.5, fontVariant: ['tabular-nums'],
  },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locText: { fontFamily: fontFamily.body, fontSize: 12, color: colors.text.tertiary },
  oval: {
    marginHorizontal: 16, marginTop: 6, height: 412,
    backgroundColor: colors.bg.deep, borderRadius: 56, overflow: 'hidden', position: 'relative',
    shadowColor: '#11171F', shadowOpacity: 0.4, shadowRadius: 60,
    shadowOffset: { width: 0, height: 24 }, elevation: 12,
  },
  ring: {
    position: 'absolute', top: '50%', left: '50%',
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    transform: [{ translateX: -150 }, { translateY: -150 }],
  },
  speakingPill: {
    position: 'absolute', top: 24, left: 26,
    flexDirection: 'row', alignItems: 'center', gap: 7,
  },
  speakingPillText: {
    fontFamily: fontFamily.monoBold, fontSize: 11, color: '#5BD4B9', letterSpacing: 1.6,
  },
  waveformWrap: { position: 'absolute', top: 78, left: 0, right: 0 },
  ttsWrap: { position: 'absolute', top: 220, left: 28, right: 28 },
  ttsLabel: {
    fontFamily: fontFamily.mono, fontSize: 13,
    color: 'rgba(244,241,235,0.6)', letterSpacing: 1.5, marginBottom: 12,
  },
  ttsText: {
    fontFamily: fontFamily.display, fontSize: 22, lineHeight: 30,
    color: '#F4F1EB', letterSpacing: -0.25,
  },
  ovalFooter: {
    position: 'absolute', bottom: 18, left: 20, right: 20,
  },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  askText: {
    fontFamily: fontFamily.bodyMedium, fontSize: 14,
    color: 'rgba(91,212,185,0.75)', letterSpacing: 0.2,
  },
  stopWrap: { marginTop: 'auto', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 34 },
  stopBtn: {
    width: '100%', height: 96, borderRadius: 24,
    backgroundColor: colors.status.new,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14,
    overflow: 'hidden', position: 'relative',
    shadowColor: colors.status.new, shadowOpacity: 0.45, shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 }, elevation: 10,
  },
  stopBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stopGradientOverlay: {
    position: 'absolute', left: 0, right: 0, top: '38%', bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  stopRidge: {
    position: 'absolute', left: 0, right: 0, top: 0, height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  stopProgressWrap: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    flexDirection: 'row',
  },
  stopProgressFill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.32)' },
  stopProgressEdge: {
    width: 2, backgroundColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#fff', shadowOpacity: 0.8, shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  stopIconWrap: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  stopLabel: {
    fontFamily: fontFamily.displayExtra, fontSize: 26, color: '#fff', letterSpacing: 1.4,
  },
  stopHint: {
    textAlign: 'center', marginTop: 14,
    fontFamily: fontFamily.mono, fontSize: 11,
    color: colors.text.tertiary, letterSpacing: 1.6,
  },
});
