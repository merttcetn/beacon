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
import { PulseDot } from '@/components/PulseDot';
import { Wordmark } from '@/components/Wordmark';
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily, spacing } from '@/theme';
import type { UserRole } from '@/types';

const BUDDY_DIAMETER = 272;
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
  n: string;
  meta: string;
  title: string;
  sub: string;
  tone: string;
  href: Href;
}

const VOLUNTEER_ROLE: SecondaryRole = {
  id: 'volunteer',
  n: '02',
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
  const buttonRef = useRef<View>(null);

  useEffect(() => {
    mount.value = withTiming(1, { duration: 360 });
    glow.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    const t = setTimeout(() => {
      const node = buttonRef.current ? findNodeHandle(buttonRef.current) : null;
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 250);
    return () => clearTimeout(t);
  }, [mount, glow]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale:
          interpolate(mount.value, [0, 1], [0.94, 1]) *
          interpolate(press.value, [0, 1], [1, 0.97]),
      },
    ],
    opacity: interpolate(mount.value, [0, 1], [0, 1]),
  }));

  const glowProps = useAnimatedProps(() => ({ opacity: glow.value }));

  return (
    <View style={styles.buddyBlock} pointerEvents="box-none">
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
        accessibilityLabel="Sesle başla. Görme engelli için Buddy modu."
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

          <View style={styles.buddyPill} pointerEvents="none">
            <PulseDot color={BUDDY_ACCENT} size={6} duration={1400} />
            <Text style={styles.buddyPillText}>BUDDY HAZIR</Text>
          </View>

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

      <Text
        style={styles.buddyCaption}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        Görme engelli · Buddy
      </Text>
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
        <View style={[styles.volunteerTone, { backgroundColor: VOLUNTEER_ROLE.tone }]}>
          <Text style={styles.volunteerToneNumber}>{VOLUNTEER_ROLE.n}</Text>
          <MapPinIcon size={26} stroke={2.2} />
        </View>
        <View style={styles.volunteerBody}>
          <Text style={styles.volunteerTitle}>{VOLUNTEER_ROLE.title}</Text>
          <Text style={styles.volunteerSub} numberOfLines={1}>
            {VOLUNTEER_ROLE.sub}
          </Text>
        </View>
        <Animated.View style={[styles.volunteerArrow, arrowStyle]}>
          <Ionicons name="arrow-forward" size={18} color={colors.text.tertiary} />
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

export default function Onboarding() {
  const setRole = useUserStore((s) => s.setRole);
  const setOnboardingComplete = useUserStore((s) => s.setOnboardingComplete);
  const router = useRouter();

  function pick(role: UserRole, href: Href) {
    setRole(role);
    setOnboardingComplete(true);
    router.replace(href);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Wordmark step="BAŞLANGIÇ · 1/3" />
        <FirmaChip onPress={() => pick('company', '/company')} />
      </View>

      <View style={styles.centerArea}>
        <BuddyPrimaryButton onPress={() => pick('visually_impaired', '/buddy')} />
      </View>

      <View style={styles.bottomArea}>
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
    gap: 18,
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
  buddyPill: {
    position: 'absolute',
    top: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  buddyPillText: {
    fontFamily: fontFamily.monoBold,
    fontSize: 10.5,
    color: BUDDY_ACCENT,
    letterSpacing: 1.7,
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
  buddyCaption: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },

  bottomArea: {
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s4,
  },
  volunteerCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.bg.elevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.divider,
    overflow: 'hidden',
    shadowColor: '#0B1220',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    minHeight: 84,
  },
  volunteerTone: {
    width: 72,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  volunteerToneNumber: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 22,
    color: '#fff',
    letterSpacing: -0.8,
    lineHeight: 22,
  },
  volunteerBody: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 40,
    justifyContent: 'center',
    gap: 4,
  },
  volunteerTitle: {
    fontFamily: fontFamily.display,
    fontSize: 17,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  volunteerSub: {
    fontFamily: fontFamily.body,
    fontSize: 12.5,
    color: colors.text.secondary,
    lineHeight: 17,
  },
  volunteerArrow: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
