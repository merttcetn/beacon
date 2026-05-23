import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Database,
  FileText,
  Mail,
  Send,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { COMPANY_REQUESTS } from '@/constants/companyMarketplace';
import { colors, fontFamily, radius, spacing } from '@/theme';

export default function CompanyRequests() {
  const router = useRouter();

  return (
    <Screen scroll>
      <View style={styles.wrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pano"
          onPress={() => router.replace('/company')}
          style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
        >
          <ChevronLeft size={17} color={colors.accent.primary} strokeWidth={2.5} />
          <Text style={styles.backLinkText}>Pano</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Database size={18} color={colors.text.inverse} strokeWidth={2.4} />
            </View>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.eyebrow}>VERİ TALEP MERKEZİ</Text>
              <Text style={styles.title}>Talep akışı</Text>
            </View>
          </View>
          <Text style={styles.heroText}>
            Aktif filtre kümeleri mail kuyruğuna düşer, örnek veri paketi demo hesabına gönderilir.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>3</Text>
              <Text style={styles.heroStatLabel}>aktif talep</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>96</Text>
              <Text style={styles.heroStatLabel}>sinyal</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>9dk</Text>
              <Text style={styles.heroStatLabel}>ortalama</Text>
            </View>
          </View>
        </View>

        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.newRequest, pressed && styles.pressed]}>
          <View style={styles.newRequestIcon}>
            <Send size={16} color={colors.text.inverse} strokeWidth={2.4} />
          </View>
          <View style={styles.newRequestCopy}>
            <Text style={styles.newRequestTitle}>Yeni seçili kümeyi talep et</Text>
            <Text style={styles.newRequestSub}>Çankaya · 47 ticket · admin bildirimi</Text>
          </View>
          <Text style={styles.newRequestBadge}>MVP</Text>
        </Pressable>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Geçmiş talepler</Text>
          <Text style={styles.sectionMeta}>Son 30 gün</Text>
        </View>

        {COMPANY_REQUESTS.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHead}>
              <View style={styles.requestTopLine}>
                <Text style={styles.requestId}>{request.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${request.statusTone}18` }]}>
                  <View style={[styles.statusDot, { backgroundColor: request.statusTone }]} />
                  <Text style={[styles.statusText, { color: request.statusTone }]}>
                    {request.statusLabel}
                  </Text>
                </View>
              </View>
              <Text style={styles.requestTitle}>{request.title}</Text>
            </View>

            <View style={styles.requestMetaGrid}>
              <View style={styles.metaCell}>
                <FileText size={13} color={colors.accent.primary} strokeWidth={2.4} />
                <Text style={styles.metaValue}>{request.count}</Text>
              </View>
              <View style={styles.metaCell}>
                <Clock3 size={13} color={colors.status.partial} strokeWidth={2.4} />
                <Text style={styles.metaValue}>{request.createdAt}</Text>
              </View>
              <View style={styles.metaCellWide}>
                <Mail size={13} color={colors.status.verified} strokeWidth={2.4} />
                <Text style={styles.metaValue} numberOfLines={1}>
                  {request.contact}
                </Text>
              </View>
            </View>

            <View style={styles.filterList}>
              {request.filters.map((filter) => (
                <Text key={filter} style={styles.filterPill}>
                  {filter}
                </Text>
              ))}
            </View>

            <View style={styles.requestFoot}>
              <View style={styles.valueBlock}>
                <Text style={styles.valueLabel}>Değer sinyali</Text>
                <Text style={styles.valueText}>{request.value}</Text>
              </View>
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${request.progress * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(request.progress * 100)}%</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.logPanel}>
          <CheckCircle2 size={17} color={colors.status.verified} strokeWidth={2.5} />
          <View style={styles.logCopy}>
            <Text style={styles.logTitle}>Bildirim gönderildi</Text>
            <Text style={styles.logText}>n8n akışı demo modunda simüle edildi.</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s8,
    gap: spacing.s4,
  },
  backLink: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.elevated,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
  },
  backLinkText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  hero: {
    borderRadius: radius.sm,
    backgroundColor: '#11171F',
    padding: spacing.s4,
    gap: spacing.s4,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleWrap: { flex: 1 },
  eyebrow: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: '#9FB1C4',
  },
  title: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text.inverse,
  },
  heroText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: '#D3DBE5',
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing.s2,
  },
  heroStat: {
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: spacing.s3,
  },
  heroStatValue: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 20,
    color: colors.text.inverse,
  },
  heroStatLabel: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: '#B9C7D6',
    marginTop: 1,
  },
  newRequest: {
    minHeight: 64,
    borderRadius: 32,
    backgroundColor: colors.accent.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s4,
    gap: spacing.s3,
    shadowColor: colors.accent.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 5,
  },
  pressed: { transform: [{ scale: 0.99 }] },
  newRequestIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newRequestCopy: { flex: 1 },
  newRequestTitle: {
    fontFamily: fontFamily.display,
    fontSize: 14.5,
    color: colors.text.inverse,
  },
  newRequestSub: {
    fontFamily: fontFamily.body,
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.76)',
    marginTop: 1,
  },
  newRequestBadge: {
    overflow: 'hidden',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: colors.text.inverse,
    fontFamily: fontFamily.monoBold,
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 20,
    color: colors.text.primary,
  },
  sectionMeta: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  requestCard: {
    borderRadius: radius.sm,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.s4,
    gap: spacing.s3,
    shadowColor: '#1A1D24',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  requestHead: {
    gap: 5,
  },
  requestTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s2,
  },
  requestId: {
    fontFamily: fontFamily.monoBold,
    fontSize: 10,
    color: colors.text.tertiary,
  },
  requestTitle: {
    fontFamily: fontFamily.display,
    fontSize: 16,
    lineHeight: 21,
    color: colors.text.primary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  statusText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 10.5,
  },
  requestMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
  },
  metaCell: {
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  metaCellWide: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  metaValue: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11.5,
    color: colors.text.secondary,
  },
  filterList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
  },
  filterPill: {
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: colors.bg.secondary,
    color: colors.text.secondary,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  requestFoot: {
    borderTopWidth: 1,
    borderTopColor: colors.border.divider,
    paddingTop: spacing.s3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  valueBlock: { flex: 1 },
  valueLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 9.5,
    color: colors.text.tertiary,
  },
  valueText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12.5,
    color: colors.text.primary,
    marginTop: 2,
  },
  progressWrap: {
    width: 96,
    alignItems: 'flex-end',
    gap: 4,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.border.divider,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.status.verified,
  },
  progressText: {
    fontFamily: fontFamily.monoBold,
    fontSize: 10,
    color: colors.text.tertiary,
  },
  logPanel: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#CFE9DF',
    backgroundColor: '#EAF7F1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    padding: spacing.s4,
  },
  logCopy: { flex: 1 },
  logTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  logText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
});
