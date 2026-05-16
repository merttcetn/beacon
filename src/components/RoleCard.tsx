import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import type { UserRole } from '@/types';

interface Props {
  role: UserRole;
  title: string;
  description: string;
  emoji: string;
  selected?: boolean;
  onPress: () => void;
}

export function RoleCard({ role, title, description, emoji, selected, onPress }: Props) {
  const accent = colors.role[
    role === 'visually_impaired' ? 'visuallyImpaired' : role
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadows.sm,
        selected && { borderColor: accent, borderWidth: 2 },
        pressed && { backgroundColor: colors.bg.secondary },
      ]}
    >
      <View style={[styles.emojiBubble, { backgroundColor: accent }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={[typography.headingMd, { color: colors.text.primary }]}>{title}</Text>
        <Text style={[typography.bodyMd, { color: colors.text.secondary }]}>
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    padding: spacing.s4,
    gap: spacing.s4,
    borderColor: colors.border.default,
    borderWidth: 1,
    minHeight: 96,
  },
  emojiBubble: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  textWrap: { flex: 1, gap: spacing.s1 },
});
