import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTicketStore } from '@/stores/ticketStore';
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily, radius, spacing } from '@/theme';

export default function MyTickets() {
  const router = useRouter();
  const userTickets = useTicketStore((s) => s.userTickets);
  const resetUser = useUserStore((s) => s.reset);

  function changeRole() {
    resetUser();
    router.replace('/onboarding');
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Geri"
          >
            <ChevronLeft size={20} color={colors.text.primary} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.title}>Ticket'larım</Text>
          <Pressable onPress={changeRole} hitSlop={8}>
            <Text style={styles.changeRole}>Rolü değiştir</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {userTickets.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Henüz ticket yok</Text>
            <Text style={styles.emptySub}>
              Haritaya dön ve ilk problemi bildir. Çektiğin fotoğraflar burada toplanır.
            </Text>
          </View>
        ) : (
          userTickets.map((t) => (
            <Pressable
              key={t.id}
              style={styles.row}
              onPress={() => router.push(`/volunteer/pin/${t.id}`)}
            >
              <View style={styles.rowBody}>
                <Text style={styles.rowId}>#TKT-{t.id.slice(-4).toUpperCase()}</Text>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {t.description_tr}
                </Text>
                <Text style={styles.rowMeta}>
                  {t.verification_count} doğrulama ·{' '}
                  {formatDistanceToNow(new Date(t.created_at), { locale: tr, addSuffix: true })}
                </Text>
              </View>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: t.verified
                      ? colors.status.verified
                      : colors.status.partial,
                  },
                ]}
              />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },

  headerSafe: {
    backgroundColor: colors.bg.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.divider,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.display,
    fontSize: 17,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  changeRole: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12.5,
    color: colors.accent.primary,
    letterSpacing: 0.2,
  },

  scroll: { padding: spacing.s4, gap: spacing.s2, paddingBottom: spacing.s8 },

  empty: {
    paddingVertical: spacing.s8,
    alignItems: 'center',
    gap: spacing.s2,
  },
  emptyTitle: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    color: colors.text.primary,
  },
  emptySub: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.s6,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.divider,
    padding: 14,
  },
  rowBody: { flex: 1, gap: 3 },
  rowId: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.text.tertiary,
    letterSpacing: 1.2,
  },
  rowTitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14.5,
    color: colors.text.primary,
  },
  rowMeta: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.text.secondary,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
});
