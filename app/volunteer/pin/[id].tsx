import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loader } from '@/components/Loader';
import { useTickets } from '@/lib/tickets';
import { colors, fontFamily } from '@/theme';
import type { AffectedUser, Ticket } from '@/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ISSUE_LABEL: Record<Ticket['issue_type'], string> = {
  pothole: 'Çukur',
  missing_ramp: 'Eksik rampa',
  missing_tactile_paving: 'Eksik dokunsal yüzey',
  obstacle: 'Engel',
  uneven_surface: 'Bozuk zemin',
  water_pooling: 'Su birikintisi',
  narrow_passage: 'Dar geçiş',
  damaged_equipment: 'Bozuk ekipman',
  other: 'Diğer',
};

const AFFECTED_LABEL: Record<AffectedUser, string> = {
  wheelchair: 'Tekerlekli sandalye',
  visually_impaired: 'Görme engelli',
  stroller: 'Bebek arabası',
  elderly: 'Yaşlı',
};

const AFFECTED_ICON: Record<AffectedUser, IconName> = {
  wheelchair: 'accessibility',
  visually_impaired: 'eye-off-outline',
  stroller: 'cart-outline',
  elderly: 'walk-outline',
};

const CRITICAL_AFFECTED: AffectedUser[] = ['wheelchair', 'visually_impaired'];

function pinColor(verified: boolean, count: number) {
  if (verified || count >= 3) return colors.status.verified;
  if (count === 2) return colors.status.partial;
  return colors.status.new;
}

function statusLabel(verified: boolean, count: number) {
  if (verified) return 'DOĞRULANDI';
  if (count >= 3) return 'EŞİĞE ULAŞTI';
  if (count === 2) return 'DOĞRULANIYOR';
  if (count === 1) return 'TEK TESPİT';
  return 'YENİ';
}

function heroPhotoUri(ticket: Ticket): string {
  if (ticket.photo_urls.length > 0) return ticket.photo_urls[0];
  // MOCK: demo için ticket id'ye göre deterministic placeholder
  return `https://picsum.photos/seed/${encodeURIComponent(ticket.id)}/900/640`;
}

export default function PinDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: tickets, isLoading } = useTickets();
  const ticket = (tickets ?? []).find((t) => t.id === id) ?? (tickets ?? [])[0];

  if (!ticket) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.topSafe} pointerEvents="box-none">
          <View style={styles.topRow}>
            <Pressable
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Geri"
            >
              <Ionicons name="chevron-back" size={18} color={colors.text.primary} />
            </Pressable>
          </View>
        </SafeAreaView>
        <Loader caption={isLoading ? 'Ticket yükleniyor' : 'Ticket bulunamadı'} />
      </View>
    );
  }

  const color = pinColor(ticket.verified, ticket.verification_count);
  const status = statusLabel(ticket.verified, ticket.verification_count);
  const remaining = Math.max(0, 3 - ticket.verification_count);
  const progress = Math.min(1, ticket.verification_count / 3);
  const avatarPalette = ['#5E4FA2', '#2A9D8F', '#1F3A5F'];
  const avatarLetters = ['M', 'E', 'A'];
  const shownAvatars = Math.min(3, Math.max(1, ticket.verification_count));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero photo */}
        <View style={styles.hero}>
          <ExpoImage
            source={{ uri: heroPhotoUri(ticket) }}
            style={styles.heroImage}
            contentFit="cover"
            transition={220}
          />

          {/* Sol-alt: foto tag */}
          <View style={styles.heroPhotoTag}>
            <Text style={styles.heroPhotoTagText}>YÖN REFERANSI · 1/1</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentPad}>
          <View style={styles.headerMeta}>
            <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
              <View style={[styles.statusBadgeDot, { backgroundColor: color }]} />
              <Text style={[styles.statusBadgeText, { color }]}>
                {ticket.verification_count} TESPİT · {status}
              </Text>
            </View>
            <Text style={styles.ticketId}>
              #TKT-{ticket.id.slice(-4).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.title}>{ISSUE_LABEL[ticket.issue_type]}</Text>

          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={13} color={colors.text.tertiary} />
            <Text style={styles.locText} numberOfLines={1}>
              Çankaya · ODTÜ Teknokent · 1597. Cad.
            </Text>
            <View style={styles.locDot} />
            <Text style={styles.locTime}>3 saat önce</Text>
          </View>

          <Text style={styles.description}>{ticket.description_tr}</Text>

          {/* Affected users */}
          {ticket.affected_users.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ETKİLENEN KULLANICILAR</Text>
              <View style={styles.chipsWrap}>
                {ticket.affected_users.map((u) => {
                  const critical = CRITICAL_AFFECTED.includes(u);
                  return (
                    <View
                      key={u}
                      style={[
                        styles.affChip,
                        critical ? styles.affChipCritical : styles.affChipNormal,
                      ]}
                    >
                      <Ionicons
                        name={AFFECTED_ICON[u]}
                        size={14}
                        color={critical ? colors.text.inverse : colors.text.primary}
                      />
                      <Text
                        style={[
                          styles.affLabel,
                          { color: critical ? colors.text.inverse : colors.text.primary },
                        ]}
                      >
                        {AFFECTED_LABEL[u]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Verification card */}
          <View style={styles.verCard}>
            <View style={styles.verHeader}>
              <View style={styles.avatarStack}>
                {Array.from({ length: shownAvatars }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.miniAvatar,
                      {
                        backgroundColor: avatarPalette[i % avatarPalette.length],
                        marginLeft: i === 0 ? 0 : -10,
                      },
                    ]}
                  >
                    <Text style={styles.miniAvatarText}>{avatarLetters[i % avatarLetters.length]}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.verHeaderText}>
                <Text style={styles.verTitle}>
                  {ticket.verification_count} kullanıcı doğruladı
                </Text>
                <Text style={styles.verSub}>
                  {remaining > 0
                    ? `${remaining} onay daha eksik · firma bildirimi tetiklenir`
                    : 'Eşik tamamlandı · firma bildirildi'}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%`, backgroundColor: color },
                ]}
              />
            </View>

            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelText}>0</Text>
              <Text style={styles.progressLabelText}>EŞİK · 3</Text>
            </View>
          </View>

          {/* Inline bottom actions */}
          <View style={styles.actionsRow}>
            <Pressable style={({ pressed }) => [
              styles.actionBtn,
              styles.actionSecondary,
              pressed && { backgroundColor: colors.bg.secondary },
            ]}>
              <Ionicons name="close" size={16} color={colors.text.primary} />
              <Text style={styles.actionSecondaryText}>Artık yok</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [
              styles.actionBtn,
              styles.actionPrimary,
              pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
            ]}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.actionPrimaryText}>Ben de gördüm</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Top floating buttons */}
      <SafeAreaView edges={['top']} style={styles.topSafe} pointerEvents="box-none">
        <View style={styles.topRow}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Geri"
          >
            <Ionicons name="chevron-back" size={18} color={colors.text.primary} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const HERO_HEIGHT = 360;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },

  scroll: {
    paddingBottom: 32,
  },

  hero: {
    width: '100%',
    height: HERO_HEIGHT,
    backgroundColor: colors.bg.secondary,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroPhotoTag: {
    position: 'absolute',
    left: 16,
    bottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(17,23,31,0.78)',
  },
  heroPhotoTagText: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: '#fff',
    letterSpacing: 1.2,
  },

  topSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 5,
  },
  topRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(250,247,242,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(26,29,36,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1D24',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  iconBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },

  contentPad: {
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 14,
  },

  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  statusBadgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
  },
  ticketId: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.text.tertiary,
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 28,
    lineHeight: 32,
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginTop: -2,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  locText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.text.secondary,
    flexShrink: 1,
  },
  locDot: {
    width: 3,
    height: 3,
    borderRadius: 99,
    backgroundColor: colors.text.tertiary,
    marginHorizontal: 2,
  },
  locTime: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.text.tertiary,
  },
  description: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
    marginTop: 4,
  },

  section: {
    marginTop: 6,
  },
  sectionLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.text.tertiary,
    letterSpacing: 1.3,
    marginBottom: 9,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  affChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
  },
  affChipCritical: {
    backgroundColor: colors.text.primary,
  },
  affChipNormal: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
  affLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12.5,
  },

  verCard: {
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.divider,
    gap: 12,
  },
  verHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  miniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg.secondary,
  },
  miniAvatarText: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 11.5,
    color: '#fff',
  },
  verHeaderText: { flex: 1 },
  verTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13.5,
    color: colors.text.primary,
  },
  verSub: {
    fontFamily: fontFamily.body,
    fontSize: 11.5,
    color: colors.text.secondary,
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(26,29,36,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelText: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    color: colors.text.tertiary,
    letterSpacing: 1.1,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  actionBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionPrimary: {
    flex: 1.4,
    backgroundColor: colors.status.verified,
    shadowColor: colors.status.verified,
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  actionPrimaryText: {
    fontFamily: fontFamily.display,
    fontSize: 15,
    color: '#fff',
  },
  actionSecondary: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1.5,
    borderColor: colors.border.default,
  },
  actionSecondaryText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13.5,
    color: colors.text.primary,
  },
});
