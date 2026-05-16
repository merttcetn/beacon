import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinDetailMapSvg } from '@/components/mock/PinDetailMapSvg';
import { PulseDot } from '@/components/PulseDot';
import { SAMPLE_TICKETS } from '@/constants/sampleTickets';
import { useTicketStore } from '@/stores/ticketStore';
import { colors, fontFamily, radius, spacing } from '@/theme';

const PHOTO_TAGS = ['Genel kadraj', 'Yakın çekim · sol', 'Yön referansı'];

const AFFECTED = [
  { id: 'wheelchair', label: 'Tekerlekli sandalye', icon: 'accessibility', critical: true },
  { id: 'vi', label: 'Görme engelli', icon: 'eye-off-outline', critical: true },
  { id: 'stroller', label: 'Bebek arabası', icon: 'cart-outline', critical: false },
  { id: 'elderly', label: 'Yaşlı', icon: 'walk-outline', critical: false },
] as const;

export default function PinDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const userTickets = useTicketStore((s) => s.userTickets);
  const ticket =
    userTickets.find((t) => t.id === id) ??
    SAMPLE_TICKETS.find((t) => t.id === id) ??
    SAMPLE_TICKETS[0];

  return (
    <View style={styles.root}>
      {/* Map peek */}
      <View style={styles.peek}>
        <PinDetailMapSvg />
        <View style={styles.peekPinWrap}>
          <View style={styles.peekPinGlow} />
          <View style={styles.peekPin}>
            <Ionicons name="trail-sign" size={20} color={colors.text.primary} />
          </View>
        </View>
        <View style={styles.peekGradient} />
      </View>

      {/* Top buttons */}
      <SafeAreaView edges={['top']} style={styles.topSafe} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color={colors.text.primary} />
          </Pressable>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="share-social-outline" size={17} color={colors.text.primary} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={styles.headerMeta}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {ticket.verification_count} TESPİT · DOĞRULANIYOR
                </Text>
              </View>
              <Text style={styles.ticketId}>#TKT-{ticket.id.slice(-4).toUpperCase()}</Text>
            </View>
            <Text style={styles.title}>Eksik Rampa</Text>
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={13} color={colors.text.tertiary} />
              <Text style={styles.locText}>Çankaya · ODTÜ Teknokent · 1597. Cad.</Text>
              <View style={styles.locDot} />
              <Text style={styles.locTime}>3 saat önce</Text>
            </View>
          </View>

          {/* Photo gallery */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryRow}
          >
            {PHOTO_TAGS.map((tag, i) => (
              <View
                key={tag}
                style={[styles.photoCard, { width: i === 0 ? 220 : 140 }]}
              >
                <View style={styles.photoStripe} />
                <View style={styles.photoCurb} />
                {i === 0 ? (
                  <View style={styles.photoBlurChip}>
                    <PulseDot color={colors.status.verified} size={6} duration={1200} />
                    <Text style={styles.photoBlurText}>Yüz blur</Text>
                  </View>
                ) : null}
                <View style={styles.photoTag}>
                  <Text style={styles.photoTagText}>{tag}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Description */}
          <Text style={styles.description}>
            Sokağın sağ kenarında ~12 cm yükseklik farkı var. Rampa hiç yapılmamış,
            ucundaki bordür tehlikeli.
          </Text>

          {/* Affected */}
          <View>
            <Text style={styles.sectionLabel}>ETKİLENEN KULLANICILAR</Text>
            <View style={styles.chipsWrap}>
              {AFFECTED.map((a) => (
                <View
                  key={a.id}
                  style={[
                    styles.affChip,
                    a.critical
                      ? { backgroundColor: colors.text.primary }
                      : {
                          backgroundColor: colors.bg.secondary,
                          borderWidth: 1,
                          borderColor: colors.border.divider,
                        },
                  ]}
                >
                  <Ionicons
                    name={a.icon}
                    size={14}
                    color={a.critical ? colors.text.inverse : colors.text.primary}
                  />
                  <Text
                    style={[
                      styles.affLabel,
                      { color: a.critical ? colors.text.inverse : colors.text.primary },
                    ]}
                  >
                    {a.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Verification row */}
          <View style={styles.verRow}>
            <View style={styles.avatarStack}>
              {['#5E4FA2', '#2A9D8F', '#1F3A5F'].map((c, i) => (
                <View
                  key={c}
                  style={[
                    styles.miniAvatar,
                    {
                      backgroundColor: c,
                      marginLeft: i === 0 ? 0 : -10,
                    },
                  ]}
                >
                  <Text style={styles.miniAvatarText}>{['M', 'E', 'A'][i]}</Text>
                </View>
              ))}
            </View>
            <View style={styles.verText}>
              <Text style={styles.verTitle}>2 kullanıcı doğruladı</Text>
              <Text style={styles.verSub}>1 onay daha eksik · firma bildirimi gelir</Text>
            </View>
            <View style={styles.verDots}>
              <View style={[styles.verDot, { backgroundColor: colors.status.verified }]} />
              <View style={[styles.verDot, { backgroundColor: colors.status.verified }]} />
              <View
                style={[
                  styles.verDot,
                  {
                    backgroundColor: colors.border.default,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.status.partial,
                  },
                ]}
              />
            </View>
          </View>
        </ScrollView>

        {/* Sticky actions */}
        <SafeAreaView edges={['bottom']} style={styles.actionsSafe}>
          <View style={styles.actionsRow}>
            <Pressable style={[styles.actionBtn, styles.actionPrimary]}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.actionPrimaryText}>Ben de gördüm</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.actionSecondary]}>
              <Ionicons name="close" size={16} color={colors.text.primary} />
              <Text style={styles.actionSecondaryText}>Artık yok</Text>
            </Pressable>
            <Pressable style={styles.actionUnknown}>
              <Text style={styles.actionUnknownText}>?</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },

  peek: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 260,
  },
  peekPinWrap: {
    position: 'absolute', top: 110, left: '50%',
    marginLeft: -22,
  },
  peekPinGlow: {
    position: 'absolute', top: -10, left: -10,
    width: 64, height: 64, borderRadius: 99,
    backgroundColor: colors.status.partial, opacity: 0.18,
  },
  peekPin: {
    width: 44, height: 44, borderRadius: 99,
    backgroundColor: colors.severity.medium,
    borderWidth: 4, borderColor: colors.status.partial,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 }, elevation: 6,
  },
  peekGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 100,
    backgroundColor: colors.bg.primary, opacity: 0.7,
  },

  topSafe: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16 },
  topRow: {
    marginTop: spacing.s2,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },

  sheet: {
    position: 'absolute', top: 220, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#1A1D24', shadowOpacity: 0.18, shadowRadius: 40,
    shadowOffset: { width: 0, height: -20 }, elevation: 12,
  },
  handleWrap: { alignItems: 'center', paddingTop: 10 },
  handle: { width: 38, height: 5, borderRadius: 99, backgroundColor: colors.border.default },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, gap: 14 },

  headerBlock: { gap: 6 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5,
    backgroundColor: colors.status.partial + '20',
  },
  statusBadgeText: {
    fontFamily: fontFamily.bodyBold, fontSize: 10.5,
    color: colors.status.partial, letterSpacing: 1.2,
  },
  ticketId: { fontFamily: fontFamily.mono, fontSize: 10.5, color: colors.text.tertiary },
  title: {
    fontFamily: fontFamily.display, fontSize: 24, lineHeight: 28,
    color: colors.text.primary, letterSpacing: -0.25,
  },
  locRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
  },
  locText: { fontFamily: fontFamily.body, fontSize: 13, color: colors.text.secondary },
  locDot: {
    width: 3, height: 3, borderRadius: 99, backgroundColor: colors.text.tertiary,
    marginHorizontal: 2,
  },
  locTime: { fontFamily: fontFamily.body, fontSize: 13, color: colors.text.tertiary },

  galleryRow: { gap: 8 },
  photoCard: {
    height: 140, borderRadius: 14,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.divider,
    overflow: 'hidden', position: 'relative',
  },
  photoStripe: { flex: 1, backgroundColor: '#E8E2D2' },
  photoCurb: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 60,
    backgroundColor: '#9F9785', opacity: 0.6,
  },
  photoBlurChip: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(250,247,242,0.92)',
  },
  photoBlurText: { fontFamily: fontFamily.mono, fontSize: 10, color: colors.text.primary },
  photoTag: {
    position: 'absolute', left: 8, bottom: 8,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(26,29,36,0.72)',
  },
  photoTagText: { fontFamily: fontFamily.mono, fontSize: 10.5, color: '#fff' },

  description: {
    fontFamily: fontFamily.body, fontSize: 14.5, lineHeight: 21,
    color: colors.text.primary,
  },

  sectionLabel: {
    fontFamily: fontFamily.mono, fontSize: 11,
    color: colors.text.tertiary, letterSpacing: 1.3, marginBottom: 8,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  affChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99,
  },
  affLabel: { fontFamily: fontFamily.bodyMedium, fontSize: 12.5 },

  verRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.divider,
  },
  avatarStack: { flexDirection: 'row' },
  miniAvatar: {
    width: 28, height: 28, borderRadius: 99,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg.secondary,
  },
  miniAvatarText: { fontFamily: fontFamily.displayExtra, fontSize: 11, color: '#fff' },
  verText: { flex: 1 },
  verTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: 13.5, color: colors.text.primary },
  verSub: { fontFamily: fontFamily.body, fontSize: 11.5, color: colors.text.secondary, marginTop: 2 },
  verDots: { flexDirection: 'row', gap: 4 },
  verDot: { width: 8, height: 8, borderRadius: 99 },

  actionsSafe: {
    backgroundColor: colors.bg.elevated,
    borderTopWidth: 1, borderTopColor: colors.border.divider,
  },
  actionsRow: {
    flexDirection: 'row', gap: 8, padding: 16, paddingTop: 14,
  },
  actionBtn: {
    height: 54, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  actionPrimary: {
    flex: 1.4, backgroundColor: colors.status.verified,
    shadowColor: colors.status.verified, shadowOpacity: 0.5, shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 }, elevation: 5,
  },
  actionPrimaryText: {
    fontFamily: fontFamily.display, fontSize: 15, color: '#fff',
  },
  actionSecondary: {
    flex: 1, backgroundColor: colors.bg.elevated,
    borderWidth: 1.5, borderColor: colors.border.default,
  },
  actionSecondaryText: {
    fontFamily: fontFamily.bodySemiBold, fontSize: 13.5, color: colors.text.primary,
  },
  actionUnknown: {
    width: 54, height: 54, borderRadius: 14,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1.5, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  actionUnknownText: {
    fontFamily: fontFamily.displayExtra, fontSize: 22, color: colors.text.tertiary,
  },
});
