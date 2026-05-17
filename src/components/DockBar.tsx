import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Navigation, Plus, Ticket } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';

interface DockBarProps {
  onRecenter?: () => void;
}

export function DockBar({ onRecenter }: DockBarProps) {
  const router = useRouter();

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe} pointerEvents="box-none">
      <View style={styles.row} pointerEvents="box-none">
        {onRecenter ? (
          <Pressable
            style={({ pressed }) => [styles.fab, styles.fabLeft, pressed && styles.fabPressed]}
            onPress={onRecenter}
            accessibilityRole="button"
            accessibilityLabel="Konumuma git"
          >
            <Navigation
              size={22}
              color={colors.text.inverse}
              strokeWidth={2.4}
              fill={colors.text.inverse}
            />
          </Pressable>
        ) : null}

        <BlurView
          intensity={82}
          tint="light"
          experimentalBlurMethod="dimezisBlurView"
          style={styles.dock}
        >
          <View pointerEvents="none" style={styles.glassSheen} />
          <Pressable
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            onPress={() => router.push('/volunteer/timeline')}
            accessibilityRole="button"
            accessibilityLabel="Ticket'larım"
          >
            <Ticket size={18} color={colors.text.primary} strokeWidth={2.25} />
            <Text style={styles.itemText}>Ticket'larım</Text>
          </Pressable>
        </BlurView>

        <Pressable
          style={({ pressed }) => [styles.fab, styles.fabRight, pressed && styles.fabPressed]}
          onPress={() => router.push('/volunteer/feedback')}
          accessibilityRole="button"
          accessibilityLabel="Problem bildir"
        >
          <Plus size={26} color={colors.text.inverse} strokeWidth={2.8} />
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 13,
    position: 'relative',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    padding: 7,
    overflow: 'hidden',
    shadowColor: '#1A1D24',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  glassSheen: {
    position: 'absolute',
    top: 1,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 140,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: 'rgba(250,247,242,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(26,29,36,0.06)',
  },
  itemText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14.5,
    color: colors.text.primary,
  },
  itemPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31,58,95,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: colors.accent.primary,
    shadowOpacity: 0.38,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  fabRight: { right: 20 },
  fabLeft: { left: 20 },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
