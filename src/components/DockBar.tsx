import { useRouter } from 'expo-router';
import { List, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';

export function DockBar() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe} pointerEvents="box-none">
      <View style={styles.dock}>
        <Pressable
          style={styles.itemPrimary}
          onPress={() => router.push('/volunteer/feedback')}
          accessibilityRole="button"
          accessibilityLabel="Problem bildir"
        >
          <Plus size={18} color={colors.text.inverse} strokeWidth={2.4} />
          <Text style={styles.itemPrimaryText}>Bildir</Text>
        </Pressable>
        <Pressable
          style={styles.item}
          onPress={() => router.push('/volunteer/timeline')}
          accessibilityRole="button"
          accessibilityLabel="Ticket'larım"
        >
          <List size={18} color={colors.text.primary} strokeWidth={2.2} />
          <Text style={styles.itemText}>Ticket'larım</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    backgroundColor: colors.bg.elevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 6,
    gap: 6,
    marginBottom: 14,
    shadowColor: '#1A1D24',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  itemPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.accent.primary,
  },
  itemPrimaryText: {
    fontFamily: fontFamily.display,
    fontSize: 14.5,
    color: colors.text.inverse,
    letterSpacing: 0.2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  itemText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14.5,
    color: colors.text.primary,
  },
});
