import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Wordmark } from '@/components/Wordmark';
import { speakTts, stopTts } from '@/lib/tts';
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily, spacing } from '@/theme';
import type { UserRole } from '@/types';

const GREETING =
  'Hoşgeldin, yürümeye başlamak için ekranın ortasına dokunabilirsin!';
const GREETING_DISPLAY = 'Hoşgeldin,';
const GREETING_DELAY_MS = 600;

const BUDDY_DIAMETER = 272;
const ORBIT_INSET = 14;
const ORBIT_SIZE = BUDDY_DIAMETER + ORBIT_INSET * 2;
const RING_BASE = 188;
const RING_STEP = 64;
const ICON_COLOR_LIGHT = 'rgba(255,255,255,0.92)';
const BUDDY_ACCENT = '#5BD4B9';

const HERO_ANIMATION = require('@/../assets/animations/onboarding-walking.json');

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function MapPinIcon({ size = 26, stroke = 2.2, color = ICON_COLOR_LIGHT }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path
        d="M 20 5 Q 31 5 31 16 Q 31 26 20 35 Q 9 26 9 16 Q 9 5 20 5 Z"
        stroke={color}
        strokeWidth={stroke}
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={20} cy={16} r={3.6} stroke={color} strokeWidth={stroke} fill="none" />
    </Svg>
  );
}

interface SecondaryRole {
  id: UserRole;
  meta: string;
  title: string;
  sub: string;
  tone: string;
  href: Href;
}

const VOLUNTEER_ROLE: SecondaryRole = {
  id: 'volunteer',
  meta: 'GÖNÜLLÜ',
  title: 'Gönüllü olarak başla',
  sub: 'Gördüğün engeli 30 saniyede haritaya işle.',
  tone: colors.role.volunteer,
  href: '/volunteer',
};

function BuddyPrimaryButton({ onPress }: { onPress: () => void }) {
  const press = useSharedValue(0);
  const mount = useSharedValue(0);
  const glow = useSharedValue(0.55);
  const orbit = useSharedValue(0);
  const buttonRef = useRef<View>(null);

  useEffect(() => {
    mount.value = withTiming(1, { duration: 540, easing: Easing.out(Easing.cubic) });
    glow.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    orbit.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
    const t = setTimeout(() => {
      const node = buttonRef.current ? findNodeHandle(buttonRef.current) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 250);
    return () => clearTimeout(t);
  }, [mount, glow, orbit]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale:
          interpolate(mount.value, [0, 1], [0.92, 1]) *
          interpolate(press.value, [0, 1], [1, 0.97]),
      },
    ],
    opacity: interpolate(mount.value, [0, 1], [0, 1]),
  }));

  const glowProps = useAnimatedProps(() => ({ opacity: glow.value }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value * 360}deg` }],
    opacity: interpolate(mount.value, [0, 1], [0, 1]),
  }));

  const orbitRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(mount.value, [0, 1], [0, 0.9]),
  }));

  const indexStyle = useAnimatedStyle(() => ({
    opacity: interpolate(mount.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(mount.value, [0, 1], [-6, 0]) }],
  }));

  return (
    <View style={styles.buddyBlock} pointerEvents="box-none">
      <Animated.View style={[styles.buddyCaption, indexStyle]} pointerEvents="none">
        <Text style={styles.captionText}>{GREETING_DISPLAY}</Text>
      </Animated.View>

      <View style={styles.buddyStage} pointerEvents="box-none">
        <Animated.View style={[styles.orbitRing, orbitRingStyle]} pointerEvents="none" />

        <Animated.View style={[styles.orbitWrap, orbitStyle]} pointerEvents="none">
          <View style={styles.orbitDotHalo}>
            <View style={styles.orbitDotCore} />
          </View>
        </Animated.View>

        <Pressable
          ref={buttonRef}
          onPress={onPress}
          onPressIn={() => {
            press.value = withTiming(1, { duration: 120 });
          }}
          onPressOut={() => {
            press.value = withTiming(0, { duration: 220 });
          }}
          accessibilityRole="button"
          accessibilityLabel="Sesle başla."
          accessibilityHint="Buddy ekranını açar, çevreni sesle anlatır."
          hitSlop={20}
          style={styles.buddyHitArea}
        >
          <Animated.View style={[styles.buddyCircle, circleStyle]}>
            <View
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              accessible={false}
              importantForAccessibility="no"
            >
              <Svg width="100%" height="100%">
                <Defs>
                  <RadialGradient id="onboardingBuddyGlow" cx="50%" cy="42%" r="60%">
                    <Stop offset="0%" stopColor={BUDDY_ACCENT} stopOpacity="0.26" />
                    <Stop offset="60%" stopColor={BUDDY_ACCENT} stopOpacity="0.06" />
                    <Stop offset="100%" stopColor={BUDDY_ACCENT} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <AnimatedRect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="url(#onboardingBuddyGlow)"
                  animatedProps={glowProps}
                />
              </Svg>
            </View>

            {[0, 1, 2].map((i) => {
              const size = RING_BASE + i * RING_STEP;
              return (
                <View
                  key={i}
                  pointerEvents="none"
                  style={[
                    styles.buddyRing,
                    {
                      width: size,
                      height: size,
                      marginLeft: -size / 2,
                      marginTop: -size / 2,
                      opacity: 1 - i * 0.25,
                    },
                  ]}
                />
              );
            })}

            <View style={styles.buddyIconWrap} pointerEvents="none">
              <LottieView
                source={HERO_ANIMATION}
                autoPlay
                loop
                style={styles.buddyLottie}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.buddyLabel}>Sesle başla</Text>

            <View style={styles.buddyHintRow} pointerEvents="none">
              <Ionicons name="hand-left-outline" size={12} color="rgba(91,212,185,0.78)" />
              <Text style={styles.buddyHintText}>Dokun, başlasın</Text>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

function VolunteerCard({ onPress }: { onPress: () => void }) {
  const press = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(press.value, [0, 1], [0, -2]) }],
    shadowOpacity: interpolate(press.value, [0, 1], [0.05, 0.16]),
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(press.value, [0, 1], [0, 5]) }],
    opacity: interpolate(press.value, [0, 1], [0.75, 1]),
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 140 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 220 });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${VOLUNTEER_ROLE.meta}. ${VOLUNTEER_ROLE.sub}`}
    >
      <Animated.View style={[styles.volunteerCard, cardStyle]}>
        <View style={styles.volunteerBody}>
          <View style={styles.volunteerMetaRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={12}
              color={VOLUNTEER_ROLE.tone}
              style={styles.volunteerMetaIcon}
            />
            <Text style={[styles.volunteerMeta, { color: VOLUNTEER_ROLE.tone }]}>
              {VOLUNTEER_ROLE.meta}
            </Text>
          </View>
          <Text style={styles.volunteerTitle}>{VOLUNTEER_ROLE.title}</Text>
          <Text style={styles.volunteerSub} numberOfLines={1}>
            {VOLUNTEER_ROLE.sub}
          </Text>
        </View>
        <Animated.View style={[styles.volunteerArrow, arrowStyle]}>
          <Ionicons name="arrow-forward" size={15} color={colors.text.secondary} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function FirmaChip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Firma olarak gir"
      style={({ pressed }) => [styles.firmaChip, pressed && styles.firmaChipPressed]}
      hitSlop={10}
    >
      <Text style={styles.firmaChipText}>Firma</Text>
      <Ionicons name="chevron-forward" size={13} color={colors.text.secondary} />
    </Pressable>
  );
}

function Atmosphere() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="onboardingAtmosphereTop" cx="50%" cy="22%" r="68%">
            <Stop offset="0%" stopColor={BUDDY_ACCENT} stopOpacity="0.10" />
            <Stop offset="55%" stopColor={BUDDY_ACCENT} stopOpacity="0.02" />
            <Stop offset="100%" stopColor={BUDDY_ACCENT} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="onboardingAtmosphereFloor" cx="50%" cy="100%" r="60%">
            <Stop offset="0%" stopColor="#0B1220" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#0B1220" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#onboardingAtmosphereTop)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#onboardingAtmosphereFloor)" />
      </Svg>
    </View>
  );
}

export default function Onboarding() {
  const setRole = useUserStore((s) => s.setRole);
  const setOnboardingComplete = useUserStore((s) => s.setOnboardingComplete);
  const router = useRouter();
  const greetedRef = useRef(false);

  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const t = setTimeout(() => {
      void speakTts(GREETING);
    }, GREETING_DELAY_MS);
    return () => {
      clearTimeout(t);
      void stopTts();
    };
  }, []);

  function pick(role: UserRole, href: Href) {
    void stopTts();
    setRole(role);
    setOnboardingComplete(true);
    router.replace(href);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <Atmosphere />

      <View style={styles.header}>
        <Wordmark />
        <FirmaChip onPress={() => pick('company', '/company')} />
      </View>

      <View style={styles.centerArea}>
        <BuddyPrimaryButton onPress={() => pick('visually_impaired', '/buddy')} />
      </View>

      <View style={styles.bottomArea}>
        <View style={styles.divider} pointerEvents="none">
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>VEYA</Text>
          <View style={styles.dividerLine} />
        </View>
        <VolunteerCard onPress={() => pick('volunteer', '/volunteer')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s5,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s2,
  },
  firmaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 14,
    paddingRight: 10,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
  firmaChipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  firmaChipText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.text.secondary,
    letterSpacing: 0.2,
  },

  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s5,
  },
  buddyBlock: {
    alignItems: 'center',
    gap: 22,
  },
  buddyCaption: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  captionText: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 26,
    lineHeight: 30,
    color: colors.text.primary,
    letterSpacing: -0.6,
    textAlign: 'center',
  },

  buddyStage: {
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRing: {
    position: 'absolute',
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    borderRadius: ORBIT_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91,212,185,0.22)',
    borderStyle: 'dashed',
  },
  orbitWrap: {
    position: 'absolute',
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    alignItems: 'center',
  },
  orbitDotHalo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(91,212,185,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -5,
  },
  orbitDotCore: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: BUDDY_ACCENT,
    shadowColor: BUDDY_ACCENT,
    shadowOpacity: 0.85,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  buddyHitArea: {
    width: BUDDY_DIAMETER,
    height: BUDDY_DIAMETER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyCircle: {
    width: BUDDY_DIAMETER,
    height: BUDDY_DIAMETER,
    borderRadius: BUDDY_DIAMETER / 2,
    backgroundColor: colors.bg.deep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0B1220',
    shadowOpacity: 0.45,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
  buddyRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  buddyIconWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  buddyLottie: {
    width: 140,
    height: 140,
  },
  buddyLabel: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    color: '#F4F1EB',
    letterSpacing: -0.5,
  },
  buddyHintRow: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buddyHintText: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: 'rgba(91,212,185,0.78)',
    letterSpacing: 0.8,
  },

  bottomArea: {
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s4,
    gap: spacing.s3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.s2,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.divider,
  },
  dividerText: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 2.4,
  },
  volunteerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.divider,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 42,
    minHeight: 68,
    shadowColor: '#0B1220',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  volunteerBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  volunteerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  volunteerMetaIcon: {
    opacity: 0.9,
  },
  volunteerMeta: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    letterSpacing: 1.8,
  },
  volunteerTitle: {
    fontFamily: fontFamily.display,
    fontSize: 16,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  volunteerSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.text.tertiary,
    lineHeight: 16,
  },
  volunteerArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
