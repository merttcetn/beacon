import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppMap, type AppMapMarker } from '@/components/AppMap';
import { SAMPLE_TICKETS } from '@/constants/sampleTickets';
import { useTicketStore } from '@/stores/ticketStore';
import { colors, fontFamily } from '@/theme';
import type { Ticket } from '@/types';

function pinColor(verified: boolean, count: number) {
  if (verified || count >= 3) return colors.status.verified;
  if (count === 2) return colors.status.partial;
  return colors.status.new;
}

function toMarker(t: Ticket): AppMapMarker {
  return {
    id: t.id,
    latitude: t.location.latitude,
    longitude: t.location.longitude,
    title: t.description_tr,
    description: `${t.verification_count} doğrulama · ${t.severity}`,
    pinColor: pinColor(t.verified, t.verification_count),
  };
}

export default function VolunteerMap() {
  const [mode, setMode] = useState<'pin' | 'heat'>('pin');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const userTickets = useTicketStore((s) => s.userTickets);

  const markers = useMemo<AppMapMarker[]>(
    () => [...userTickets, ...SAMPLE_TICKETS].map(toMarker),
    [userTickets],
  );

  const selectedTicket = selectedId
    ? userTickets.find((x) => x.id === selectedId) ??
      SAMPLE_TICKETS.find((x) => x.id === selectedId) ??
      null
    : null;

  return (
    <View style={styles.root}>
      <AppMap markers={markers} onMarkerTap={setSelectedId} />

      {selectedTicket ? (
        <SafeAreaView edges={['top']} style={styles.previewSafe} pointerEvents="box-none">
          <Pressable
            style={styles.previewCard}
            onPress={() => router.push(`/volunteer/pin/${selectedTicket.id}`)}
          >
            <View style={styles.previewBody}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {selectedTicket.description_tr}
              </Text>
              <Text style={styles.previewMeta}>
                {selectedTicket.verification_count} TESPİT · {selectedTicket.severity.toUpperCase()}
              </Text>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => setSelectedId(null)}
              style={styles.previewClose}
            >
              <Ionicons name="close" size={16} color={colors.text.tertiary} />
            </Pressable>
            <View style={styles.previewChevron}>
              <Ionicons name="chevron-forward" size={18} color={colors.accent.primary} />
            </View>
          </Pressable>
        </SafeAreaView>
      ) : null}

      <View style={styles.bottomLeft} pointerEvents="box-none">
        <View style={styles.toggleGroup}>
          <Pressable
            style={[styles.toggleBtn, mode === 'pin' && styles.toggleBtnActive]}
            onPress={() => setMode('pin')}
          >
            <Ionicons
              name="location"
              size={20}
              color={mode === 'pin' ? colors.text.inverse : colors.text.secondary}
            />
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, mode === 'heat' && styles.toggleBtnActive]}
            onPress={() => setMode('heat')}
          >
            <Ionicons
              name="flame"
              size={20}
              color={mode === 'heat' ? colors.text.inverse : colors.text.secondary}
            />
          </Pressable>
        </View>
        <Pressable style={styles.locateBtn}>
          <Ionicons name="locate" size={20} color={colors.accent.primary} />
        </Pressable>
      </View>

      <View style={styles.bottomRight} pointerEvents="box-none">
        <Pressable
          style={styles.fab}
          onPress={() => router.push('/volunteer/feedback')}
          accessibilityRole="button"
          accessibilityLabel="Problem bildir"
        >
          <View style={styles.fabIcon}>
            <Ionicons name="add" size={18} color={colors.text.inverse} />
          </View>
          <Text style={styles.fabText}>Problem Bildir</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },

  previewSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  previewCard: {
    marginTop: 8, marginHorizontal: 16,
    height: 64, borderRadius: 16,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1, borderColor: colors.border.default,
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 14, paddingRight: 12, gap: 10,
    shadowColor: '#1A1D24', shadowOpacity: 0.18, shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  previewBody: { flex: 1 },
  previewTitle: {
    fontFamily: fontFamily.display, fontSize: 15, color: colors.text.primary,
  },
  previewMeta: {
    fontFamily: fontFamily.mono, fontSize: 11, color: colors.text.tertiary,
    letterSpacing: 0.6, marginTop: 2,
  },
  previewClose: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg.secondary,
  },
  previewChevron: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  bottomLeft: { position: 'absolute', bottom: 24, left: 16, gap: 8 },
  toggleGroup: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1, borderColor: colors.border.default,
    borderRadius: 12, padding: 4,
    shadowColor: '#1A1D24', shadowOpacity: 0.2, shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  toggleBtn: { width: 44, height: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: colors.text.primary },
  locateBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1A1D24', shadowOpacity: 0.2, shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  bottomRight: { position: 'absolute', bottom: 24, right: 16 },
  fab: {
    height: 56, borderRadius: 28,
    paddingHorizontal: 22, paddingLeft: 18,
    backgroundColor: colors.accent.primary,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: colors.accent.primary, shadowOpacity: 0.55, shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 }, elevation: 6,
  },
  fabIcon: {
    width: 32, height: 32, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  fabText: { fontFamily: fontFamily.display, fontSize: 16, color: colors.text.inverse },
});
