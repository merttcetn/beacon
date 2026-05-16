import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppMap, type AppMapMarker } from '@/components/AppMap';
import { DockBar } from '@/components/DockBar';
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
    pinColor: pinColor(t.verified, t.verification_count),
  };
}

interface VolunteerMapHeaderProps {
  onBack: () => void;
}

function VolunteerMapHeader({ onBack }: VolunteerMapHeaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.headerSafe} pointerEvents="box-none">
      <View style={styles.headerBar}>
        <Pressable
          style={styles.headerIconButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Geri"
        >
          <ChevronLeft size={21} color={colors.text.inverse} strokeWidth={2.3} />
        </Pressable>

        <View style={styles.headerBrand} pointerEvents="none">
          <View style={styles.headerDots}>
            <View style={[styles.headerDot, { backgroundColor: colors.role.visuallyImpaired }]} />
            <View style={[styles.headerDot, { backgroundColor: colors.role.volunteer }]} />
            <View style={[styles.headerDot, { backgroundColor: colors.role.company }]} />
          </View>
          <Text style={styles.headerTitle}>erişim</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>
    </SafeAreaView>
  );
}

export default function VolunteerMap() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const userTickets = useTicketStore((s) => s.userTickets);
  const mapRef = useRef<MapView>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const cardTranslateY = fade.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });

  const markers = useMemo<AppMapMarker[]>(
    () => [...userTickets, ...SAMPLE_TICKETS].map(toMarker),
    [userTickets],
  );

  const selectedTicket = selectedId
    ? userTickets.find((x) => x.id === selectedId) ??
      SAMPLE_TICKETS.find((x) => x.id === selectedId) ??
      null
    : null;

  useEffect(() => {
    if (!selectedId) return;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [selectedId, fade]);

  function handleMarkerTap(id: string) {
    setSelectedId(id);
    const t =
      userTickets.find((x) => x.id === id) ??
      SAMPLE_TICKETS.find((x) => x.id === id);
    if (!t) return;
    mapRef.current?.animateCamera(
      { center: { latitude: t.location.latitude, longitude: t.location.longitude } },
      { duration: 350 },
    );
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/onboarding');
  }

  return (
    <View style={styles.root}>
      <AppMap
        ref={mapRef}
        markers={markers}
        onMarkerTap={handleMarkerTap}
        onPress={() => setSelectedId(null)}
      />

      <VolunteerMapHeader onBack={handleBack} />

      {selectedTicket ? (
        <Animated.View
          style={[
            styles.previewWrapper,
            { opacity: fade, transform: [{ translateY: cardTranslateY }] },
          ]}
          pointerEvents="box-none"
        >
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
        </Animated.View>
      ) : null}

      <View style={styles.bottomLeft} pointerEvents="box-none">
        <Pressable style={styles.locateBtn}>
          <Ionicons name="locate" size={20} color={colors.accent.primary} />
        </Pressable>
      </View>

      <DockBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },

  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 4,
  },
  headerBar: {
    height: 44,
    width: 184,
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(17,23,31,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    shadowColor: '#1A1D24',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  headerDots: {
    flexDirection: 'row',
    gap: 2.5,
  },
  headerDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 99,
  },
  headerTitle: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 14,
    color: colors.text.inverse,
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },

  previewWrapper: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    zIndex: 5,
  },
  previewCard: {
    marginHorizontal: 16,
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

  bottomLeft: { position: 'absolute', bottom: 96, left: 16, gap: 8 },
  locateBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1A1D24', shadowOpacity: 0.2, shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
});
