import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useUserStore } from '@/stores/userStore';
import { colors, radius, spacing, typography } from '@/theme';

interface PermItem {
  key: 'camera' | 'location';
  title: string;
  reason: string;
  request: () => Promise<boolean>;
}

const ITEMS: PermItem[] = [
  {
    key: 'camera',
    title: 'Kamera',
    reason: 'Yürüyüş asistanı ve problem fotoğrafı için.',
    request: async () => {
      const res = await Camera.requestCameraPermissionsAsync();
      return res.granted;
    },
  },
  {
    key: 'location',
    title: 'Konum',
    reason: 'Yakın çevre bilgisi ve problem konumu için.',
    request: async () => {
      const res = await Location.requestForegroundPermissionsAsync();
      return res.granted;
    },
  },
];

export default function Permissions() {
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const setOnboardingComplete = useUserStore((s) => s.setOnboardingComplete);
  const router = useRouter();

  async function ask(item: PermItem) {
    const ok = await item.request();
    setGranted((g) => ({ ...g, [item.key]: ok }));
  }

  function done() {
    setOnboardingComplete(true);
    router.replace('/');
  }

  return (
    <Screen>
      <View style={styles.wrap}>
        <View style={styles.top}>
          <Text style={[typography.displayMd, { color: colors.text.primary }]}>
            Birkaç izin
          </Text>
          <Text
            style={[
              typography.bodyMd,
              { color: colors.text.secondary, marginTop: spacing.s2 },
            ]}
          >
            Bu izinler olmadan temel özellikler çalışmaz. Daha sonra ayarlardan değiştirilebilir.
          </Text>
        </View>

        <View style={styles.list}>
          {ITEMS.map((item) => (
            <View key={item.key} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.headingSm, { color: colors.text.primary }]}>
                  {item.title}
                </Text>
                <Text
                  style={[
                    typography.bodySm,
                    { color: colors.text.secondary, marginTop: spacing.s1 },
                  ]}
                >
                  {item.reason}
                </Text>
              </View>
              <Button
                label={granted[item.key] ? 'İzinli' : 'İzin ver'}
                variant={granted[item.key] ? 'secondary' : 'primary'}
                size="sm"
                onPress={() => ask(item)}
              />
            </View>
          ))}
        </View>

        <Button label="Devam" size="lg" fullWidth onPress={done} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingVertical: spacing.s6,
    gap: spacing.s6,
    justifyContent: 'space-between',
  },
  top: { gap: spacing.s2 },
  list: { gap: spacing.s3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
    padding: spacing.s4,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    borderColor: colors.border.default,
    borderWidth: 1,
  },
});
