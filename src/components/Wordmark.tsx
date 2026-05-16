import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';

interface Props {
  step?: string;
}

export function Wordmark({ step }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.dots}>
        <View style={[styles.dot, { backgroundColor: colors.role.visuallyImpaired }]} />
        <View style={[styles.dot, { backgroundColor: colors.role.volunteer }]} />
        <View style={[styles.dot, { backgroundColor: colors.role.company }]} />
      </View>
      <Text style={styles.brand}>erişim</Text>
      {step ? <Text style={styles.step}>{step}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 99 },
  brand: {
    fontFamily: fontFamily.displayExtra,
    fontSize: 15,
    color: colors.text.primary,
    letterSpacing: -0.15,
  },
  step: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    marginLeft: 'auto',
  },
});
