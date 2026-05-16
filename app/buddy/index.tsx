import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily } from '@/theme';

const SPOKEN_TEXT = 'Yaklaşık 5 metre ileride, sağında geniş bir çukur var.';
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

function speakSpokenText() {
  Speech.speak(SPOKEN_TEXT, { language: 'tr-TR', rate: 0.95, pitch: 1.0 });
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function BuddyMain() {
  useKeepAwake();
  const router = useRouter();
  const reset = useUserStore((s) => s.reset);

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

  function stop() {
    Speech.stop();
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
      stop();
    }, HOLD_DURATION_MS);
  }

  function replay() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Speech.stop();
    speakSpokenText();
  }

  useEffect(() => {
    speakSpokenText();
    glow.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      Speech.stop();
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, []);

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${holdProgress.value * 100}%`,
  }));

  const glowProps = useAnimatedProps(() => ({
    opacity: glow.value,
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.statusRow}>
        <View style={styles.statusChip}>
          <PulseDot color={colors.status.verified} size={8} />
          <Text style={styles.statusLabel}>YÜRÜYÜŞ AKTİF</Text>
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
        accessibilityLabel="Son okunan bildirimi tekrarla"
        accessibilityHint="Buddy'nin az önce söylediğini tekrar dinlemek için dokun"
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

        <View
          style={styles.speakingPill}
          accessible={false}
          importantForAccessibility="no"
        >
          <PulseDot color="#5BD4B9" size={6} duration={1200} />
          <Text style={styles.speakingPillText}>BUDDY KONUŞUYOR</Text>
        </View>

        <View
          style={styles.waveformWrap}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Waveform />
        </View>

        <View
          style={styles.ttsWrap}
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          accessibilityLanguage="tr-TR"
          accessibilityLabel={`Şu an okunuyor: ${SPOKEN_TEXT}`}
        >
          <Text style={styles.ttsLabel}>ŞU AN OKUNUYOR</Text>
          <Text style={styles.ttsText}>
            Yaklaşık 5 metre ileride, sağında{' '}
            <Text style={styles.ttsHighlight}>geniş bir çukur</Text> var.
          </Text>
          <View style={styles.ttsMetaRow}>
            <Ionicons name="arrow-forward" size={13} color="rgba(244,241,235,0.55)" />
            <Text style={styles.ttsMeta}>orta öncelik · doğrulanmış pin</Text>
          </View>
        </View>

        <View
          style={styles.ovalFooter}
          accessible={false}
          importantForAccessibility="no"
        >
          <View style={styles.askRow}>
            <Ionicons name="mic-outline" size={14} color="rgba(91,212,185,0.75)" />
            <Text style={styles.askText}>Ekrana dokun → tekrar dinle</Text>
          </View>
          <Text style={styles.askDots}>· · ·</Text>
        </View>
      </Pressable>

      <View style={styles.recentWrap}>
        <Text style={styles.recentLabel}>AZ ÖNCE</Text>
        <View
          style={styles.recentCard}
          accessible
          accessibilityRole="text"
          accessibilityLabel="2 dakika önce: Sarı dokunsal yüzeye girdin, 12 metre."
        >
          <View style={styles.recentIcon}>
            <Ionicons name="grid" size={16} color={colors.status.verified} />
          </View>
          <Text style={styles.recentText}>
            Sarı dokunsal yüzeye girdin, 12 metre.
          </Text>
          <Text style={styles.recentTime}>2 dk önce</Text>
        </View>
      </View>

      <View style={styles.stopWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yürüyüşü durdur"
          accessibilityHint="Yürüyüş modundan çıkmak için bir saniye basılı tut"
          onPressIn={startHold}
          onPressOut={() => cancelHold(false)}
          style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.96 }]}
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
            <Ionicons name="stop" size={20} color={colors.status.new} />
          </View>
          <Text style={styles.stopLabel}>DURDUR</Text>
        </Pressable>
        <Text style={styles.stopHint}>BASILI TUT · TİTREŞİM EŞİĞİ 1SN</Text>
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
  statusDivider: {
    width: 1, height: 10, backgroundColor: 'rgba(42,157,143,0.4)',
  },
  statusTime: {
    fontFamily: fontFamily.monoBold, fontSize: 11.5,
    color: colors.status.verified, letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
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
    fontFamily: fontFamily.display, fontSize: 25, lineHeight: 32,
    color: '#F4F1EB', letterSpacing: -0.25,
  },
  ttsHighlight: {
    color: '#FFB377',
    textShadowColor: 'rgba(244,162,97,0.45)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  ttsMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  ttsMeta: { fontFamily: fontFamily.body, fontSize: 13, color: 'rgba(244,241,235,0.55)' },
  ovalFooter: {
    position: 'absolute', bottom: 18, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  askText: {
    fontFamily: fontFamily.bodyMedium, fontSize: 14,
    color: 'rgba(91,212,185,0.75)', letterSpacing: 0.2,
  },
  askDots: {
    fontFamily: fontFamily.mono, fontSize: 12,
    color: 'rgba(244,241,235,0.45)', letterSpacing: 2,
  },
  recentWrap: { marginHorizontal: 16, marginTop: 14, gap: 8 },
  recentLabel: {
    fontFamily: fontFamily.mono, fontSize: 13,
    color: colors.text.secondary, letterSpacing: 1.6, paddingHorizontal: 4,
  },
  recentCard: {
    backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border.divider,
    borderLeftWidth: 3, borderLeftColor: colors.status.verified,
    borderRadius: 14, paddingVertical: 10, paddingLeft: 14, paddingRight: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  recentIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.status.verified + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  recentText: {
    flex: 1, fontFamily: fontFamily.body, fontSize: 13.5,
    color: colors.text.secondary, lineHeight: 18,
  },
  recentTime: { fontFamily: fontFamily.mono, fontSize: 10.5, color: colors.text.tertiary },
  stopWrap: {
    marginTop: 'auto', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 34,
  },
  stopBtn: {
    width: '100%', height: 96, borderRadius: 24,
    backgroundColor: colors.status.new,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14,
    overflow: 'hidden', position: 'relative',
    shadowColor: colors.status.new, shadowOpacity: 0.45, shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 }, elevation: 10,
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
  stopProgressFill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  stopProgressEdge: {
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
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
