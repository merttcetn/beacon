import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import {
  BUDDY_SCRIPTS,
  SPORT_EQUIPMENTS,
  WALK_DURATIONS,
  type WalkDuration,
} from '@/constants/buddyScripts';
import { speakTts, stopTts } from '@/lib/tts';
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily } from '@/theme';

const HOLD_DURATION_MS = 1000;
const TICK_INTERVAL_MS = 125;
const TICK_PATTERN: Haptics.ImpactFeedbackStyle[] = [
  Haptics.ImpactFeedbackStyle.Rigid,
  Haptics.ImpactFeedbackStyle.Rigid,
  Haptics.ImpactFeedbackStyle.Rigid,
  Haptics.ImpactFeedbackStyle.Heavy,
  Haptics.ImpactFeedbackStyle.Heavy,
  Haptics.ImpactFeedbackStyle.Heavy,
  Haptics.ImpactFeedbackStyle.Heavy,
];

// MOCK STT "dinleme" animasyonu süresi
const MOCK_LISTEN_MS = 1200;

type BuddyScene =
  | { kind: 'mode_select' }
  | { kind: 'walk_duration' }
  | { kind: 'walk_active'; duration: WalkDuration }
  | { kind: 'sport_navigating' }
  | { kind: 'sport_equipment'; index: number }
  | { kind: 'sport_done' };

interface ChoiceChip {
  label: string;
  onPress: () => void;
}

function speak(text: string) {
  void speakTts(text);
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function BuddyMain() {
  useKeepAwake();
  const router = useRouter();
  const reset = useUserStore((s) => s.reset);

  const [scene, setScene] = useState<BuddyScene>({ kind: 'mode_select' });
  const [lastSpoken, setLastSpoken] = useState<string>('');
  const [listening, setListening] = useState(false);
  const listenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdProgress = useSharedValue(0);
  const glow = useSharedValue(0.55);

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

  function stopSession() {
    void stopTts();
    reset();
    router.replace('/onboarding');
  }

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

  function mockListen(then: () => void) {
    if (listening) return;
    void stopTts();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setListening(true);
    if (listenTimer.current) clearTimeout(listenTimer.current);
    listenTimer.current = setTimeout(() => {
      setListening(false);
      then();
    }, MOCK_LISTEN_MS);
  }

  useEffect(() => {
    let text = '';
    if (scene.kind === 'mode_select') text = BUDDY_SCRIPTS.modeQuestion;
    else if (scene.kind === 'walk_duration') text = BUDDY_SCRIPTS.walkDurationQuestion;
    else if (scene.kind === 'walk_active') text = BUDDY_SCRIPTS.walkRouteFound(scene.duration);
    else if (scene.kind === 'sport_navigating') text = BUDDY_SCRIPTS.sportSearching;
    else if (scene.kind === 'sport_equipment') {
      const eq = SPORT_EQUIPMENTS[scene.index];
      text = scene.index === 0
        ? `${BUDDY_SCRIPTS.sportArrived} ${eq.speakText}`
        : `${BUDDY_SCRIPTS.sportNextCue} ${eq.speakText}`;
    }
    else if (scene.kind === 'sport_done') text = BUDDY_SCRIPTS.sportDone;

    if (text) {
      setLastSpoken(text);
      speak(text);
    }
  }, [scene]);

  useEffect(() => {
    if (scene.kind !== 'walk_active') return;
    let i = 0;
    const id = setInterval(() => {
      const warnings = BUDDY_SCRIPTS.walkWarnings;
      const text = warnings[i % warnings.length];
      i += 1;
      setLastSpoken(text);
      speak(text);
    }, 8000);
    return () => clearInterval(id);
  }, [scene]);

  useEffect(() => {
    if (scene.kind !== 'sport_navigating') return;
    const id = setTimeout(() => {
      setScene({ kind: 'sport_equipment', index: 0 });
    }, 6000);
    return () => clearTimeout(id);
  }, [scene]);

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
      if (listenTimer.current) clearTimeout(listenTimer.current);
    };
  }, []);

  function replay() {
    if (!lastSpoken) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    speak(lastSpoken);
  }

  const choices: ChoiceChip[] = (() => {
    if (listening) return [];
    if (scene.kind === 'mode_select') {
      return [
        { label: '1 · Spor', onPress: () => mockListen(() => setScene({ kind: 'sport_navigating' })) },
        { label: '2 · Yürüyüş', onPress: () => mockListen(() => setScene({ kind: 'walk_duration' })) },
      ];
    }
    if (scene.kind === 'walk_duration') {
      return WALK_DURATIONS.map((d) => ({
        label: `${d} dk`,
        onPress: () => mockListen(() => setScene({ kind: 'walk_active', duration: d })),
      }));
    }
    if (scene.kind === 'sport_equipment') {
      const next = scene.index + 1;
      const goNext = next >= SPORT_EQUIPMENTS.length
        ? () => setScene({ kind: 'sport_done' })
        : () => setScene({ kind: 'sport_equipment', index: next });
      return [
        { label: 'Sıradaki hareket', onPress: () => mockListen(goNext) },
      ];
    }
    return [];
  })();

  const stopEnabled = scene.kind !== 'mode_select' && scene.kind !== 'walk_duration';

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${holdProgress.value * 100}%`,
  }));
  const glowProps = useAnimatedProps(() => ({ opacity: glow.value }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.statusRow}>
        <View style={styles.statusChip}>
          <PulseDot color={colors.status.verified} size={8} />
          <Text style={styles.statusLabel}>BUDDY HAZIR</Text>
          <View style={styles.statusDivider} />
          <Text style={styles.statusTime}>12:34</Text>
        </View>
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
          <PulseDot color={listening ? '#FFB377' : '#5BD4B9'} size={6} duration={1200} />
          <Text style={styles.speakingPillText}>
            {listening ? 'DİNLENİYOR' : 'BUDDY KONUŞUYOR'}
          </Text>
        </View>

        <View style={styles.waveformWrap} pointerEvents="none">
          <Waveform />
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
            {lastSpoken || (listening ? 'Dinliyorum…' : '...')}
          </Text>
        </View>

        <View style={styles.ovalFooter} pointerEvents="box-none">
          {choices.length > 0 ? (
            <View style={styles.chipRow}>
              {choices.map((c) => (
                <Pressable
                  key={c.label}
                  onPress={c.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={`Sesli yanıt: ${c.label}`}
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="mic-outline" size={13} color="#5BD4B9" />
                  <Text style={styles.chipText}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.askRow}>
              <Ionicons name="ear-outline" size={14} color="rgba(91,212,185,0.75)" />
              <Text style={styles.askText}>Ekrana dokun → tekrar dinle</Text>
            </View>
          )}
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
          <View pointerEvents="none" style={styles.stopGradientOverlay} />
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
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1, borderColor: 'rgba(91,212,185,0.45)',
    backgroundColor: 'rgba(91,212,185,0.08)',
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium, fontSize: 13.5,
    color: '#F4F1EB', letterSpacing: 0.2,
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
