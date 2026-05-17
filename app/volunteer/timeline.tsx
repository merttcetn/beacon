import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loader } from '@/components/Loader';
import { useTickets } from '@/lib/tickets';
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily, spacing } from '@/theme';
import type { Ticket } from '@/types';

type Status = { color: string; label: string };

function statusOf(t: Ticket): Status {
  if (t.verified || t.verification_count >= 3) {
    return { color: colors.status.verified, label: 'teyit edildi' };
  }
  if (t.verification_count === 2) {
    return { color: colors.status.partial, label: 'kısmen' };
  }
  return { color: colors.status.new, label: 'yeni' };
}

function shortId(id: string) {
  return id.slice(-4).toUpperCase();
}

function formatDay(iso: string) {
  return format(new Date(iso), 'd MMMM', { locale: tr }).toLowerCase();
}

export default function MyTickets() {
  const router = useRouter();
  const { data: allTickets, isLoading } = useTickets();
  const userTickets = useMemo(
    () => (allTickets ?? []).filter((t) => t.created_by === 'demo-volunteer'),
    [allTickets],
  );
  const resetUser = useUserStore((s) => s.reset);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  function changeRole() {
    resetUser();
    router.replace('/onboarding');
  }

  const total = userTickets.length;
  const kicker = isLoading
    ? 'yükleniyor'
    : total === 0
      ? 'defter'
      : `${total} kayıt`;

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.backdrop}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Kapat"
      />

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <SafeAreaView edges={[]} style={styles.headerSafe}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              hitSlop={8}
            >
              <X size={18} color={colors.text.primary} strokeWidth={2.2} />
            </Pressable>
            <View style={styles.titleCol}>
              <Text style={styles.kicker}>{kicker}</Text>
              <Text style={styles.title}>{"ticket'larım"}</Text>
            </View>
            <Pressable onPress={changeRole} hitSlop={8} style={styles.roleBtn}>
              <Text style={styles.roleLabel}>değiştir</Text>
            </Pressable>
          </View>
        </SafeAreaView>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && total === 0 ? (
            <Loader caption="Ticket'larım yükleniyor" />
          ) : total === 0 ? (
            <EmptyState progress={progress} />
          ) : (
            userTickets.map((t, i) => (
              <TimelineRow
                key={t.id}
                ticket={t}
                index={i}
                isFirst={i === 0}
                isLast={i === total - 1}
                progress={progress}
                onPress={() => router.push(`/volunteer/pin/${t.id}`)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

interface TimelineRowProps {
  ticket: Ticket;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  progress: Animated.Value;
  onPress: () => void;
}

function TimelineRow({
  ticket,
  index,
  isFirst,
  isLast,
  progress,
  onPress,
}: TimelineRowProps) {
  const status = statusOf(ticket);
  // Staggered reveal: her satır progress eğrisi üzerinde 8% gecikmeyle açılır.
  const start = Math.min(0.05 + index * 0.08, 0.7);
  const opacity = progress.interpolate({
    inputRange: [start, start + 0.3],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const translateY = progress.interpolate({
    inputRange: [start, start + 0.3],
    outputRange: [12, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable onPress={onPress} style={styles.row}>
        <View style={styles.rail}>
          <View style={[styles.line, isFirst && styles.lineHidden]} />
          <View style={styles.dotHalo}>
            <View style={[styles.dot, { backgroundColor: status.color }]} />
          </View>
          <View style={[styles.line, isLast && styles.lineHidden]} />
        </View>
        <View style={styles.content}>
          <Text style={styles.idLine}>
            TKT  ·  {shortId(ticket.id)}
          </Text>
          <Text style={styles.titleLine} numberOfLines={2}>
            {ticket.description_tr}
          </Text>
          <Text style={styles.metaLine}>
            {formatDay(ticket.created_at)}
            {'  ·  '}
            {ticket.verification_count} doğrulama
          </Text>
          <View style={styles.statusLine}>
            <View style={[styles.statusPip, { backgroundColor: status.color }]} />
            <Text style={styles.statusLabel}>{status.label}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState({ progress }: { progress: Animated.Value }) {
  const opacity = progress.interpolate({
    inputRange: [0, 0.4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  return (
    <Animated.View style={[styles.emptyRow, { opacity }]}>
      <View style={styles.rail}>
        <View style={styles.lineHidden} />
        <View style={styles.dotHalo}>
          <View style={[styles.dot, { backgroundColor: colors.text.tertiary }]} />
        </View>
        <View style={styles.emptyTail} />
      </View>
      <View style={styles.emptyContent}>
        <Text style={styles.emptyKicker}>defter</Text>
        <Text style={styles.emptyTitle}>henüz kayıt yok</Text>
        <Text style={styles.emptySub}>
          Haritaya dön, ilk problemi bildir. Çektiğin fotoğraflar ve doğrulamalar
          burada birikir.
        </Text>
      </View>
    </Animated.View>
  );
}

const RAIL_WIDTH = 44;
const DOT_HALO = 18;
const DOT_INNER = 10;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,23,31,0.28)',
  },
  sheet: {
    height: '52%',
    backgroundColor: colors.bg.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1A1D24',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -10 },
    elevation: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.border.default,
    marginTop: 10,
    marginBottom: 2,
  },

  headerSafe: {
    backgroundColor: colors.bg.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.hairline,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 12,
  },
  list: {
    flex: 1,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.secondary,
  },
  titleCol: { flex: 1 },
  kicker: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 22,
    color: colors.text.primary,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  roleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: colors.bg.secondary,
  },
  roleLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.accent.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  scroll: {
    paddingTop: spacing.s2,
    paddingBottom: spacing.s12,
  },

  row: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'center',
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: colors.border.default,
  },
  lineHidden: {
    width: 1,
    flex: 1,
    backgroundColor: 'transparent',
  },
  dotHalo: {
    width: DOT_HALO,
    height: DOT_HALO,
    borderRadius: DOT_HALO / 2,
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dot: {
    width: DOT_INNER,
    height: DOT_INNER,
    borderRadius: DOT_INNER / 2,
  },
  content: {
    flex: 1,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s5,
    paddingRight: spacing.s4,
    paddingLeft: 4,
  },
  idLine: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: colors.text.tertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  titleLine: {
    fontFamily: fontFamily.display,
    fontSize: 17,
    color: colors.text.primary,
    letterSpacing: -0.3,
    lineHeight: 22,
    marginTop: 6,
  },
  metaLine: {
    fontFamily: fontFamily.mono,
    fontSize: 11.5,
    color: colors.text.secondary,
    letterSpacing: 0.4,
    marginTop: 8,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  statusPip: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.text.primary,
    letterSpacing: 0.2,
  },

  emptyRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: spacing.s10,
  },
  emptyContent: {
    flex: 1,
    paddingTop: spacing.s4,
    paddingRight: spacing.s4,
    paddingLeft: 4,
  },
  emptyTail: {
    width: 1,
    height: 24,
    backgroundColor: colors.border.default,
    opacity: 0.45,
  },
  emptyKicker: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  emptyTitle: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 24,
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  emptySub: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 21,
    marginTop: 10,
  },
});
