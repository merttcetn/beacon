import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { colors, spacing, typography } from '@/theme';

export default function CompanyRequests() {
  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={[typography.displayMd, { color: colors.text.primary }]}>
          Veri talepleri
        </Text>
        <Text style={[typography.bodyMd, { color: colors.text.secondary }]}>
          Geçmiş talepler listesi (MVP'de boş).
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingVertical: spacing.s6, gap: spacing.s2 },
});
