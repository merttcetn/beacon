import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { List, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontFamily } from '@/theme';

export function DockBar() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe} pointerEvents="box-none">
      <BlurView
        intensity={82}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={styles.dock}
      >
        <View pointerEvents="none" style={styles.glassSheen} />
        <Pressable
          style={({ pressed }) => [styles.itemPrimary, pressed && styles.itemPressed]}
          onPress={() => router.push('/volunteer/feedback')}
          accessibilityRole="button"
          accessibilityLabel="Problem bildir"
        >
          <View style={styles.primaryIconWrap}>
            <Plus size={17} color={colors.text.inverse} strokeWidth={2.7} />
          </View>
          <Text style={styles.itemPrimaryText}>Bildir</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          onPress={() => router.push('/volunteer/timeline')}
          accessibilityRole="button"
          accessibilityLabel="Ticket'larım"
        >
          <List size={18} color={colors.text.primary} strokeWidth={2.25} />
          <Text style={styles.itemText}>Ticket'larım</Text>
        </Pressable>
      </BlurView>
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
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    padding: 7,
    gap: 7,
    marginBottom: 13,
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
  itemPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minWidth: 118,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: 'rgba(31,58,95,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: colors.accent.primary,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryIconWrap: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPrimaryText: {
    fontFamily: fontFamily.display,
    fontSize: 14.5,
    color: colors.text.inverse,
    letterSpacing: 0.15,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 126,
    justifyContent: 'center',
    paddingHorizontal: 15,
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
});
