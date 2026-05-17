import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  CheckCircle2,
  ChevronLeft,
  FileText,
  Flame,
  Layers,
  Send,
  UserRound,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppMap, type AppMapMarker } from '@/components/AppMap';
import {
  COMPANY_HEAT_CIRCLES,
  COMPANY_PINS,
  STATUS_TO_HEX,
} from '@/constants/companyPins';
import { COMPANY_BRIEF } from '@/constants/companyMarketplace';
import { colors, fontFamily, radius } from '@/theme';

const SNAP_POINTS = ['12%', '40%'];

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

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rol seçimi"
            onPress={() => router.replace('/onboarding')}
            style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
          >
            <ChevronLeft size={17} color={colors.accent.primary} strokeWidth={2.5} />
            <Text style={styles.backLinkText}>Rol seçimi</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Pano</Text>

          <View style={styles.headerNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Talepler"
              onPress={() => router.push('/company/requests')}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            >
              <FileText size={16} color={colors.text.primary} strokeWidth={2.3} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profil"
              onPress={() => router.push('/company/profile')}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            >
              <UserRound size={16} color={colors.text.primary} strokeWidth={2.3} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.mapArea}>
        <AppMap
          markers={mode === 'pin' ? markers : undefined}
          circles={mode === 'heat' ? COMPANY_HEAT_CIRCLES : undefined}
        />

        <BottomSheet
          ref={sheetRef}
          index={1}
          snapPoints={SNAP_POINTS}
          enableDynamicSizing={false}
          enablePanDownToClose={false}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.sheetHandleBar}
          handleStyle={styles.sheetHandle}
        >
          <BottomSheetView style={styles.sheetContent}>
            <View style={styles.sheetTopRow}>
              <View style={styles.briefLine}>
                <Text style={styles.briefTitle} numberOfLines={1}>
                  {COMPANY_BRIEF.title}
                </Text>
                <Text style={styles.briefText} numberOfLines={1}>
                  {COMPANY_BRIEF.description}
                </Text>
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
            </Pressable>
          </BottomSheetView>
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
  backLink: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.elevated,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
  },
  backLinkText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamily.displayExtra,
    fontSize: 17,
    color: colors.text.primary,
    textAlign: 'center',
  },
  headerNav: {
    flexDirection: 'row',
    gap: 7,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapArea: { flex: 1, position: 'relative', overflow: 'hidden' },

  sheetBg: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border.divider,
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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
    gap: 14,
  },

  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  briefLine: { flex: 1, gap: 2 },
  briefTitle: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 16,
    lineHeight: 20,
    color: colors.text.primary,
  },
  briefText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.text.secondary,
  },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    backgroundColor: colors.bg.secondary,
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

  cta: {
    minHeight: 58,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.accent.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaSuccess: {
    backgroundColor: colors.status.verified,
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
});
