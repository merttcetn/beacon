import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wordmark } from '@/components/Wordmark';
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily, radius, spacing } from '@/theme';
import type { UserRole } from '@/types';

interface Role {
  id: UserRole;
  n: string;
  tone: string;
  meta: string;
  title: string;
  sub: string;
  bullets: string[];
  href: Href;
}

const ROLES: Role[] = [
  {
    id: 'visually_impaired',
    n: '01',
    tone: colors.role.visuallyImpaired,
    meta: 'GÖRME ENGELLİ',
    title: 'Görüyorum,\nduyarak.',
    sub: 'Buddy yürürken çevreyi anlatır, sesle soru sorabilirsin.',
    bullets: ['kulaklık + ses', 'tek tap soru-cevap', 'kritik uyarı önceliği'],
    href: '/buddy',
  },
  {
    id: 'volunteer',
    n: '02',
    tone: colors.role.volunteer,
    meta: 'GÖNÜLLÜ',
    title: 'Fark ediyorum,\nbildiriyorum.',
    sub: 'Yürürken bir engel mi gördün — 30 saniyede haritaya işle.',
    bullets: ['foto + konum', 'eğitici mikro içerik', 'doğrulama akışı'],
    href: '/volunteer',
  },
  {
    id: 'company',
    n: '03',
    tone: colors.role.company,
    meta: 'FİRMA · KURUM',
    title: 'Veriyle\nyatırım yapıyorum.',
    sub: 'Doğrulanmış kümeleri ilçe ve kategori bazında talep et.',
    bullets: ['ısı haritası', '≥3 doğrulama filtresi', 'küme bazlı talep'],
    href: '/company',
  },
];

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

      <View style={styles.hero}>
        <Text style={styles.heroLine}>Hangi tarafından</Text>
        <Text style={[styles.heroLine, { color: colors.text.tertiary }]}>
          bakıyorsun?
        </Text>
      </View>

      <View style={styles.cards}>
        {ROLES.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => pick(r)}
            accessibilityRole="button"
            accessibilityLabel={`${r.meta}. ${r.sub}`}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.toneCol, { backgroundColor: r.tone }]}>
              <Text style={styles.toneNumber}>{r.n}</Text>
              <Text style={styles.toneMeta}>{r.meta}</Text>
              <View style={styles.toneDot} />
            </View>

            <View style={styles.content}>
              <Text style={styles.cardTitle}>{r.title}</Text>
              <Text style={styles.cardSub}>{r.sub}</Text>
              <View style={styles.bullets}>
                {r.bullets.map((b) => (
                  <View key={b} style={styles.bulletItem}>
                    <View style={[styles.bulletDot, { backgroundColor: r.tone }]} />
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.arrowCorner}>
                <Ionicons name="arrow-forward" size={14} color={colors.text.primary} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerCheck}>
          <Ionicons name="checkmark" size={12} color={colors.text.inverse} />
        </View>
        <Text style={styles.footerText}>
          VoiceOver açık · Tüm ekranlar{' '}
          <Text style={styles.footerStrong}>AAA</Text> kontrast · Görseller AI eğitiminde
          kullanılmaz
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    paddingHorizontal: spacing.s5, paddingTop: spacing.s4, paddingBottom: spacing.s2,
  },
  hero: {
    paddingHorizontal: spacing.s5, paddingTop: spacing.s4, paddingBottom: spacing.s2,
  },
  heroLine: {
    fontFamily: fontFamily.display, fontSize: 36, lineHeight: 38,
    color: colors.text.primary, letterSpacing: -1,
  },
  cards: {
    flex: 1, paddingHorizontal: spacing.s4,
    paddingTop: spacing.s3, paddingBottom: spacing.s2, gap: 10,
  },
  card: {
    flex: 1, flexDirection: 'row',
    backgroundColor: colors.bg.elevated, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden',
  },
  toneCol: {
    width: 78, padding: 14,
    justifyContent: 'space-between', position: 'relative',
  },
  toneNumber: {
    fontFamily: fontFamily.displayExtra, fontSize: 40,
    color: '#fff', letterSpacing: -1.6, lineHeight: 40,
  },
  toneMeta: {
    fontFamily: fontFamily.mono, fontSize: 8,
    color: 'rgba(255,255,255,0.7)', letterSpacing: 1,
    position: 'absolute', bottom: 30, left: 14, width: 60,
  },
  toneDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.35)' },
  content: { flex: 1, padding: 14, gap: 8, position: 'relative' },
  cardTitle: {
    fontFamily: fontFamily.display, fontSize: 19,
    color: colors.text.primary, letterSpacing: -0.4, lineHeight: 21,
  },
  cardSub: { fontFamily: fontFamily.body, fontSize: 12.5, color: colors.text.secondary, lineHeight: 17 },
  bullets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  bulletItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bulletDot: { width: 3, height: 3, borderRadius: 99 },
  bulletText: {
    fontFamily: fontFamily.mono, fontSize: 10.5,
    color: colors.text.tertiary, letterSpacing: 0.2,
  },
  arrowCorner: {
    position: 'absolute', right: 12, bottom: 12,
    width: 28, height: 28, borderRadius: 99,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.divider,
    alignItems: 'center', justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: spacing.s5, marginBottom: spacing.s4,
    padding: 12, borderRadius: radius.md,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.divider,
  },
  footerCheck: {
    width: 20, height: 20, borderRadius: 5,
    backgroundColor: colors.text.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  footerText: {
    flex: 1, fontFamily: fontFamily.body, fontSize: 12,
    color: colors.text.secondary, lineHeight: 16,
  },
  footerStrong: { fontFamily: fontFamily.bodyBold, color: colors.text.primary },
});
