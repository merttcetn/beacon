import BottomSheet, {
  BottomSheetScrollView,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import {
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileText,
  Flame,
  Layers,
  MapPin,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppMap, type AppMapMarker } from '@/components/AppMap';
import { GlassSurface } from '@/components/GlassSurface';
import {
  COMPANY_HEAT_CIRCLES,
  COMPANY_PINS,
  STATUS_TO_HEX,
} from '@/constants/companyPins';
import {
  COMPANY_BRIEF,
  COMPANY_CATEGORIES,
  COMPANY_FILTERS,
  COMPANY_SUMMARY,
} from '@/constants/companyMarketplace';
import { colors, fontFamily, radius } from '@/theme';

const SNAP_POINTS = ['14%', '52%', '92%'];

export default function CompanyDashboard() {
  const [mode, setMode] = useState<'heat' | 'pin'>('heat');
  const [requestSent, setRequestSent] = useState(false);
  const router = useRouter();
  const sheetRef = useRef<BottomSheet>(null);

  const markers = useMemo<AppMapMarker[]>(
    () =>
      COMPANY_PINS.map((p) => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        pinColor: STATUS_TO_HEX[p.status],
      })),
    [],
  );

  const renderSheetBackground = useCallback(
    ({ style }: BottomSheetBackgroundProps) => (
      <View style={[style, styles.sheetBgWrap]} pointerEvents="none">
        <BlurView intensity={48} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.sheetBgTint} />
        <View style={styles.sheetBgHighlight} />
      </View>
    ),
    [],
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <View style={styles.brandMark}>
            <Building2 size={18} color={colors.text.inverse} strokeWidth={2.2} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerLabel}>B2B VERİ MARKETPLACE</Text>
            <Text style={styles.headerName}>Yapı Kent A.Ş.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Bildirimler" style={styles.bellBtn}>
            <Bell size={17} color={colors.text.primary} strokeWidth={2.2} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        <GlassSurface
          style={styles.marketStrip}
          radius={radius.sm}
          intensity={32}
          tintOpacity={0.7}
        >
          <View style={styles.stripIcon}>
            <TrendingUp size={16} color={colors.status.partial} strokeWidth={2.4} />
          </View>
          <View style={styles.stripCopy}>
            <Text style={styles.stripTitle}>Çankaya saha fırsatı</Text>
            <Text style={styles.stripText} numberOfLines={1}>
              4 mahallede doğrulanmış erişim hasarı yoğunlaşıyor
            </Text>
          </View>
          <View style={styles.trustPill}>
            <ShieldCheck size={13} color={colors.status.verified} strokeWidth={2.4} />
            <Text style={styles.trustText}>KVKK</Text>
          </View>
        </GlassSurface>

        <View style={styles.quickNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Talepler"
            onPress={() => router.push('/company/requests')}
            style={({ pressed }) => [styles.quickNavBtn, pressed && styles.quickNavPressed]}
          >
            <FileText size={14} color={colors.accent.primary} strokeWidth={2.4} />
            <Text style={styles.quickNavText}>Talepler</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profil"
            onPress={() => router.push('/company/profile')}
            style={({ pressed }) => [styles.quickNavBtn, pressed && styles.quickNavPressed]}
          >
            <UserRound size={14} color={colors.accent.primary} strokeWidth={2.4} />
            <Text style={styles.quickNavText}>Profil</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {COMPANY_FILTERS.map((f) => (
            <View key={f.label} style={styles.filterChip}>
              <View style={[styles.filterDot, { backgroundColor: f.dot }]} />
              <Text style={styles.filterText}>{f.label}</Text>
              <Text style={styles.filterVal}>· {f.value}</Text>
              <ChevronDown size={11} color={colors.text.tertiary} strokeWidth={2.4} />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      <View style={styles.mapArea}>
        <AppMap
          markers={mode === 'pin' ? markers : undefined}
          circles={mode === 'heat' ? COMPANY_HEAT_CIRCLES : undefined}
        />

        <View style={styles.summaryRow} pointerEvents="box-none">
          {COMPANY_SUMMARY.map((c) => (
            <GlassSurface
              key={c.label}
              style={styles.summaryCard}
              radius={radius.md}
              intensity={45}
            >
              <Text style={styles.summaryLabel}>{c.label}</Text>
              <Text style={[styles.summaryValue, { color: c.tone }]}>{c.value}</Text>
              <Text style={styles.summaryMeta}>{c.meta}</Text>
            </GlassSurface>
          ))}
        </View>

        <BottomSheet
          ref={sheetRef}
          index={1}
          snapPoints={SNAP_POINTS}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          backgroundComponent={renderSheetBackground}
          handleIndicatorStyle={styles.sheetHandleBar}
          handleStyle={styles.sheetHandle}
        >
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={requestSent ? 'Talep gönderildi' : 'Bu kümeyi talep et'}
              style={({ pressed }) => [
                styles.cta,
                requestSent && styles.ctaSuccess,
                pressed && styles.ctaPressed,
              ]}
              onPress={() => setRequestSent(true)}
            >
              <View style={styles.ctaIcon}>
                {requestSent ? (
                  <CheckCircle2 size={16} color="#fff" strokeWidth={2.5} />
                ) : (
                  <Send size={15} color="#fff" strokeWidth={2.5} />
                )}
              </View>
              <View style={styles.ctaCopy}>
                <Text style={styles.ctaText}>
                  {requestSent ? 'Talep gönderildi' : 'Bu Kümeyi Talep Et'}
                </Text>
                <Text style={styles.ctaSub}>
                  {requestSent ? 'Bildirim admin kuyruğunda' : '47 sinyal · örnek veri'}
                </Text>
              </View>
              <View style={styles.ctaBadge}>
                <Text style={styles.ctaBadgeText}>47</Text>
              </View>
            </Pressable>

            <GlassSurface
              style={styles.briefPanel}
              radius={radius.md}
              intensity={28}
              tintOpacity={0.55}
            >
              <View style={styles.briefAccent} />
              <View style={styles.briefCopy}>
                <View style={styles.briefKicker}>
                  <MapPin size={12} color={colors.accent.primary} strokeWidth={2.6} />
                  <Text style={styles.briefKickerText}>ÖNE ÇIKAN KÜME</Text>
                </View>
                <Text style={styles.briefTitle}>{COMPANY_BRIEF.title}</Text>
                <Text style={styles.briefDescription}>
                  {COMPANY_BRIEF.description}
                </Text>
                <View style={styles.briefChips}>
                  {COMPANY_BRIEF.chips.map((chip) => (
                    <Text key={chip} style={styles.briefChip}>
                      {chip}
                    </Text>
                  ))}
                </View>
              </View>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreValue}>{COMPANY_BRIEF.score}</Text>
                <Text style={styles.scoreLabel}>SKOR</Text>
                <Text style={styles.scoreSignal} numberOfLines={2}>
                  {COMPANY_BRIEF.signal}
                </Text>
              </View>
            </GlassSurface>

            <View style={styles.metricRail}>
              {COMPANY_BRIEF.metrics.map((m) => (
                <GlassSurface
                  key={m.label}
                  variant="dark"
                  style={styles.railItem}
                  radius={radius.sm}
                  intensity={40}
                  tintOpacity={0.72}
                >
                  <Text style={styles.railValue}>{m.value}</Text>
                  <Text style={styles.railLabel}>{m.label}</Text>
                </GlassSurface>
              ))}
            </View>

            <GlassSurface
              style={styles.categoryPanel}
              radius={radius.md}
              intensity={30}
              tintOpacity={0.55}
            >
              <View style={styles.panelHeader}>
                <View style={styles.panelTitleWrap}>
                  <SlidersHorizontal size={14} color={colors.text.primary} strokeWidth={2.4} />
                  <Text style={styles.panelTitle}>Kategori dağılımı</Text>
                </View>
                <View style={styles.modeSwitch}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Isı haritası"
                    style={[styles.modeBtn, mode === 'heat' && styles.modeBtnActive]}
                    onPress={() => setMode('heat')}
                  >
                    <Flame
                      size={13}
                      color={mode === 'heat' ? '#fff' : colors.text.secondary}
                      strokeWidth={2.5}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Pin görünümü"
                    style={[styles.modeBtn, mode === 'pin' && styles.modeBtnActive]}
                    onPress={() => setMode('pin')}
                  >
                    <Layers
                      size={13}
                      color={mode === 'pin' ? '#fff' : colors.text.secondary}
                      strokeWidth={2.5}
                    />
                  </Pressable>
                </View>
              </View>

              {COMPANY_CATEGORIES.map((row) => (
                <View key={row.label} style={styles.catRow}>
                  <View style={styles.catHead}>
                    <Text style={styles.catLabel}>{row.label}</Text>
                    <Text style={styles.catPct}>{row.pct}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${row.pct}%`, backgroundColor: row.tone },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </GlassSurface>
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },

  headerSafe: {
    backgroundColor: colors.bg.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.divider,
    paddingHorizontal: 14,
  },
  headerRow: {
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: colors.text.tertiary,
  },
  headerName: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 18,
    color: colors.text.primary,
    marginTop: 1,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.divider,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.status.new,
    borderWidth: 1.5,
    borderColor: colors.bg.secondary,
  },
  marketStrip: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
  },
  stripIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: '#FFF4E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripCopy: { flex: 1 },
  stripTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  stripText: {
    fontFamily: fontFamily.body,
    fontSize: 11.5,
    color: colors.text.secondary,
    marginTop: 1,
  },
  trustPill: {
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E7F4EF',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontFamily: fontFamily.monoBold,
    fontSize: 10,
    color: colors.status.verified,
  },
  quickNav: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 8,
  },
  quickNavBtn: {
    minHeight: 38,
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  quickNavPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  quickNavText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12.5,
    color: colors.text.primary,
  },
  filterRow: { gap: 7, paddingVertical: 10 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  filterDot: { width: 6, height: 6, borderRadius: 99 },
  filterText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.text.primary,
  },
  filterVal: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.text.tertiary,
  },

  mapArea: { flex: 1, position: 'relative', overflow: 'hidden' },

  summaryRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
  },
  summaryLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 9,
    color: colors.text.tertiary,
    marginBottom: 3,
  },
  summaryValue: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 22,
    lineHeight: 24,
  },
  summaryMeta: {
    fontFamily: fontFamily.body,
    fontSize: 10.5,
    color: colors.text.secondary,
    marginTop: 1,
  },

  sheetBgWrap: {
    overflow: 'hidden',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sheetBgTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,250,252,0.62)',
  },
  sheetBgHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  sheetHandle: {
    paddingTop: 10,
    paddingBottom: 6,
  },
  sheetHandleBar: {
    width: 44,
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.border.default,
  },
  sheetContent: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    gap: 12,
  },

  cta: {
    minHeight: 58,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.accent.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.accent.primary,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  ctaSuccess: {
    backgroundColor: colors.status.verified,
    shadowColor: colors.status.verified,
  },
  ctaPressed: { transform: [{ scale: 0.99 }] },
  ctaIcon: {
    width: 34,
    height: 34,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCopy: { flex: 1 },
  ctaText: {
    fontFamily: fontFamily.display,
    fontSize: 14.5,
    color: colors.text.inverse,
  },
  ctaSub: {
    fontFamily: fontFamily.body,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.76)',
    marginTop: 1,
  },
  ctaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  ctaBadgeText: {
    fontFamily: fontFamily.monoBold,
    fontSize: 11,
    color: '#fff',
  },

  briefPanel: {
    minHeight: 126,
    flexDirection: 'row',
  },
  briefAccent: {
    width: 5,
    backgroundColor: colors.status.new,
  },
  briefCopy: {
    flex: 1,
    padding: 12,
    paddingRight: 8,
  },
  briefKicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  briefKickerText: {
    fontFamily: fontFamily.monoBold,
    fontSize: 9.5,
    color: colors.accent.primary,
  },
  briefTitle: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 16,
    lineHeight: 20,
    color: colors.text.primary,
  },
  briefDescription: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.text.secondary,
    marginTop: 5,
  },
  briefChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 9,
  },
  briefChip: {
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.6)',
    color: colors.text.secondary,
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  scoreBox: {
    width: 88,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(17,23,31,0.92)',
  },
  scoreValue: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 30,
    lineHeight: 32,
    color: colors.text.inverse,
  },
  scoreLabel: {
    fontFamily: fontFamily.monoBold,
    fontSize: 9,
    color: '#B9C7D6',
    marginTop: 1,
  },
  scoreSignal: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 10.5,
    lineHeight: 13,
    color: '#FFE0A7',
    textAlign: 'center',
    marginTop: 8,
  },

  metricRail: {
    flexDirection: 'row',
    gap: 8,
  },
  railItem: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  railValue: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 16,
    color: colors.text.inverse,
  },
  railLabel: {
    fontFamily: fontFamily.body,
    fontSize: 10.5,
    color: '#C8D0DA',
    marginTop: 1,
  },

  categoryPanel: {
    padding: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  panelTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  panelTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.55)',
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    width: 28,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: colors.text.primary,
  },
  catRow: { marginTop: 8 },
  catHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  catLabel: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 11.5,
    color: colors.text.primary,
  },
  catPct: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.text.tertiary,
  },
  barTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(17,23,31,0.12)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    minWidth: 10,
    borderRadius: 99,
  },
});
