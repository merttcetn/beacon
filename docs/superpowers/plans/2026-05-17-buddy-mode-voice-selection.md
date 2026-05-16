# Buddy Mode — Sesli Mod Seçimi (Yürüyüş / Spor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buddy ekranını "AI çağrı merkezi gibi" bir state machine'e dönüştür: ilk açılışta DURDUR pasif, TTS kullanıcıya "Ne yapmak istersin? Spor mu, Yürüyüş mü?" diye sorar. Cevap (mock STT) Yürüyüş ise süre sorar ve sorunsuz rota önerir; Spor ise en yakın spor alanına yönlendirir, alet anlatımları yapar, "Sıradaki hareket" ile aletleri döndürür.

**Architecture:** Tek dosya state machine (`app/buddy/index.tsx`). `BuddyState` discriminated union ile sahne yönetilir; her sahne `speak_text`, opsiyonel kullanıcı seçim chip'leri ve `stopEnabled` değerini belirler. TTS metinleri ve mock aletler tek dosyada (`src/constants/buddyScripts.ts`) sabit. Mock STT: chip'lere tap → seçim animasyonu (1.2 sn dinleme efekti) → state transition. Gerçek STT/VLM/konum bağlanmıyor (CLAUDE.md `MOCK:` prensibi).

**Tech Stack:** Expo SDK 54, Expo Router, expo-speech (TTS), expo-haptics, react-native-reanimated (mevcut waveform/glow), TypeScript.

**Tamamlandığında demo akışı:**
1. Görme engelli rolü seçilir → buddy ekranı açılır
2. TTS: "Ne yapmak istersin? Birinci: spor. İkinci: yürüyüş." (DURDUR pasif)
3. Demoer ekrandaki "1 · Spor" veya "2 · Yürüyüş" chip'ine basar (mock STT)
4. Yürüyüş seçilirse → süre sorusu → rota onayı → mevcut yürüyüş uyarı akışı, DURDUR aktif
5. Spor seçilirse → yönlendirme → alet 1 anlatımı → "Sıradaki hareket" → alet 2 anlatımı → ... → tamamlandı, DURDUR aktif

---

## File Structure

| Path | Status | Sorumluluğu |
|---|---|---|
| `src/constants/buddyScripts.ts` | **Create** | TTS metinleri, mock yürüyüş uyarıları, mock spor alet listesi. Sabitler. |
| `app/buddy/index.tsx` | **Rewrite** | State machine, sahne render, mock STT (chip taps), TTS orkestrasyonu, DURDUR enable/disable. |

> Mevcut `app/buddy/index.tsx` SVG glow + halkalar + waveform + DURDUR hold gesture UI'ı korunur — sadece "ne göstereceği" state'e bağlanır.

---

## Task 1 — Mock script sabitleri

**Files:**
- Create: `src/constants/buddyScripts.ts`

- [ ] **Step 1: Dosyayı oluştur**

```typescript
// src/constants/buddyScripts.ts
// MOCK: Buddy Mode için tüm TTS metinleri ve sahte aletler.
// Gerçek VLM/STT/konum bağlanmıyor — hackathon demo amaçlı sabit script'ler.

export const BUDDY_SCRIPTS = {
  // 1. Açılış — mod seçimi
  modeQuestion:
    'Merhaba. Bugün ne yapmak istersin? Birinci seçenek, spor. İkinci seçenek, yürüyüş.',

  // 2. Yürüyüş akışı
  walkDurationQuestion: 'Kaç dakika yürümek istersin?',
  walkRouteFound: (mins: number) =>
    `Tamam. Çevrende en az sorun olan, düz bir alanda ${mins} dakikalık bir rota buldum. Şimdi başlıyoruz.`,
  walkWarnings: [
    'Yaklaşık 5 metre ileride, sağında geniş bir çukur var.',
    'Az ileride sarı dokunsal yüzeye gireceksin, 12 metre.',
    'Sağında bir bank var, yaklaşık 2 metre mesafede.',
    'Yolun düz devam ediyor, herhangi bir engel görmüyorum.',
  ],

  // 3. Spor akışı
  sportSearching:
    'En yakın spor yapabileceğin alanları seçiyorum. Yaklaşık 120 metre ileride, açık alan spor parkı var. Seni oraya yönlendiriyorum.',
  sportArrived:
    'Spor alanına geldin. Karşında ilk alet var.',
  sportDone:
    'Bütün aletleri bitirdin. Harika iş çıkardın.',
  sportNextCue: 'Tamam, başka bir harekete geçelim.',
} as const;

export interface SportEquipment {
  name: string;
  speakText: string;
}

// MOCK: VLM görsel tanıma yerine elle yazılmış aletler.
export const SPORT_EQUIPMENTS: SportEquipment[] = [
  {
    name: 'Bisiklet aleti',
    speakText:
      'Karşında sabit bir bisiklet aleti var. Önce selesine otur, ayaklarını pedallara yerleştir, gidona iki elinle tutun. Sonra pedalları öne doğru çevirmeye başla. Bacak kaslarını çalıştırır.',
  },
  {
    name: 'Bel rotasyon aleti',
    speakText:
      'Karşında bel rotasyon aleti var. Üstteki kola iki elinle tutun, ayaklarını dönen platformun üzerine koy. Ardından belini önce sağa, sonra sola çevir. Bel ve karın bölgeni esnetir.',
  },
  {
    name: 'Bacak presi',
    speakText:
      'Karşında bacak presi aleti var. Sırtını dayağa yasla, ayaklarını öndeki metal platforma koy. Sonra bacaklarını yavaşça it ve kontrollü şekilde geri çek. Bacak ve kalça kaslarını güçlendirir.',
  },
];

export type WalkDuration = 10 | 20 | 30;
export const WALK_DURATIONS: WalkDuration[] = [10, 20, 30];
```

- [ ] **Step 2: TypeScript kontrolü**

Run: `npx tsc --noEmit`
Expected: Hatasız geçer.

- [ ] **Step 3: Commit**

```bash
git add src/constants/buddyScripts.ts
git commit -m "feat(buddy): add mock scripts for voice-driven mode selection"
```

---

## Task 2 — Buddy ekranını state machine'e geçir + mod seçimi sahnesi

**Files:**
- Modify: `app/buddy/index.tsx` (mevcut dosyanın tamamı yeniden yazılır — Görsel kabuk korunur, davranış state'e bağlanır.)

Bu task'ta sadece **mod seçimi sahnesi** tamamlanır. Yürüyüş ve spor sahneleri Task 3 ve 4'te eklenir. Bu sayede iki sahne arası ara commit alınabilir.

- [ ] **Step 1: Dosyayı bütünüyle yeniden yaz**

`app/buddy/index.tsx` içeriğini şu hâle getir:

```tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { PulseDot } from '@/components/PulseDot';
import { Waveform } from '@/components/Waveform';
import { BUDDY_SCRIPTS, WALK_DURATIONS, type WalkDuration } from '@/constants/buddyScripts';
import { useUserStore } from '@/stores/userStore';
import { colors, fontFamily } from '@/theme';

const HOLD_DURATION_MS = 1000;
const TICK_INTERVAL_MS = 125;
const TICK_PATTERN: Haptics.ImpactFeedbackStyle[] = [
  Haptics.ImpactFeedbackStyle.Rigid,
  Haptics.ImpactFeedbackStyle.Rigid,
  Haptics.ImpactFeedbackStyle.Rigid,
  Haptics.ImpactFeedbackStyle.Heavy,
  Haptics.ImpactFeedbackStyle.Heavy,
  Haptics.ImpactFeedbackStyle.Heavy,
  Haptics.ImpactFeedbackStyle.Heavy,
];

// MOCK STT "dinleme" animasyonu süresi
const MOCK_LISTEN_MS = 1200;

type BuddyScene =
  | { kind: 'mode_select' }
  | { kind: 'walk_duration' }
  | { kind: 'walk_active'; duration: WalkDuration }
  | { kind: 'sport_navigating' }
  | { kind: 'sport_equipment'; index: number }
  | { kind: 'sport_done' };

interface ChoiceChip {
  label: string;
  onPress: () => void;
}

function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'tr-TR', rate: 0.95, pitch: 1.0 });
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export default function BuddyMain() {
  useKeepAwake();
  const router = useRouter();
  const reset = useUserStore((s) => s.reset);

  const [scene, setScene] = useState<BuddyScene>({ kind: 'mode_select' });
  const [lastSpoken, setLastSpoken] = useState<string>('');
  const [listening, setListening] = useState(false);
  const listenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdProgress = useSharedValue(0);
  const glow = useSharedValue(0.55);

  // ---- STOP butonu (mevcut hold davranışı korunur) ----
  function cancelHold(silent = false) {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (tickTimer.current) {
      clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
    if (!silent && holdProgress.value > 0.05) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }
    holdProgress.value = withTiming(0, { duration: 200 });
  }

  function stopSession() {
    Speech.stop();
    reset();
    router.replace('/onboarding');
  }

  function startHold() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    holdProgress.value = withTiming(1, { duration: HOLD_DURATION_MS });
    let tickIndex = 0;
    tickTimer.current = setInterval(() => {
      if (tickIndex < TICK_PATTERN.length) {
        Haptics.impactAsync(TICK_PATTERN[tickIndex]);
        tickIndex += 1;
      }
    }, TICK_INTERVAL_MS);
    holdTimer.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 80);
      cancelHold(true);
      stopSession();
    }, HOLD_DURATION_MS);
  }

  // ---- Mock STT chip basışı ----
  function mockListen(then: () => void) {
    if (listening) return;
    Speech.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setListening(true);
    if (listenTimer.current) clearTimeout(listenTimer.current);
    listenTimer.current = setTimeout(() => {
      setListening(false);
      then();
    }, MOCK_LISTEN_MS);
  }

  // ---- Sahneye göre TTS başlat ----
  useEffect(() => {
    let text = '';
    if (scene.kind === 'mode_select') text = BUDDY_SCRIPTS.modeQuestion;
    // Task 3/4'te genişletilecek

    if (text) {
      setLastSpoken(text);
      speak(text);
    }
  }, [scene]);

  // ---- Glow + cleanup ----
  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      Speech.stop();
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
      if (listenTimer.current) clearTimeout(listenTimer.current);
    };
  }, []);

  function replay() {
    if (!lastSpoken) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    speak(lastSpoken);
  }

  // ---- Sahne bazında chip listesi ----
  const choices: ChoiceChip[] = (() => {
    if (listening) return [];
    if (scene.kind === 'mode_select') {
      return [
        { label: '1 · Spor', onPress: () => mockListen(() => setScene({ kind: 'sport_navigating' })) },
        { label: '2 · Yürüyüş', onPress: () => mockListen(() => setScene({ kind: 'walk_duration' })) },
      ];
    }
    // Task 3/4'te genişletilecek
    return [];
  })();

  const stopEnabled = scene.kind !== 'mode_select' && scene.kind !== 'walk_duration';

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${holdProgress.value * 100}%`,
  }));
  const glowProps = useAnimatedProps(() => ({ opacity: glow.value }));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.statusRow}>
        <View style={styles.statusChip}>
          <PulseDot color={colors.status.verified} size={8} />
          <Text style={styles.statusLabel}>BUDDY HAZIR</Text>
          <View style={styles.statusDivider} />
          <Text style={styles.statusTime}>12:34</Text>
        </View>
        <View style={styles.statusRight}>
          <Ionicons name="navigate-outline" size={13} color={colors.text.tertiary} />
          <Text style={styles.locText}>ODTÜ Teknokent</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Son okunan mesajı tekrarla"
        onPress={replay}
        style={styles.oval}
      >
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          accessible={false}
          importantForAccessibility="no"
        >
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="buddyGlow" cx="50%" cy="40%" r="60%">
                <Stop offset="0%" stopColor="#5BD4B9" stopOpacity="0.22" />
                <Stop offset="60%" stopColor="#5BD4B9" stopOpacity="0.05" />
                <Stop offset="100%" stopColor="#5BD4B9" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <AnimatedRect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="url(#buddyGlow)"
              animatedProps={glowProps}
            />
          </Svg>
        </View>

        {[0, 1, 2].map((i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[styles.ring, { width: 220 + i * 80, height: 220 + i * 80 }]}
          />
        ))}

        <View style={styles.speakingPill}>
          <PulseDot color={listening ? '#FFB377' : '#5BD4B9'} size={6} duration={1200} />
          <Text style={styles.speakingPillText}>
            {listening ? 'DİNLENİYOR' : 'BUDDY KONUŞUYOR'}
          </Text>
        </View>

        <View style={styles.waveformWrap} pointerEvents="none">
          <Waveform />
        </View>

        <View
          style={styles.ttsWrap}
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          accessibilityLanguage="tr-TR"
          accessibilityLabel={`Şu an okunuyor: ${lastSpoken}`}
        >
          <Text style={styles.ttsLabel}>ŞU AN OKUNUYOR</Text>
          <Text style={styles.ttsText}>{lastSpoken}</Text>
        </View>

        <View style={styles.ovalFooter} pointerEvents="box-none">
          {choices.length > 0 ? (
            <View style={styles.chipRow}>
              {choices.map((c) => (
                <Pressable
                  key={c.label}
                  onPress={c.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={`Sesli yanıt: ${c.label}`}
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="mic-outline" size={13} color="#5BD4B9" />
                  <Text style={styles.chipText}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.askRow}>
              <Ionicons name="ear-outline" size={14} color="rgba(91,212,185,0.75)" />
              <Text style={styles.askText}>Ekrana dokun → tekrar dinle</Text>
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.stopWrap}>
        <Pressable
          disabled={!stopEnabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: !stopEnabled }}
          accessibilityLabel={stopEnabled ? 'Oturumu durdur' : 'Durdur şu an pasif'}
          accessibilityHint="Çıkmak için bir saniye basılı tut"
          onPressIn={stopEnabled ? startHold : undefined}
          onPressOut={stopEnabled ? () => cancelHold(false) : undefined}
          style={({ pressed }) => [
            styles.stopBtn,
            !stopEnabled && styles.stopBtnDisabled,
            pressed && stopEnabled && { opacity: 0.96 },
          ]}
        >
          <View pointerEvents="none" style={styles.stopGradientOverlay} />
          <Animated.View
            pointerEvents="none"
            style={[styles.stopProgressWrap, progressFillStyle]}
          >
            <View style={styles.stopProgressFill} />
            <View style={styles.stopProgressEdge} />
          </Animated.View>
          <View pointerEvents="none" style={styles.stopRidge} />
          <View style={styles.stopIconWrap}>
            <Ionicons name="stop" size={20} color={stopEnabled ? colors.status.new : colors.text.tertiary} />
          </View>
          <Text style={styles.stopLabel}>DURDUR</Text>
        </Pressable>
        <Text style={styles.stopHint}>
          {stopEnabled ? 'BASILI TUT · TİTREŞİM EŞİĞİ 1SN' : 'OTURUM BAŞLAMADI'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8,
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1, borderColor: 'rgba(42,157,143,0.35)',
    backgroundColor: 'rgba(42,157,143,0.07)',
  },
  statusLabel: {
    fontFamily: fontFamily.monoBold, fontSize: 11, color: colors.text.primary, letterSpacing: 1.1,
  },
  statusDivider: { width: 1, height: 10, backgroundColor: 'rgba(42,157,143,0.4)' },
  statusTime: {
    fontFamily: fontFamily.monoBold, fontSize: 11.5,
    color: colors.status.verified, letterSpacing: 0.5, fontVariant: ['tabular-nums'],
  },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locText: { fontFamily: fontFamily.body, fontSize: 12, color: colors.text.tertiary },
  oval: {
    marginHorizontal: 16, marginTop: 6, height: 412,
    backgroundColor: colors.bg.deep, borderRadius: 56, overflow: 'hidden', position: 'relative',
    shadowColor: '#11171F', shadowOpacity: 0.4, shadowRadius: 60,
    shadowOffset: { width: 0, height: 24 }, elevation: 12,
  },
  ring: {
    position: 'absolute', top: '50%', left: '50%',
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    transform: [{ translateX: -150 }, { translateY: -150 }],
  },
  speakingPill: {
    position: 'absolute', top: 24, left: 26,
    flexDirection: 'row', alignItems: 'center', gap: 7,
  },
  speakingPillText: {
    fontFamily: fontFamily.monoBold, fontSize: 11, color: '#5BD4B9', letterSpacing: 1.6,
  },
  waveformWrap: { position: 'absolute', top: 78, left: 0, right: 0 },
  ttsWrap: { position: 'absolute', top: 220, left: 28, right: 28 },
  ttsLabel: {
    fontFamily: fontFamily.mono, fontSize: 13,
    color: 'rgba(244,241,235,0.6)', letterSpacing: 1.5, marginBottom: 12,
  },
  ttsText: {
    fontFamily: fontFamily.display, fontSize: 22, lineHeight: 30,
    color: '#F4F1EB', letterSpacing: -0.25,
  },
  ovalFooter: {
    position: 'absolute', bottom: 18, left: 20, right: 20,
  },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  askText: {
    fontFamily: fontFamily.bodyMedium, fontSize: 14,
    color: 'rgba(91,212,185,0.75)', letterSpacing: 0.2,
  },
  chipRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1, borderColor: 'rgba(91,212,185,0.45)',
    backgroundColor: 'rgba(91,212,185,0.08)',
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium, fontSize: 13.5,
    color: '#F4F1EB', letterSpacing: 0.2,
  },
  stopWrap: { marginTop: 'auto', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 34 },
  stopBtn: {
    width: '100%', height: 96, borderRadius: 24,
    backgroundColor: colors.status.new,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14,
    overflow: 'hidden', position: 'relative',
    shadowColor: colors.status.new, shadowOpacity: 0.45, shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 }, elevation: 10,
  },
  stopBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stopGradientOverlay: {
    position: 'absolute', left: 0, right: 0, top: '38%', bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  stopRidge: {
    position: 'absolute', left: 0, right: 0, top: 0, height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  stopProgressWrap: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    flexDirection: 'row',
  },
  stopProgressFill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.32)' },
  stopProgressEdge: {
    width: 2, backgroundColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#fff', shadowOpacity: 0.8, shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  stopIconWrap: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  stopLabel: {
    fontFamily: fontFamily.displayExtra, fontSize: 26, color: '#fff', letterSpacing: 1.4,
  },
  stopHint: {
    textAlign: 'center', marginTop: 14,
    fontFamily: fontFamily.mono, fontSize: 11,
    color: colors.text.tertiary, letterSpacing: 1.6,
  },
});
```

- [ ] **Step 2: TypeScript kontrolü**

Run: `npx tsc --noEmit`
Expected: Hatasız geçer. (Yürüyüş/spor chip handler'ları henüz state'leri tetiklese de o state'ler `BuddyScene` union'da tanımlı; switch henüz kapsamaz ama TS no-op olduğu için sorun çıkmaz — yürüyüş_duration sahnesi de henüz speak metni vermez, lastSpoken boş kalır geçici.)

- [ ] **Step 3: Manuel doğrulama**

Run: `npm start` (ardından telefonda Expo Go'yla QR oku, "Görme engelli" rolü seç).
Expected:
- Buddy ekranı açılır
- TTS Türkçe "Bugün ne yapmak istersin? Birinci seçenek, spor. İkinci seçenek, yürüyüş." der
- Ekranda iki chip görünür: `1 · Spor`, `2 · Yürüyüş`
- DURDUR butonu gri/pasif, basınca tepki vermez, alt yazı "OTURUM BAŞLAMADI"
- Chip'lerden birine basınca "DİNLENİYOR" pill'i 1.2 sn yanıp söner, sonra `lastSpoken` boşalır (henüz sonraki sahne TTS'i bağlı değil)

- [ ] **Step 4: Commit**

```bash
git add app/buddy/index.tsx src/constants/buddyScripts.ts
git commit -m "feat(buddy): state machine + mode selection scene (mock STT chips)"
```

---

## Task 3 — Yürüyüş akışı (süre sorusu → rota → uyarılar)

**Files:**
- Modify: `app/buddy/index.tsx`

- [ ] **Step 1: TTS efekt'ini yürüyüş sahneleri için genişlet**

`useEffect(() => { ... }, [scene])` bloğunu şu hâle getir (önceki bloğu tamamen değiştir):

```tsx
  useEffect(() => {
    let text = '';
    if (scene.kind === 'mode_select') text = BUDDY_SCRIPTS.modeQuestion;
    else if (scene.kind === 'walk_duration') text = BUDDY_SCRIPTS.walkDurationQuestion;
    else if (scene.kind === 'walk_active') text = BUDDY_SCRIPTS.walkRouteFound(scene.duration);

    if (text) {
      setLastSpoken(text);
      speak(text);
    }
  }, [scene]);
```

- [ ] **Step 2: Periyodik yürüyüş uyarısı için ikinci efekt ekle**

`useEffect(() => { ... }, [scene])` bloğunun **hemen altına** şunu ekle:

```tsx
  // Walk active sahnesinde her ~8 saniyede bir mock uyarı oku.
  useEffect(() => {
    if (scene.kind !== 'walk_active') return;
    let i = 0;
    const id = setInterval(() => {
      const warnings = BUDDY_SCRIPTS.walkWarnings;
      const text = warnings[i % warnings.length];
      i += 1;
      setLastSpoken(text);
      speak(text);
    }, 8000);
    return () => clearInterval(id);
  }, [scene]);
```

- [ ] **Step 3: `choices` builder'a süre seçim chip'lerini ekle**

`const choices: ChoiceChip[] = (() => { ... })()` IIFE'inin gövdesini şu hâle getir:

```tsx
  const choices: ChoiceChip[] = (() => {
    if (listening) return [];
    if (scene.kind === 'mode_select') {
      return [
        { label: '1 · Spor', onPress: () => mockListen(() => setScene({ kind: 'sport_navigating' })) },
        { label: '2 · Yürüyüş', onPress: () => mockListen(() => setScene({ kind: 'walk_duration' })) },
      ];
    }
    if (scene.kind === 'walk_duration') {
      return WALK_DURATIONS.map((d) => ({
        label: `${d} dk`,
        onPress: () => mockListen(() => setScene({ kind: 'walk_active', duration: d })),
      }));
    }
    return [];
  })();
```

- [ ] **Step 4: TypeScript kontrolü**

Run: `npx tsc --noEmit`
Expected: Hatasız.

- [ ] **Step 5: Manuel doğrulama**

Run: `npm start` → telefonda yürüyüş akışı:
- "2 · Yürüyüş" chip'ine bas → 1.2 sn dinleme → TTS "Kaç dakika yürümek istersin?"
- 3 chip görünür: `10 dk`, `20 dk`, `30 dk`. DURDUR hâlâ pasif.
- `20 dk` chip'ine bas → TTS "20 dakikalık bir rota buldum, başlıyoruz." DURDUR aktif olur (`OTURUM BAŞLAMADI` yazısı kaybolur).
- ~8 saniye sonra ilk uyarı çalmaya başlar, sonraki uyarılar 8 sn aralıkla döner.
- DURDUR butonunu 1 sn basılı tut → onboarding'e döner.

- [ ] **Step 6: Commit**

```bash
git add app/buddy/index.tsx
git commit -m "feat(buddy): walk flow — duration prompt, route confirm, periodic warnings"
```

---

## Task 4 — Spor akışı (yönlendirme → alet anlatımı → sıradaki hareket)

**Files:**
- Modify: `app/buddy/index.tsx`

- [ ] **Step 1: Import'a `SPORT_EQUIPMENTS` ekle**

`buddyScripts` import satırını şu hâle getir:

```tsx
import {
  BUDDY_SCRIPTS,
  SPORT_EQUIPMENTS,
  WALK_DURATIONS,
  type WalkDuration,
} from '@/constants/buddyScripts';
```

- [ ] **Step 2: Sahne TTS efektini spor sahneleri için genişlet**

İlk `useEffect`'in gövdesini şu hâle getir:

```tsx
  useEffect(() => {
    let text = '';
    if (scene.kind === 'mode_select') text = BUDDY_SCRIPTS.modeQuestion;
    else if (scene.kind === 'walk_duration') text = BUDDY_SCRIPTS.walkDurationQuestion;
    else if (scene.kind === 'walk_active') text = BUDDY_SCRIPTS.walkRouteFound(scene.duration);
    else if (scene.kind === 'sport_navigating') text = BUDDY_SCRIPTS.sportSearching;
    else if (scene.kind === 'sport_equipment') {
      const eq = SPORT_EQUIPMENTS[scene.index];
      text = scene.index === 0
        ? `${BUDDY_SCRIPTS.sportArrived} ${eq.speakText}`
        : `${BUDDY_SCRIPTS.sportNextCue} ${eq.speakText}`;
    }
    else if (scene.kind === 'sport_done') text = BUDDY_SCRIPTS.sportDone;

    if (text) {
      setLastSpoken(text);
      speak(text);
    }
  }, [scene]);
```

- [ ] **Step 3: `sport_navigating` sahnesinden alet 0'a otomatik geçiş efekti ekle**

Yürüyüş periyodik uyarı efektinin hemen altına şunu ekle:

```tsx
  // sport_navigating sahnesinde ~6 sn sonra ilk alete varır (mock yürüyüş motoru).
  useEffect(() => {
    if (scene.kind !== 'sport_navigating') return;
    const id = setTimeout(() => {
      setScene({ kind: 'sport_equipment', index: 0 });
    }, 6000);
    return () => clearTimeout(id);
  }, [scene]);
```

- [ ] **Step 4: `choices` builder'a spor chip'lerini ekle**

`choices` IIFE gövdesini şu hâle getir:

```tsx
  const choices: ChoiceChip[] = (() => {
    if (listening) return [];
    if (scene.kind === 'mode_select') {
      return [
        { label: '1 · Spor', onPress: () => mockListen(() => setScene({ kind: 'sport_navigating' })) },
        { label: '2 · Yürüyüş', onPress: () => mockListen(() => setScene({ kind: 'walk_duration' })) },
      ];
    }
    if (scene.kind === 'walk_duration') {
      return WALK_DURATIONS.map((d) => ({
        label: `${d} dk`,
        onPress: () => mockListen(() => setScene({ kind: 'walk_active', duration: d })),
      }));
    }
    if (scene.kind === 'sport_equipment') {
      const next = scene.index + 1;
      const goNext = next >= SPORT_EQUIPMENTS.length
        ? () => setScene({ kind: 'sport_done' })
        : () => setScene({ kind: 'sport_equipment', index: next });
      return [
        { label: 'Sıradaki hareket', onPress: () => mockListen(goNext) },
      ];
    }
    return [];
  })();
```

- [ ] **Step 5: TypeScript kontrolü**

Run: `npx tsc --noEmit`
Expected: Hatasız.

- [ ] **Step 6: Manuel doğrulama**

Run: `npm start` → spor akışı:
- "1 · Spor" chip'ine bas → 1.2 sn dinleme → TTS "En yakın spor yapabileceğin alanları seçiyorum. 120 metre ileride..." DURDUR aktif olur.
- ~6 sn sonra otomatik olarak ilk alete varış: "Spor alanına geldin. Karşında ilk alet var. Karşında sabit bir bisiklet aleti..."
- "Sıradaki hareket" chip'ine bas → TTS "Tamam, başka bir harekete geçelim. Karşında bel rotasyon aleti..."
- Tekrar "Sıradaki hareket" → bacak presi anlatımı
- Tekrar bas → "Bütün aletleri bitirdin. Harika iş çıkardın." Chip kaybolur, DURDUR hâlâ aktif.
- DURDUR'a 1 sn basılı tut → onboarding'e döner.

- [ ] **Step 7: Commit**

```bash
git add app/buddy/index.tsx
git commit -m "feat(buddy): sport flow — navigation, equipment loop, next-move chip"
```

---

## Task 5 — Akış parlatma + son demo provası

**Files:**
- Modify: `app/buddy/index.tsx` (sadece küçük rötuşlar)

- [ ] **Step 1: Dinleme animasyonu sırasında waveform vurgu rengi**

`Waveform` component'inin pulse rengi turuncu olsun diye `Waveform.tsx`'i değiştirmiyoruz (kapsam dışı). Sadece `speakingPill`'i `listening` durumunda turuncu yapmıştık — yeterli görsel feedback.

`lastSpoken` boş kaldığında ttsLabel'ın kafa karıştırmaması için fallback metin ekle. `<Text style={styles.ttsText}>{lastSpoken}</Text>` satırını şu hâle getir:

```tsx
          <Text style={styles.ttsText}>
            {lastSpoken || (listening ? 'Dinliyorum…' : '...')}
          </Text>
```

- [ ] **Step 2: TypeScript kontrolü**

Run: `npx tsc --noEmit`
Expected: Hatasız.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 hata / 0 warning (eslint config çakışırsa sadece `app/buddy/index.tsx` ve `src/constants/buddyScripts.ts` için temiz olduğunu doğrula).

- [ ] **Step 4: Tam demo provası**

Run: `npm start` → telefonda iki tam akışı baştan sona dene:

**Akış A — Yürüyüş:**
1. Onboarding → Görme engelli rolü
2. Buddy ekranı → TTS "Ne yapmak istersin? 1 spor, 2 yürüyüş" ✓
3. DURDUR pasif ✓
4. "2 · Yürüyüş" chip → "Dinleniyor" 1.2 sn ✓
5. TTS "Kaç dakika yürümek istersin?" ✓
6. "20 dk" → TTS "20 dakikalık rota buldum, başlıyoruz" ✓
7. DURDUR aktifleşti ✓
8. 8 sn sonra ilk uyarı, 16 sn sonra ikinci uyarı ✓
9. DURDUR 1 sn basılı tut → onboarding ✓

**Akış B — Spor:**
1. Onboarding → Görme engelli rolü
2. Buddy ekranı → TTS "Ne yapmak istersin?" ✓
3. "1 · Spor" → "Dinleniyor" → TTS "En yakın spor alanlarını seçiyorum, 120 metre ileride…" ✓
4. DURDUR aktifleşti ✓
5. ~6 sn sonra otomatik geçiş: TTS "Spor alanına geldin. Karşında bisiklet aleti…" ✓
6. "Sıradaki hareket" → bel rotasyon ✓
7. "Sıradaki hareket" → bacak presi ✓
8. "Sıradaki hareket" → "Tüm aletleri bitirdin" ✓
9. DURDUR 1 sn basılı tut → onboarding ✓

- [ ] **Step 5: Commit**

```bash
git add app/buddy/index.tsx
git commit -m "polish(buddy): empty-state TTS placeholder + demo dry run"
```

---

## Self-review notları (plan yazıldıktan sonra)

- **Spec kapsamı:**
  - ✓ DURDUR ilk açılışta pasif (Task 2 `stopEnabled` mantığı)
  - ✓ TTS "Ne yapmak istersin?" sorusu (Task 2 `BUDDY_SCRIPTS.modeQuestion`)
  - ✓ Spor / Yürüyüş seçimi (Task 2 chip'leri, mock STT)
  - ✓ Yürüyüş süre sorusu (Task 3 `walk_duration` sahnesi)
  - ✓ Sorunsuz/düz rota önerisi metni (Task 3 `walkRouteFound`)
  - ✓ Süreçlerde ekran değişmez, sadece AI cevapları görünür (aynı oval kabuk, `lastSpoken` swap)
  - ✓ Spor → en yakın alana yönlendirme (Task 4 `sport_navigating` → `sport_equipment`)
  - ✓ Alet anlatımı (Task 4 `SPORT_EQUIPMENTS`)
  - ✓ "Başka harekete geçelim" → sıradaki alet (Task 4 chip)

- **Placeholder taraması:** Tüm step'lerde gerçek kod var, "TBD"/"TODO"/"benzer şekilde" yok.

- **Tip tutarlılığı:** `BuddyScene` union Task 2'de tanımlandı, Task 3 ve 4'te aynı isimlerle (`walk_duration`, `walk_active`, `sport_navigating`, `sport_equipment`, `sport_done`) kullanılıyor. `WalkDuration` literal type Task 1'de tanımlandı, Task 3'te tüketildi. `SPORT_EQUIPMENTS` adı Task 1 + Task 4 arasında aynı.

- **Mock işaretleme:** `buddyScripts.ts` dosyasının başına ve `mockListen` fonksiyonuna `// MOCK:` yorum kondu (sunum sonrası temizlik için).

- **Kapsam dışı bırakılanlar (kasıtlı, CLAUDE.md gereği):** Gerçek STT (`expo-av` + Whisper), gerçek VLM çağrısı (`src/lib/vlm.ts`), gerçek konum / yürüyüş motoru, kamera frame yakalama, "başka harekete geçelim" sesli komut tanıma — hepsi mock chip'lerle ikame edildi.
