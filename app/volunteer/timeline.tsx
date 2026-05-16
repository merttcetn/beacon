import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { colors, spacing, typography } from '@/theme';

export default function Timeline() {
  return (
    <Screen scroll>
      <View style={styles.wrap}>
        <Text style={[typography.displayMd, { color: colors.text.primary }]}>
          Akış
        </Text>
        <Text style={[typography.bodyMd, { color: colors.text.secondary }]}>
          Son tespit edilen ticket'lar zaman sırasıyla burada görünecek.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.s6, gap: spacing.s2 },
});
