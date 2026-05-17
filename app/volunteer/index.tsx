import { AppMap, type AppMapMarker } from '@/components/AppMap';
import { DockBar } from '@/components/DockBar';
import { DEFAULT_REGION } from '@/constants/region';
import { SAMPLE_TICKETS } from '@/constants/sampleTickets';
import { useTicketStore } from '@/stores/ticketStore';
import { colors, fontFamily } from '@/theme';
import type { AffectedUser, Ticket } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const FEED_RADIUS_KM = 5;
const TOGGLE_SEGMENT_WIDTH = 96;

type ViewMode = 'map' | 'feed';

interface Coord {
  latitude: number;
  longitude: number;
}

function haversineKm(a: Coord, b: Coord) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sa = Math.sin(dLat / 2);
  const sb = Math.sin(dLon / 2);
  const h =
    sa * sa +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sb * sb;
  return 2 * R * Math.asin(Math.sqrt(h));
}

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

function toMarker(t: Ticket): AppMapMarker {
  return {
    id: t.id,
    latitude: t.location.latitude,
    longitude: t.location.longitude,
    pinColor: pinColor(t.verified, t.verification_count),
  };
}

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

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

const SEVERITY_LABEL: Record<Ticket['severity'], string> = {
  low: 'DÜŞÜK',
  medium: 'ORTA',
  high: 'YÜKSEK',
};

const AFFECTED_ICON: Record<
  AffectedUser,
  React.ComponentProps<typeof Ionicons>['name']
> = {
  wheelchair: 'accessibility',
  visually_impaired: 'eye-off-outline',
  stroller: 'cart-outline',
  elderly: 'walk-outline',
};

interface VolunteerTopBarProps {
  onBack: () => void;
  view: ViewMode;
  onChangeView: (v: ViewMode) => void;
  indicatorX: Animated.AnimatedInterpolation<number>;
}

function VolunteerTopBar({
  onBack,
  view,
  onChangeView,
  indicatorX,
}: VolunteerTopBarProps) {
  const modes: ViewMode[] = ['map', 'feed'];
  return (
    <SafeAreaView edges={['top']} style={styles.topBarSafe} pointerEvents="box-none">
      <View style={styles.topBar}>
        <Pressable
          style={styles.topBarBack}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Geri"
        >
          <ChevronLeft size={20} color={colors.text.inverse} strokeWidth={2.3} />
        </Pressable>

        <View style={styles.topBarBrand} pointerEvents="none">
          <View style={[styles.topBarBrandDot, { backgroundColor: colors.role.visuallyImpaired }]} />
          <View style={[styles.topBarBrandDot, { backgroundColor: colors.role.volunteer }]} />
          <View style={[styles.topBarBrandDot, { backgroundColor: colors.role.company }]} />
        </View>

        <View style={styles.topBarDivider} />

        <View style={styles.topBarSegmented}>
          <Animated.View
            style={[styles.topBarIndicator, { transform: [{ translateX: indicatorX }] }]}
          />
          {modes.map((mode) => {
            const active = view === mode;
            const color = active ? colors.text.primary : colors.text.inverse;
            return (
              <Pressable
                key={mode}
                onPress={() => onChangeView(mode)}
                style={styles.topBarSegment}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={mode === 'map' ? 'Harita görünümü' : "Yakındaki ticket'lar"}
              >
                <Ionicons
                  name={mode === 'map' ? 'map-outline' : 'list-outline'}
                  size={13}
                  color={color}
                />
                <Text style={[styles.topBarSegmentText, { color }]}>
                  {mode === 'map' ? 'Harita' : 'Yakındaki'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

interface FeedItem {
  ticket: Ticket;
  distanceKm: number;
}

interface FeedListProps {
  items: FeedItem[];
  locationReady: boolean;
  onItemPress: (id: string) => void;
}

function FeedCard({
  ticket,
  distanceKm,
  onPress,
}: {
  ticket: Ticket;
  distanceKm: number;
  onPress: () => void;
}) {
  const color = pinColor(ticket.verified, ticket.verification_count);
  const status = statusLabel(ticket.verified, ticket.verification_count);
  const shortId = `#TKT-${ticket.id.slice(-4).toUpperCase()}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.feedCard, pressed && styles.feedCardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${ISSUE_LABEL[ticket.issue_type]} · ${formatDistance(distanceKm)}`}
    >
      <View style={styles.feedStub}>
        <View style={[styles.feedStubBar, { backgroundColor: color }]} />
        <View style={styles.feedNotchTop} />
        <View style={styles.feedNotchBottom} />
      </View>

      <View style={styles.feedBody}>
        <View style={styles.feedRowTop}>
          <View style={styles.feedStatusGroup}>
            <View style={[styles.feedStatusDot, { backgroundColor: color }]} />
            <Text style={[styles.feedStatusText, { color }]}>{status}</Text>
            <Text style={styles.feedDot}>·</Text>
            <Text style={styles.feedStatusMono}>
              {ticket.verification_count}/3 TESPİT
            </Text>
          </View>
          <Text style={styles.feedTicketId}>{shortId}</Text>
        </View>

        <Text style={styles.feedIssueTitle}>{ISSUE_LABEL[ticket.issue_type]}</Text>
        <Text style={styles.feedDesc} numberOfLines={2}>
          {ticket.description_tr}
        </Text>

        <View style={styles.feedTear} />

        <View style={styles.feedFooter}>
          <View style={styles.feedDistancePill}>
            <Ionicons name="navigate" size={12} color={colors.text.primary} />
            <Text style={styles.feedDistanceValue}>{formatDistance(distanceKm)}</Text>
          </View>

          <View style={styles.feedFooterRight}>
            <View style={styles.feedAffected}>
              {ticket.affected_users.slice(0, 3).map((u, i) => (
                <View
                  key={u}
                  style={[
                    styles.feedAffectedChip,
                    { marginLeft: i === 0 ? 0 : -6 },
                  ]}
                >
                  <Ionicons
                    name={AFFECTED_ICON[u]}
                    size={11}
                    color={colors.text.primary}
                  />
                </View>
              ))}
            </View>
            <Text style={styles.feedSeverity}>
              {SEVERITY_LABEL[ticket.severity]}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function FeedList({ items, locationReady, onItemPress }: FeedListProps) {
  return (
    <ScrollView
      style={styles.feedScroll}
      contentContainerStyle={styles.feedContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.feedHeader}>
        <View style={styles.feedHeaderTopRow}>
          <Text style={styles.feedHeaderEyebrow}>BU YAKINDA</Text>
          <View style={styles.feedHeaderRule} />
          <Text style={styles.feedHeaderRadius}>~{FEED_RADIUS_KM} KM</Text>
        </View>
        <Text style={styles.feedHeaderTitle}>Yakındaki ticket'lar</Text>
        <Text style={styles.feedHeaderSubtitle}>
          {locationReady
            ? `${items.length} kayıt · mesafeye göre sıralı`
            : `Konum kapalı · varsayılan merkez · ${items.length} kayıt`}
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.feedEmpty}>
          <Ionicons name="leaf-outline" size={28} color={colors.text.tertiary} />
          <Text style={styles.feedEmptyTitle}>Yakında ticket yok</Text>
          <Text style={styles.feedEmptySub}>
            {FEED_RADIUS_KM} km içinde bekleyen bir doğrulama yok. Yeni bir
            problem gördüysen "+" ile bildirebilirsin.
          </Text>
        </View>
      ) : (
        items.map(({ ticket, distanceKm }) => (
          <FeedCard
            key={ticket.id}
            ticket={ticket}
            distanceKm={distanceKm}
            onPress={() => onItemPress(ticket.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

export default function VolunteerMap() {
  const [view, setView] = useState<ViewMode>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleTicket, setVisibleTicket] = useState<Ticket | null>(null);
  const [userCoord, setUserCoord] = useState<Coord | null>(null);
  const router = useRouter();
  const userTickets = useTicketStore((s) => s.userTickets);
  const mapRef = useRef<MapView>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const cardTranslateY = fade.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });

  const viewAnim = useRef(new Animated.Value(0)).current; // 0 → map, 1 → feed
  const indicatorX = viewAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TOGGLE_SEGMENT_WIDTH],
  });
  const mapOpacity = viewAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const feedOpacity = viewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const mapTranslateY = viewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const feedTranslateY = viewAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  useEffect(() => {
    Animated.timing(viewAnim, {
      toValue: view === 'map' ? 0 : 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [view, viewAnim]);

  const allTickets = useMemo<Ticket[]>(
    () => [...userTickets, ...SAMPLE_TICKETS],
    [userTickets],
  );

  const markers = useMemo<AppMapMarker[]>(
    () => allTickets.map(toMarker),
    [allTickets],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let pos = await Location.getLastKnownPositionAsync();
      if (!pos) {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }
      if (!pos || cancelled) return;
      setUserCoord({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const feedItems = useMemo<FeedItem[]>(() => {
    const origin: Coord = userCoord ?? {
      latitude: DEFAULT_REGION.latitude,
      longitude: DEFAULT_REGION.longitude,
    };
    return allTickets
      .map((ticket) => ({
        ticket,
        distanceKm: haversineKm(origin, ticket.location),
      }))
      .filter((it) => it.distanceKm <= FEED_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [allTickets, userCoord]);

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
      {
        center: {
          latitude: t.location.latitude + 0.0018,
          longitude: t.location.longitude,
        },
      },
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

  const handleRecenter = useCallback(async () => {
    let pos = await Location.getLastKnownPositionAsync();
    if (!pos) {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return;
      pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    }
    if (!pos) return;
    setUserCoord({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });
    mapRef.current?.animateCamera(
      {
        center: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        },
        zoom: 16,
      },
      { duration: 450 },
    );
  }, []);

  const handleFeedItemPress = useCallback(
    (id: string) => {
      router.push(`/volunteer/pin/${id}`);
    },
    [router],
  );

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.viewLayer,
          { opacity: mapOpacity, transform: [{ translateY: mapTranslateY }] },
        ]}
        pointerEvents={view === 'map' ? 'auto' : 'none'}
      >
        <AppMap
          ref={mapRef}
          markers={markers}
          onMarkerTap={handleMarkerTap}
          onPress={(e) => {
            if (e.nativeEvent.action === 'marker-press') return;
            setSelectedId(null);
          }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.viewLayer,
          { opacity: feedOpacity, transform: [{ translateY: feedTranslateY }] },
        ]}
        pointerEvents={view === 'feed' ? 'auto' : 'none'}
      >
        <FeedList
          items={feedItems}
          locationReady={userCoord !== null}
          onItemPress={handleFeedItemPress}
        />
      </Animated.View>

      <VolunteerTopBar
        onBack={handleBack}
        view={view}
        onChangeView={setView}
        indicatorX={indicatorX}
      />

      {view === 'map' && visibleTicket ? (
        <Animated.View
          style={[
            styles.previewWrapper,
            { opacity: fade, transform: [{ translateY: cardTranslateY }] },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View
                style={[
                  styles.previewDot,
                  {
                    backgroundColor: pinColor(
                      visibleTicket.verified,
                      visibleTicket.verification_count,
                    ),
                  },
                ]}
              />
              <Text style={styles.previewIssueType} numberOfLines={1}>
                {ISSUE_LABEL[visibleTicket.issue_type]}
              </Text>
              <View style={styles.previewHeaderRule} />
            </View>

            <Text style={styles.previewTitle} numberOfLines={3}>
              {visibleTicket.description_tr}
            </Text>

            <View style={styles.previewMetaRow}>
              <View style={styles.previewMetaCell}>
                <Text style={styles.previewMetaValue}>
                  {visibleTicket.verification_count}
                </Text>
                <Text style={styles.previewMetaLabel}>TESPİT</Text>
              </View>
              <View style={styles.previewMetaDivider} />
              <View style={styles.previewMetaCell}>
                <Text
                  style={[
                    styles.previewMetaValue,
                    {
                      color:
                        visibleTicket.severity === 'high'
                          ? colors.status.new
                          : visibleTicket.severity === 'medium'
                            ? colors.status.partial
                            : colors.text.primary,
                    },
                  ]}
                >
                  {SEVERITY_LABEL[visibleTicket.severity]}
                </Text>
                <Text style={styles.previewMetaLabel}>ŞİDDET</Text>
              </View>
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
          </View>
        </Animated.View>
      ) : null}

      <DockBar onRecenter={view === 'map' ? handleRecenter : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  viewLayer: { ...StyleSheet.absoluteFillObject },

  topBarSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 4,
  },
  topBar: {
    marginTop: 8,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
    paddingRight: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(17,23,31,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#1A1D24',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    overflow: 'hidden',
  },
  topBarBack: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
  },
  topBarBrandDot: { width: 5.5, height: 5.5, borderRadius: 99 },
  topBarDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginRight: 4,
  },
  topBarSegmented: {
    flexDirection: 'row',
    height: 32,
    position: 'relative',
  },
  topBarIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: TOGGLE_SEGMENT_WIDTH,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.bg.primary,
  },
  topBarSegment: {
    width: TOGGLE_SEGMENT_WIDTH,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 999,
  },
  topBarSegmentText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12.5,
    letterSpacing: 0.2,
  },

  previewWrapper: {
    position: 'absolute',
    top: '22%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  previewCard: {
    width: 264,
    borderRadius: 20,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 18,
    gap: 14,
    shadowColor: '#1A1D24',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  previewIssueType: {
    fontFamily: fontFamily.monoBold,
    fontSize: 10.5,
    color: colors.text.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  previewHeaderRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.hairline,
  },
  previewTitle: {
    fontFamily: fontFamily.display,
    fontSize: 17,
    lineHeight: 23,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  previewMetaCell: {
    flex: 1,
    gap: 2,
  },
  previewMetaDivider: {
    width: 1,
    backgroundColor: colors.border.hairline,
    marginHorizontal: 12,
  },
  previewMetaValue: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 18,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  previewMetaLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    color: colors.text.tertiary,
    letterSpacing: 1.2,
  },
  previewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.accent.primary,
  },
  previewDetailBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  previewDetailText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13.5,
    color: colors.text.inverse,
    letterSpacing: 0.2,
  },

  // Feed
  feedScroll: { flex: 1, backgroundColor: colors.bg.primary },
  feedContent: {
    paddingTop: 88,
    paddingHorizontal: 16,
    paddingBottom: 140,
    gap: 12,
  },
  feedHeader: { marginBottom: 6, paddingHorizontal: 2 },
  feedHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  feedHeaderEyebrow: {
    fontFamily: fontFamily.monoBold,
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: colors.text.tertiary,
  },
  feedHeaderRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.divider,
  },
  feedHeaderRadius: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.text.secondary,
  },
  feedHeaderTitle: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    letterSpacing: -0.4,
    color: colors.text.primary,
    lineHeight: 28,
  },
  feedHeaderSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: 12.5,
    color: colors.text.secondary,
    marginTop: 4,
  },

  feedEmpty: {
    marginTop: 32,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  feedEmptyTitle: {
    fontFamily: fontFamily.display,
    fontSize: 16,
    color: colors.text.primary,
  },
  feedEmptySub: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  feedCard: {
    flexDirection: 'row',
    backgroundColor: colors.bg.elevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.divider,
    shadowColor: '#1A1D24',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  feedCardPressed: { opacity: 0.94, transform: [{ scale: 0.997 }] },

  feedStub: {
    width: 16,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  feedStubBar: {
    width: 4,
    alignSelf: 'stretch',
    marginVertical: 18,
    borderRadius: 2,
    opacity: 0.9,
  },
  feedNotchTop: {
    position: 'absolute',
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 99,
    backgroundColor: colors.bg.primary,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.divider,
  },
  feedNotchBottom: {
    position: 'absolute',
    bottom: -8,
    width: 16,
    height: 16,
    borderRadius: 99,
    backgroundColor: colors.bg.primary,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: colors.border.divider,
  },

  feedBody: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  feedRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  feedStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  feedStatusDot: { width: 6, height: 6, borderRadius: 99 },
  feedStatusText: {
    fontFamily: fontFamily.monoBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
  },
  feedDot: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.text.tertiary,
    marginHorizontal: 1,
  },
  feedStatusMono: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.text.tertiary,
    letterSpacing: 0.6,
  },
  feedTicketId: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.text.tertiary,
    letterSpacing: 0.4,
  },

  feedIssueTitle: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: colors.text.primary,
    marginTop: 2,
  },
  feedDesc: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
    marginTop: 4,
  },

  feedTear: {
    marginTop: 12,
    marginBottom: 10,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.default,
  },

  feedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  feedDistancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: colors.bg.secondary,
  },
  feedDistanceValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  feedFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedAffected: { flexDirection: 'row' },
  feedAffectedChip: {
    width: 22,
    height: 22,
    borderRadius: 99,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1.5,
    borderColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedSeverity: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.text.tertiary,
    letterSpacing: 1.1,
  },
});
