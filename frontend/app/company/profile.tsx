import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import {
  COMPANY_ACCOUNT_ROWS,
  COMPANY_ACCOUNT_STATS,
} from '@/constants/companyMarketplace';
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily, radius, spacing } from '@/theme';

export default function CompanyProfile() {
  const reset = useUserStore((s) => s.reset);
  const router = useRouter();

  function logout() {
    reset();
    router.replace('/onboarding');
  }

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

        <View style={styles.accountHero}>
          <View style={styles.heroTop}>
            <View style={styles.companyMark}>
              <Building2 size={22} color={colors.text.inverse} strokeWidth={2.3} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>KURUMSAL HESAP</Text>
              <Text style={styles.companyName}>Yapı Kent A.Ş.</Text>
              <Text style={styles.companyMeta}>İnşaat & altyapı · Ankara</Text>
            </View>
          </View>

          <View style={styles.trustBand}>
            <ShieldCheck size={16} color={colors.status.verified} strokeWidth={2.5} />
            <View style={styles.trustCopy}>
              <Text style={styles.trustTitle}>Anonim veri erişimi</Text>
              <Text style={styles.trustText}>Kimliksiz ticket kümeleri ve ticari talep kaydı.</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {COMPANY_ACCOUNT_STATS.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Hesap bilgileri</Text>
          <Text style={styles.sectionMeta}>Demo</Text>
        </View>

        <View style={styles.infoList}>
          {COMPANY_ACCOUNT_ROWS.map((row, index) => (
            <View key={row.label} style={styles.infoRow}>
              <View style={styles.rowIcon}>
                {index === 0 ? (
                  <FileText size={15} color={colors.accent.primary} strokeWidth={2.4} />
                ) : index === 1 ? (
                  <MapPin size={15} color={colors.status.partial} strokeWidth={2.4} />
                ) : index === 2 ? (
                  <LockKeyhole size={15} color={colors.status.verified} strokeWidth={2.4} />
                ) : (
                  <Mail size={15} color={colors.role.visuallyImpaired} strokeWidth={2.4} />
                )}
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
              <ChevronRight size={17} color={colors.text.tertiary} strokeWidth={2.2} />
            </View>
          ))}
        </View>

        <View style={styles.teamPanel}>
          <View style={styles.teamIcon}>
            <Users size={18} color={colors.text.inverse} strokeWidth={2.5} />
          </View>
          <View style={styles.teamCopy}>
            <Text style={styles.teamTitle}>Satın alma çalışma alanı</Text>
            <Text style={styles.teamText}>
              8 kullanıcı, saha sinyali ve örnek veri taleplerini aynı demo hesabında takip ediyor.
            </Text>
          </View>
        </View>

        <Button
          label="Rolü değiştir / çıkış"
          variant="ghost"
          size="md"
          leftIcon={<LogOut size={18} color={colors.text.primary} strokeWidth={2.3} />}
          onPress={logout}
          fullWidth
          style={styles.logoutBtn}
        />
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
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  accountHero: {
    borderRadius: radius.sm,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.s4,
    gap: spacing.s4,
    shadowColor: '#1A1D24',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  companyMark: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1 },
  eyebrow: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    color: colors.text.tertiary,
  },
  companyName: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 25,
    lineHeight: 31,
    color: colors.text.primary,
    marginTop: 1,
  },
  companyMeta: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 1,
  },
  trustBand: {
    borderRadius: radius.sm,
    backgroundColor: '#EAF7F1',
    borderWidth: 1,
    borderColor: '#CFE9DF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    padding: spacing.s3,
  },
  trustCopy: { flex: 1 },
  trustTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  trustText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.s2,
  },
  statCard: {
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: '#11171F',
    padding: spacing.s3,
  },
  statValue: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 22,
    color: colors.text.inverse,
  },
  statLabel: {
    fontFamily: fontFamily.body,
    fontSize: 11.5,
    color: '#B9C7D6',
    marginTop: 1,
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
  infoList: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.elevated,
  },
  infoRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingHorizontal: spacing.s4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.divider,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: { flex: 1 },
  infoLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    color: colors.text.primary,
  },
  infoValue: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.text.secondary,
    marginTop: 1,
  },
  teamPanel: {
    borderRadius: radius.sm,
    backgroundColor: '#F8F1E2',
    borderWidth: 1,
    borderColor: '#E9D7AD',
    padding: spacing.s4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
  },
  teamIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.status.partial,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamCopy: { flex: 1 },
  teamTitle: {
    fontFamily: fontFamily.display,
    fontSize: 15,
    color: colors.text.primary,
  },
  teamText: {
    fontFamily: fontFamily.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.text.secondary,
    marginTop: 2,
  },
  logoutBtn: {
    borderColor: colors.border.default,
    backgroundColor: colors.bg.elevated,
  },
});
