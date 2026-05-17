import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import LottieView from 'lottie-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Wordmark } from '@/components/Wordmark';
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily, spacing } from '@/theme';
import type { UserRole } from '@/types';

const HERO_ANIMATION = require('@/../assets/animations/onboarding-walking.json');

interface Role {
  id: UserRole;
  n: string;
  tone: string;
  meta: string;
  title: string;
  sub: string;
  href: Href;
}

const ROLES: Role[] = [
  {
    id: 'visually_impaired',
    n: '01',
    tone: colors.role.visuallyImpaired,
    meta: 'GÖRME ENGELLİ',
    title: 'Görüyorum,\nduyarak.',
    sub: 'Buddy çevreyi anlatır, sesle soru sorabilirsin.',
    href: '/buddy',
  },
  {
    id: 'volunteer',
    n: '02',
    tone: colors.role.volunteer,
    meta: 'GÖNÜLLÜ',
    title: 'Fark ediyorum,\nbildiriyorum.',
    sub: 'Gördüğün engeli 30 saniyede haritaya işle.',
    href: '/volunteer',
  },
  {
    id: 'company',
    n: '03',
    tone: colors.role.company,
    meta: 'FİRMA · KURUM',
    title: 'Veriyle\nyatırım yapıyorum.',
    sub: 'Doğrulanmış kümeleri ilçe bazında talep et.',
    href: '/company',
  },
];

const ICON_SIZE = 38;
const ICON_STROKE = 2.2;
const ICON_COLOR = 'rgba(255,255,255,0.92)';

function HeadphonesIcon() {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 40 40" fill="none">
      <Path
        d="M 7 23 V 18 A 13 13 0 0 1 33 18 V 23"
        stroke={ICON_COLOR}
        strokeWidth={ICON_STROKE}
        strokeLinecap="round"
        fill="none"
      />
      <Rect
        x={5}
        y={22}
        width={7}
        height={11}
        rx={2.4}
        stroke={ICON_COLOR}
        strokeWidth={ICON_STROKE}
        fill="none"
      />
      <Rect
        x={28}
        y={22}
        width={7}
        height={11}
        rx={2.4}
        stroke={ICON_COLOR}
        strokeWidth={ICON_STROKE}
        fill="none"
      />
    </Svg>
  );
}

function MapPinIcon() {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 40 40" fill="none">
      <Path
        d="M 20 5 Q 31 5 31 16 Q 31 26 20 35 Q 9 26 9 16 Q 9 5 20 5 Z"
        stroke={ICON_COLOR}
        strokeWidth={ICON_STROKE}
        strokeLinejoin="round"
        fill="none"
      />
      <Circle
        cx={20}
        cy={16}
        r={3.6}
        stroke={ICON_COLOR}
        strokeWidth={ICON_STROKE}
        fill="none"
      />
    </Svg>
  );
}

function ChartIcon() {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 40 40" fill="none">
      <Path
        d="M 6 33 H 34"
        stroke={ICON_COLOR}
        strokeWidth={ICON_STROKE}
        strokeLinecap="round"
      />
      <Rect
        x={9}
        y={22}
        width={6}
        height={10}
        rx={1.2}
        stroke={ICON_COLOR}
        strokeWidth={ICON_STROKE}
        fill="none"
      />
      <Rect
        x={17}
        y={14}
        width={6}
        height={18}
        rx={1.2}
        stroke={ICON_COLOR}
        strokeWidth={ICON_STROKE}
        fill="none"
      />
      <Rect
        x={25}
        y={8}
        width={6}
        height={24}
        rx={1.2}
        stroke={ICON_COLOR}
        strokeWidth={ICON_STROKE}
        fill="none"
      />
    </Svg>
  );
}

function RoleIcon({ id }: { id: UserRole }) {
  if (id === 'visually_impaired') return <HeadphonesIcon />;
  if (id === 'volunteer') return <MapPinIcon />;
  return <ChartIcon />;
}

interface RoleCardProps {
  role: Role;
  onPress: () => void;
}

function RoleCard({ role, onPress }: RoleCardProps) {
  const press = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(press.value, [0, 1], [0, -3]) }],
    shadowOpacity: interpolate(press.value, [0, 1], [0.05, 0.18]),
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
      accessibilityLabel={`${role.meta}. ${role.sub}`}
      style={styles.cardPressable}
    >
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={[styles.toneCol, { backgroundColor: role.tone }]}>
          <Text style={styles.toneNumber}>{role.n}</Text>
          <View style={styles.toneIconWrap}>
            <RoleIcon id={role.id} />
          </View>
          <Text style={styles.toneMeta}>{role.meta}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.cardTitle}>{role.title}</Text>
          <Text style={styles.cardSub} numberOfLines={2}>
            {role.sub}
          </Text>
          <Animated.View style={[styles.arrowCorner, arrowStyle]}>
            <Ionicons name="arrow-forward" size={16} color={colors.text.tertiary} />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function Onboarding() {
  const setRole = useUserStore((s) => s.setRole);
  const setOnboardingComplete = useUserStore((s) => s.setOnboardingComplete);
  const router = useRouter();

  function pick(r: Role) {
    setRole(r.id);
    setOnboardingComplete(true);
    router.replace(r.href);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Wordmark step="BAŞLANGIÇ · 1/3" />
      </View>

      <View style={styles.heroBlock}>
        <View style={styles.heroArt}>
          <LottieView
            source={HERO_ANIMATION}
            autoPlay
            loop
            style={styles.heroLottie}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.heroLine}>Hangi tarafından</Text>
        <Text style={[styles.heroLine, styles.heroLineMuted]}>bakıyorsun?</Text>
      </View>

      <View style={styles.cards}>
        {ROLES.map((r) => (
          <RoleCard key={r.id} role={r} onPress={() => pick(r)} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    paddingHorizontal: spacing.s5,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s2,
  },
  heroBlock: {
    paddingHorizontal: spacing.s5,
    paddingTop: spacing.s2,
    paddingBottom: spacing.s4,
  },
  heroArt: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s2,
  },
  heroLottie: {
    width: 200,
    height: 160,
  },
  heroLine: {
    fontFamily: fontFamily.display,
    fontSize: 36,
    lineHeight: 40,
    color: colors.text.primary,
    letterSpacing: -1,
  },
  heroLineMuted: {
    color: colors.text.tertiary,
  },
  cards: {
    flex: 1,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s2,
    paddingBottom: spacing.s4,
    gap: 12,
  },
  cardPressable: {
    flex: 1,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg.elevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.divider,
    overflow: 'hidden',
    shadowColor: '#0B1220',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  toneCol: {
    width: 88,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  toneNumber: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 34,
    color: '#fff',
    letterSpacing: -1.3,
    lineHeight: 34,
  },
  toneIconWrap: {
    alignSelf: 'center',
  },
  toneMeta: {
    fontFamily: fontFamily.mono,
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 1.1,
    lineHeight: 11,
  },
  content: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 44,
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  cardTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.text.primary,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  cardSub: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  arrowCorner: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
