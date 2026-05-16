import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useUserStore } from '@/stores/userStore';
import { colors, spacing, typography } from '@/theme';

export default function CompanyProfile() {
  const reset = useUserStore((s) => s.reset);
  const router = useRouter();

  function logout() {
    reset();
    router.replace('/onboarding');
  }

  return (
    <Screen>
      <View style={styles.wrap}>
        <View style={styles.top}>
          <Text style={[typography.displayMd, { color: colors.text.primary }]}>
            Profil
          </Text>
          <Text style={[typography.bodyMd, { color: colors.text.secondary }]}>
            Rol: Firma
          </Text>
        </View>
        <Button label="Rolü değiştir / çıkış" variant="ghost" size="md" onPress={logout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingVertical: spacing.s6,
    justifyContent: 'space-between',
  },
  top: { gap: spacing.s2 },
});
