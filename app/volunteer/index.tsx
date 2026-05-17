import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppMap, type AppMapMarker } from '@/components/AppMap';
import { DockBar } from '@/components/DockBar';
import { GlassSurface } from '@/components/GlassSurface';
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
      <GlassSurface
        variant="dark"
        style={styles.headerBar}
        radius={999}
        intensity={42}
        tintOpacity={0.62}
      >
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
      </GlassSurface>
    </SafeAreaView>
  );
}

export default function VolunteerMap() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleTicket, setVisibleTicket] = useState<Ticket | null>(null);
  const router = useRouter();
  const userTickets = useTicketStore((s) => s.userTickets);
  const mapRef = useRef<MapView>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const cardTranslateY = fade.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  const markers = useMemo<AppMapMarker[]>(
    () => [...userTickets, ...SAMPLE_TICKETS].map(toMarker),
    [userTickets],
  );

  useEffect(() => {
    const nextTicket = selectedId
      ? userTickets.find((x) => x.id === selectedId) ??
        SAMPLE_TICKETS.find((x) => x.id === selectedId) ??
        null
      : null;

    if (nextTicket) {
      setVisibleTicket(nextTicket);
      Animated.timing(fade, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fade, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setVisibleTicket(null);
      });
    }
  }, [selectedId, userTickets, fade]);

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
        onPress={(e) => {
          if (e.nativeEvent.action === 'marker-press') return;
          setSelectedId(null);
        }}
      />

      <VolunteerMapHeader onBack={handleBack} />

      {visibleTicket ? (
        <Animated.View
          style={[
            styles.previewWrapper,
            { opacity: fade, transform: [{ translateY: cardTranslateY }] },
          ]}
          pointerEvents="box-none"
        >
          <GlassSurface
            style={styles.previewCard}
            radius={18}
            intensity={40}
            tintOpacity={0.55}
          >
            <View style={styles.previewBody}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {visibleTicket.description_tr}
              </Text>
              <Text style={styles.previewMeta}>
                {visibleTicket.verification_count} TESPİT · {visibleTicket.severity.toUpperCase()}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push(`/volunteer/pin/${visibleTicket.id}`)}
              style={({ pressed }) => [
                styles.previewDetailBtn,
                pressed && styles.previewDetailBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Detayını gör"
            >
              <Text style={styles.previewDetailText}>Detayını gör</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.text.inverse} />
            </Pressable>
          </GlassSurface>
        </Animated.View>
      ) : null}

      <View style={styles.bottomLeft} pointerEvents="box-none">
        <Pressable>
          <GlassSurface style={styles.locateBtn} radius={14} intensity={40} tintOpacity={0.5}>
            <Ionicons name="locate" size={20} color={colors.accent.primary} />
          </GlassSurface>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
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
    height: 64,
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 14, paddingRight: 12, gap: 10,
  },
  previewBody: { flex: 1 },
  previewTitle: {
    fontFamily: fontFamily.display, fontSize: 15, color: colors.text.primary,
  },
  previewMeta: {
    fontFamily: fontFamily.mono, fontSize: 11, color: colors.text.tertiary,
    letterSpacing: 0.6, marginTop: 2,
  },
  previewDetailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingLeft: 12, paddingRight: 9, paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: colors.accent.primary,
  },
  previewDetailBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  previewDetailText: {
    fontFamily: fontFamily.bodySemiBold, fontSize: 12.5,
    color: colors.text.inverse,
  },

  bottomLeft: { position: 'absolute', bottom: 96, left: 16, gap: 8 },
  locateBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
});
