import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { nanoid } from 'nanoid/non-secure';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { submitTicketReport } from '@/lib/n8n';
import { useTicketStore } from '@/stores/ticketStore';
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily, radius, spacing } from '@/theme';
import type { AffectedUser, IssueType, Severity, Ticket } from '@/types';

type SubmitPhase =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success'; ticketId: string; sentCount: number }
  | { kind: 'error' };

const SCORE_FROM_SEVERITY: Record<Severity, number> = {
  high: 3,
  medium: 5,
  low: 7,
};

interface CategoryDef {
  id: IssueType;
  label: string;
  icon: keyof typeof CATEGORY_ICONS;
}

const CATEGORY_ICONS = {
  rampOff: 'walk',
  pothole: 'ellipse-outline',
  uneven: 'pulse',
  obstacle: 'alert',
  tactile: 'grid',
  water: 'water',
  narrow: 'remove',
  equipment: 'fitness',
  other: 'help',
} as const;

const CATEGORIES: CategoryDef[] = [
  { id: 'missing_ramp', label: 'Eksik rampa', icon: 'rampOff' },
  { id: 'pothole', label: 'Çukur', icon: 'pothole' },
  { id: 'uneven_surface', label: 'Yüzey hasarı', icon: 'uneven' },
  { id: 'obstacle', label: 'Engel', icon: 'obstacle' },
  { id: 'missing_tactile_paving', label: 'Sarı dokunsal eksik', icon: 'tactile' },
  { id: 'water_pooling', label: 'Su birikintisi', icon: 'water' },
  { id: 'narrow_passage', label: 'Dar geçit', icon: 'narrow' },
  { id: 'damaged_equipment', label: 'Hasarlı ekipman', icon: 'equipment' },
  { id: 'other', label: 'Diğer', icon: 'other' },
];

const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'düşük önem',
  medium: 'orta önem',
  high: 'yüksek önem',
};

const SEVERITY_COLOR: Record<Severity, string> = {
  low: colors.status.verified,
  medium: colors.status.partial,
  high: colors.status.new,
};

interface AffectedDef {
  id: AffectedUser;
  label: string;
  icon: 'accessibility' | 'eye-off-outline' | 'cart-outline' | 'walk-outline';
}

const AFFECTED: AffectedDef[] = [
  { id: 'wheelchair', label: 'Tekerlekli sandalye', icon: 'accessibility' },
  { id: 'visually_impaired', label: 'Görme engelli', icon: 'eye-off-outline' },
  { id: 'stroller', label: 'Bebek arabası', icon: 'cart-outline' },
  { id: 'elderly', label: 'Yaşlı', icon: 'walk-outline' },
];

export default function NewTicket() {
  const params = useLocalSearchParams<{ photoUri?: string; lat?: string; lon?: string }>();
  const router = useRouter();
  const addTicket = useTicketStore((s) => s.addTicket);
  const userRole = useUserStore((s) => s.role);

  const lat = params.lat ? Number(params.lat) : 39.8763;
  const lon = params.lon ? Number(params.lon) : 32.7559;
  const photoUri = params.photoUri;

  // VLM mock varsayılanları (sabit). Kullanıcı düzenleyebilir.
  const [category, setCategory] = useState<IssueType>('missing_ramp');
  const [severity, setSeverity] = useState<Severity>('high');
  const [affected, setAffected] = useState<Set<AffectedUser>>(
    () => new Set(['wheelchair', 'visually_impaired']),
  );
  const [description, setDescription] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>({ kind: 'idle' });

  const currentCat = useMemo(
    () => CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0],
    [category],
  );

  function toggleAffected(id: AffectedUser) {
    Haptics.selectionAsync();
    setAffected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (submitPhase.kind === 'sending') return;
    setSubmitPhase({ kind: 'sending' });

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const now = new Date().toISOString();
    const transcript = description.trim() || currentCat.label;

    // Lokal kayıt (mevcut davranış) — n8n başarısız olsa bile korunur
    const ticket: Ticket = {
      id: nanoid(12),
      created_by: 'demo-volunteer',
      location: { latitude: lat, longitude: lon },
      issue_type: category,
      severity,
      affected_users: Array.from(affected),
      description_tr: transcript,
      photo_urls: photoUri ? [photoUri] : [],
      confidence: 0.85,
      source: 'user_volunteer',
      verification_count: 1,
      verified: false,
      status: 'open',
      created_at: now,
      updated_at: now,
    };
    addTicket(ticket);

    // n8n webhook'una bildir — fail-soft
    try {
      const result = await submitTicketReport({
        transcript,
        categorization: {
          has_damage: true,
          issues: [
            {
              type: category,
              severity,
              affected_users: Array.from(affected),
              description_tr: transcript,
              confidence: 0.85,
            },
          ],
          overall_accessibility_score: SCORE_FROM_SEVERITY[severity],
        },
        location: { lat, lon },
        timestamp: now,
        user: { role: userRole ?? 'volunteer' },
      });
      setSubmitPhase({
        kind: 'success',
        ticketId: result.ticket_id,
        sentCount: result.sent_count,
      });
    } catch (err) {
      console.warn('[n8n submit failed]', err);
      setSubmitPhase({ kind: 'error' });
    }

    setTimeout(() => router.replace('/volunteer'), 1800);
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerBack}
            accessibilityRole="button"
            accessibilityLabel="Geri"
          >
            <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Yeni Ticket</Text>
          <View style={styles.headerBack} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Hero photo */}
        <View style={styles.heroWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.heroPhoto} contentFit="cover" />
          ) : (
            <View style={[styles.heroPhoto, styles.heroPlaceholder]}>
              <Ionicons name="image-outline" size={32} color={colors.text.tertiary} />
              <Text style={styles.heroPlaceholderText}>Fotoğraf yok</Text>
            </View>
          )}
        </View>

        {/* VLM tespit kartı */}
        <View style={styles.detectCard}>
          <View style={styles.detectHead}>
            <Text style={styles.detectLabel}>VLM TESPİTİ · DÜZENLENEBİLİR</Text>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: SEVERITY_COLOR[severity] + '1F' },
              ]}
            >
              <Text style={[styles.severityText, { color: SEVERITY_COLOR[severity] }]}>
                {SEVERITY_LABEL[severity]}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.detectMain}
            onPress={() => setPickerOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityLabel={`Kategori: ${currentCat.label}. Değiştirmek için dokun`}
          >
            <View style={styles.detectIcon}>
              <Ionicons
                name={CATEGORY_ICONS[currentCat.icon]}
                size={22}
                color={colors.accent.primary}
              />
            </View>
            <View style={styles.detectTextWrap}>
              <Text style={styles.detectTitle}>{currentCat.label}</Text>
              <Text style={styles.detectHint}>
                {pickerOpen ? 'Kapat' : 'Kategoriyi değiştir'}
              </Text>
            </View>
            <Ionicons
              name={pickerOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.text.tertiary}
            />
          </Pressable>

          {pickerOpen ? (
            <View style={styles.pickerGrid}>
              {CATEGORIES.map((c) => {
                const active = c.id === category;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategory(c.id);
                      setPickerOpen(false);
                    }}
                    style={[styles.pickerChip, active && styles.pickerChipActive]}
                  >
                    <Ionicons
                      name={CATEGORY_ICONS[c.icon]}
                      size={14}
                      color={active ? colors.text.inverse : colors.text.primary}
                    />
                    <Text
                      style={[
                        styles.pickerChipText,
                        active && { color: colors.text.inverse },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Severity row */}
          <View style={styles.severityRow}>
            {(['low', 'medium', 'high'] as Severity[]).map((s) => {
              const active = s === severity;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSeverity(s);
                  }}
                  style={[
                    styles.sevBtn,
                    active && {
                      backgroundColor: SEVERITY_COLOR[s] + '1F',
                      borderColor: SEVERITY_COLOR[s],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sevBtnText,
                      active && { color: SEVERITY_COLOR[s] },
                    ]}
                  >
                    {SEVERITY_LABEL[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Etkilenen kullanıcılar */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ETKİLENEN KULLANICILAR</Text>
          <View style={styles.affRow}>
            {AFFECTED.map((a) => {
              const active = affected.has(a.id);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => toggleAffected(a.id)}
                  style={[
                    styles.affChip,
                    active
                      ? { backgroundColor: colors.text.primary }
                      : {
                          backgroundColor: colors.bg.secondary,
                          borderWidth: 1,
                          borderColor: colors.border.divider,
                        },
                  ]}
                >
                  <Ionicons
                    name={a.icon}
                    size={14}
                    color={active ? colors.text.inverse : colors.text.primary}
                  />
                  <Text
                    style={[
                      styles.affLabel,
                      { color: active ? colors.text.inverse : colors.text.primary },
                    ]}
                  >
                    {a.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Konum kartı */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>KONUM</Text>
          <View style={styles.locCard}>
            <View style={styles.locIcon}>
              <Ionicons name="locate" size={18} color={colors.status.verified} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.locCoords}>
                {lat.toFixed(5)}, {lon.toFixed(5)}
              </Text>
              <Text style={styles.locName}>ODTÜ Teknokent civarı</Text>
            </View>
          </View>
        </View>

        {/* Açıklama */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AÇIKLAMA · OPSİYONEL</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ek bilgi ekle — örn. çukurun derinliği, çevresindeki referans nokta"
            placeholderTextColor={colors.text.tertiary}
            multiline
            style={styles.textInput}
          />
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.submitSafe}>
        {submitPhase.kind === 'error' ? (
          <View style={[styles.statusBanner, styles.statusBannerError]}>
            <Ionicons name="warning" size={14} color={colors.status.partial} />
            <Text style={styles.statusBannerText}>
              Bildirim iletilemedi. Kayıt yerel olarak alındı.
            </Text>
          </View>
        ) : null}
        {submitPhase.kind === 'success' ? (
          <View style={[styles.statusBanner, styles.statusBannerSuccess]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.status.verified} />
            <Text style={styles.statusBannerText}>
              {submitPhase.sentCount} kuruma iletildi · ID {submitPhase.ticketId.slice(-6)}
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={submit}
          disabled={submitPhase.kind === 'sending'}
          accessibilityRole="button"
          accessibilityLabel="Ticket'ı gönder"
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && { opacity: 0.92 },
            submitPhase.kind === 'sending' && { opacity: 0.85 },
          ]}
        >
          {submitPhase.kind === 'sending' ? (
            <>
              <ActivityIndicator size="small" color={colors.text.inverse} />
              <Text style={styles.submitText}>Gönderiliyor…</Text>
            </>
          ) : submitPhase.kind === 'success' ? (
            <>
              <Ionicons name="checkmark" size={18} color={colors.text.inverse} />
              <Text style={styles.submitText}>İletildi</Text>
            </>
          ) : submitPhase.kind === 'error' ? (
            <>
              <Ionicons name="alert-circle" size={18} color={colors.text.inverse} />
              <Text style={styles.submitText}>Kapatılıyor…</Text>
            </>
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color={colors.text.inverse} />
              <Text style={styles.submitText}>Gönder</Text>
            </>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },

  headerSafe: {
    backgroundColor: colors.bg.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.divider,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.display,
    fontSize: 17,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },

  scroll: {
    padding: spacing.s4,
    gap: spacing.s4,
    paddingBottom: spacing.s8,
  },

  heroWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.bg.secondary,
  },
  heroPhoto: { width: '100%', height: 240 },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s2,
  },
  heroPlaceholderText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.text.tertiary,
  },

  detectCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 14,
    gap: 12,
  },
  detectHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detectLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.text.tertiary,
    letterSpacing: 1.2,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  detectMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectTextWrap: { flex: 1 },
  detectTitle: {
    fontFamily: fontFamily.display,
    fontSize: 19,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  detectHint: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },

  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border.divider,
  },
  pickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
  pickerChipActive: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  pickerChipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.text.primary,
  },

  severityRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sevBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.divider,
    alignItems: 'center',
  },
  sevBtnText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11.5,
    color: colors.text.secondary,
    letterSpacing: 0.3,
  },

  section: { gap: 8 },
  sectionLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 10.5,
    color: colors.text.tertiary,
    letterSpacing: 1.3,
  },

  affRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  affChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 99,
  },
  affLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12.5,
  },

  locCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.divider,
    padding: 12,
  },
  locIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.status.verified + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locCoords: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  locName: {
    fontFamily: fontFamily.body,
    fontSize: 12.5,
    color: colors.text.secondary,
    marginTop: 2,
  },

  textInput: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    padding: 12,
    minHeight: 80,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.text.primary,
    textAlignVertical: 'top',
  },

  submitSafe: {
    backgroundColor: colors.bg.elevated,
    borderTopWidth: 1,
    borderTopColor: colors.border.divider,
  },
  submitBtn: {
    margin: spacing.s4,
    marginTop: spacing.s3,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.accent.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: colors.accent.primary,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  submitText: {
    fontFamily: fontFamily.display,
    fontSize: 16,
    color: colors.text.inverse,
    letterSpacing: 0.2,
  },

  statusBanner: {
    marginHorizontal: spacing.s4,
    marginTop: spacing.s3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  statusBannerSuccess: {
    backgroundColor: colors.status.verified + '14',
    borderColor: colors.status.verified + '40',
  },
  statusBannerError: {
    backgroundColor: colors.status.partial + '14',
    borderColor: colors.status.partial + '40',
  },
  statusBannerText: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12.5,
    color: colors.text.primary,
  },
});
