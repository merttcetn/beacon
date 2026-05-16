# CLAUDE.md

Bu repo bir **hackathon** projesi, ama jüri/değerlendirici tarafından bize teknik derinlik üzerinden değerlendirme olmayacağı söylendi. Bu yüzden projeyi **ideathon** gibi ele alıyoruz: ürün fikri, akış, demo izlenimi öncelikli; altyapı, test, edge case ve "doğru mimari" ikinci planda.

> **Expo güncel dokümantasyonuna bak (see Expo current docs).** Expo SDK hızlı değişiyor, training data güncel değil. API imzası / config / module davranışı hakkında varsayım yapma — `https://docs.expo.dev` üzerinden ilgili SDK sürümünün (şu an SDK 54) güncel sayfasını oku, sonra kod yaz.

## Çalışma prensibi: "-mış gibi" yap

Bir özelliği gerçek backend / gerçek model / gerçek entegrasyon ile bağlamak demo'yu yavaşlatıyorsa **mock veri ile geç**. Aşağıdakiler bottleneck yarattığı an mock'lanır, gerçek bağlama uğraşılmaz:

- **VLM / vision pipeline** — `src/lib/vlm.ts` placeholder kalsın; ekran içinde önceden yazılmış Türkçe TTS cümleleri ile "buddy konuşuyormuş" gibi yap.
- **Supabase realtime / RLS / auth** — Gerekirse hardcoded user, hardcoded ticket listesi (`src/constants/` altında seed). Login varmış gibi rol seçiminden direkt akışa gir.
- **n8n / mail bildirim akışları** — UI'da "Bildirim gönderildi ✓" göster, gerçek webhook'a basma.
- **Firma dashboard veri kümeleri** — Statik JSON / sabit pin grupları yeterli; gerçek cluster algoritması yazma.
- **STT (sesli soru-cevap)** — Mikrofon açıldığında 2 sn sonra önceden hazırlanmış bir soruymuş gibi davran, cevabı da sabit TTS ile ver.
- **Mapillary / OSM seed import** — Birkaç elle yazılmış pin yeter; gerçek import script'i yazma.

**Karar kuralı:** Bir entegrasyonu yapmak 30 dk'dan fazla sürecekse ve demo'da "çalışıyor görünmesi" yeterliyse → mock. Mock olduğunu kod içinde `// MOCK:` yorumu ile işaretle ki sunum sonrası temizlik kolay olsun.

## Yapılmayacaklar

- **Test yazma** — Hiç. Type checker yeter.
- **Error boundary, retry, exponential backoff, offline queue** — Yok. Happy path çalışsın.
- **Loading skeleton'ı, empty state, error state'in her varyantı** — Tek bir basit spinner / "Bir şey oldu" mesajı yeter.
- **Form validation derinliği** — Zod schema'yı zorlamayalım; minimum required field kontrolü yeter.
- **Accessibility derinliği** — Buddy Mode (görme engelli) akışı a11y'ye ihtiyaç duyar (büyük tap target, TTS), o kadar. Diğer akışlarda screen reader testi yok.
- **Performans optimizasyonu** — `useMemo`, `useCallback`, list virtualization vb. lazımsa yapılır, proaktif değil.
- **Refactor / abstraction** — 3 yerde tekrar eden kod 4 olana kadar abstraction yazma.

## Tech stack (kısa)

- **Expo SDK 54** managed workflow + **Expo Go** ile telefonda demo. Prebuild / EAS Build YOK. Native modül kullanma → Expo Go kırılır.
- **TypeScript** strict; `any` kullanmaktan çekinme demo kodu için.
- **Expo Router** file-based, `app/` altında.
- **Zustand** state, **TanStack Query** async state.
- **react-native-maps** + **Stadia Maps** tile overlay (Mapbox yok).
- **Türkçe** UI, sadece. `date-fns/locale/tr`.
- Path alias: `@/...` → `src/...`, `@app/...` → `app/...`.

## Klasör yapısı

```
app/                    # Expo Router screens
src/theme/              # colors, typography, spacing
src/components/         # custom RN components (UI lib yok)
src/lib/                # supabase, queryClient, vlm (mock)
src/stores/             # zustand
src/constants/          # region, seed data (mock'lar burada)
src/types/              # Ticket, User, ...
```

Detay için `frontend-spec.md` ve `product-spec.md`. Bu iki dosya bizim "single source of truth"; çakışırsa onlar kazanır.

## Demo öncesi check

- Expo Go QR çalışıyor mu?
- Rol seçim → her 3 rolün ana akışı tıklanabiliyor mu?
- Harita açılıyor, pin'ler görünüyor mu?
- Buddy Mode'da "konuşma" tetikleniyor mu (mock TTS olsa bile)?

Geri kalanı sunum slaytında "vizyon" diye anlatılır.
