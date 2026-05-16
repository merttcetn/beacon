import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppMap, type AppMapMarker } from '@/components/AppMap';
import {
  CATEGORY_LABEL_TR,
  COMPANY_HEAT_CIRCLES,
  COMPANY_PINS,
  SEVERITY_LABEL_TR,
  STATUS_TO_HEX,
} from '@/constants/companyPins';
import { colors, fontFamily } from '@/theme';

interface Filter {
  label: string;
  val?: string;
}

const FILTERS: Filter[] = [
  { label: 'Çankaya', val: '4 mahalle' },
  { label: 'Eksik Rampa · Çukur' },
  { label: 'Son 30 gün' },
  { label: '≥ 3 doğrulama' },
];

const SUMMARY = [
  { label: 'Toplam ticket', value: '247', delta: '+18', tone: colors.text.primary },
  { label: 'Doğrulanmış', value: '183', delta: '74%', tone: colors.status.verified },
  { label: 'Etkilenen', value: '~12.4K', delta: 'kişi', tone: colors.role.visuallyImpaired },
];

const CATEGORIES = [
  { label: 'Eksik rampa', pct: 34 },
  { label: 'Çukur', pct: 28 },
  { label: 'Yüzey hasarı', pct: 18 },
  { label: 'Engel', pct: 12 },
  { label: 'Diğer', pct: 8 },
];

export default function CompanyDashboard() {
  const [mode, setMode] = useState<'heat' | 'pin'>('heat');

  const markers = useMemo<AppMapMarker[]>(
    () =>
      COMPANY_PINS.map((p) => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        title: CATEGORY_LABEL_TR[p.category],
        description: `${p.verification_count} doğrulama · ${SEVERITY_LABEL_TR[p.severity]}`,
        pinColor: STATUS_TO_HEX[p.status],
      })),
    [],
  );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>YK</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerLabel}>FİRMA · DASHBOARD</Text>
            <Text style={styles.headerName}>Yapı Kent A.Ş.</Text>
          </View>
          <Pressable style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={17} color={colors.text.primary} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <View key={f.label} style={styles.filterChip}>
              <View style={styles.filterDot} />
              <Text style={styles.filterText}>{f.label}</Text>
              {f.val ? <Text style={styles.filterVal}>· {f.val}</Text> : null}
              <Ionicons name="chevron-down" size={10} color={colors.text.tertiary} />
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
          {SUMMARY.map((c) => (
            <View key={c.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{c.label.toUpperCase()}</Text>
              <Text style={[styles.summaryValue, { color: c.tone }]}>{c.value}</Text>
              <Text style={styles.summaryDelta}>{c.delta}</Text>
            </View>
          ))}
        </View>

        <View style={styles.catPanel} pointerEvents="box-none">
          <Text style={styles.catTitle}>KATEGORİ</Text>
          {CATEGORIES.map((row) => (
            <View key={row.label} style={styles.catRow}>
              <View style={styles.catHead}>
                <Text style={styles.catLabel}>{row.label}</Text>
                <Text style={styles.catPct}>{row.pct}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${row.pct * 2.5}%` }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.toggleWrap} pointerEvents="box-none">
          <Pressable
            style={[styles.toggleBtn, mode === 'heat' && styles.toggleBtnActive]}
            onPress={() => setMode('heat')}
          >
            <Ionicons
              name="flame"
              size={14}
              color={mode === 'heat' ? '#fff' : colors.text.secondary}
            />
            <Text style={[styles.toggleText, mode === 'heat' && styles.toggleTextActive]}>Isı</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, mode === 'pin' && styles.toggleBtnActive]}
            onPress={() => setMode('pin')}
          >
            <Ionicons
              name="location"
              size={14}
              color={mode === 'pin' ? '#fff' : colors.text.secondary}
            />
            <Text style={[styles.toggleText, mode === 'pin' && styles.toggleTextActive]}>Pinler</Text>
          </Pressable>
        </View>

        <View style={styles.fabWrap} pointerEvents="box-none">
          <Pressable style={styles.fab}>
            <View style={styles.fabIcon}>
              <Ionicons name="cart" size={14} color="#fff" />
            </View>
            <Text style={styles.fabText}>Bu Kümeyi Talep Et</Text>
            <View style={styles.fabBadge}>
              <Text style={styles.fabBadgeText}>47</Text>
            </View>
          </Pressable>
        </View>
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
    paddingHorizontal: 16,
  },
  headerRow: {
    paddingTop: 8, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.accent.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamily.display, fontSize: 14, color: colors.text.inverse,
  },
  headerText: { flex: 1 },
  headerLabel: {
    fontFamily: fontFamily.mono, fontSize: 10,
    color: colors.text.tertiary, letterSpacing: 1.2,
  },
  headerName: {
    fontFamily: fontFamily.bodySemiBold, fontSize: 14.5,
    color: colors.text.primary, marginTop: 1,
  },
  bellBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1, borderColor: colors.border.divider,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  bellDot: {
    position: 'absolute', top: 7, right: 8,
    width: 8, height: 8, borderRadius: 99,
    backgroundColor: colors.status.new,
    borderWidth: 1.5, borderColor: colors.bg.secondary,
  },
  filterRow: { gap: 6, paddingBottom: 12 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    backgroundColor: colors.bg.primary,
    borderWidth: 1, borderColor: colors.border.default,
  },
  filterDot: {
    width: 6, height: 6, borderRadius: 99, backgroundColor: colors.accent.primary,
  },
  filterText: {
    fontFamily: fontFamily.bodyMedium, fontSize: 12, color: colors.text.primary,
  },
  filterVal: {
    fontFamily: fontFamily.body, fontSize: 11, color: colors.text.tertiary,
  },

  mapArea: { flex: 1, position: 'relative', overflow: 'hidden' },

  summaryRow: {
    position: 'absolute', top: 12, left: 12, right: 12,
    flexDirection: 'row', gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14, padding: 10,
    shadowColor: '#1A1D24', shadowOpacity: 0.2, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  summaryLabel: {
    fontFamily: fontFamily.mono, fontSize: 9.5,
    color: colors.text.tertiary, letterSpacing: 1, marginBottom: 4,
  },
  summaryValue: {
    fontFamily: fontFamily.displayExtra, fontSize: 22, lineHeight: 22, letterSpacing: -0.4,
  },
  summaryDelta: {
    fontFamily: fontFamily.body, fontSize: 10.5, color: colors.text.secondary, marginTop: 3,
  },

  catPanel: {
    position: 'absolute', top: 124, right: 12, width: 168,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14, padding: 12,
    shadowColor: '#1A1D24', shadowOpacity: 0.25, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  catTitle: {
    fontFamily: fontFamily.mono, fontSize: 9.5,
    color: colors.text.tertiary, letterSpacing: 1, marginBottom: 8,
  },
  catRow: { marginTop: 8 },
  catHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  catLabel: {
    flex: 1, fontFamily: fontFamily.body, fontSize: 11.5, color: colors.text.primary,
  },
  catPct: { fontFamily: fontFamily.mono, fontSize: 10.5, color: colors.text.tertiary },
  barTrack: {
    height: 4, borderRadius: 99,
    backgroundColor: colors.border.divider, overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.accent.primary },

  toggleWrap: {
    position: 'absolute', bottom: 24, left: 16,
    flexDirection: 'row',
    backgroundColor: colors.bg.elevated,
    borderWidth: 1, borderColor: colors.border.default,
    borderRadius: 12, padding: 4,
    shadowColor: '#1A1D24', shadowOpacity: 0.2, shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9,
  },
  toggleBtnActive: { backgroundColor: colors.text.primary },
  toggleText: {
    fontFamily: fontFamily.bodyMedium, fontSize: 12, color: colors.text.secondary,
  },
  toggleTextActive: {
    color: colors.text.inverse, fontFamily: fontFamily.bodySemiBold,
  },

  fabWrap: { position: 'absolute', bottom: 24, right: 16 },
  fab: {
    height: 56, borderRadius: 28,
    paddingHorizontal: 22, paddingLeft: 18,
    backgroundColor: colors.accent.primary,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: colors.accent.primary, shadowOpacity: 0.55, shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 }, elevation: 6,
  },
  fabIcon: {
    width: 30, height: 30, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  fabText: {
    fontFamily: fontFamily.display, fontSize: 14.5, color: colors.text.inverse,
  },
  fabBadge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  fabBadgeText: {
    fontFamily: fontFamily.mono, fontSize: 11, color: '#fff',
  },
});
