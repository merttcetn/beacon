import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';

// AppMap.web kabul ettiği prop'ları sessizce yutar — web'de harita render etmiyoruz.
// İmza native AppMap.tsx ile uyumlu kalsın diye `unknown` tutuyoruz.
export function AppMap(_props: unknown) {
  return (
    <View style={styles.root}>
      <Text style={[typography.bodyMd, { color: colors.text.secondary }]}>
        Harita web'de desteklenmiyor. iOS / Android'de görüntüle.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s6,
  },
});
