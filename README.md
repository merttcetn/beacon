# frontend

Görme engelli + sosyal sorumluluk + B2B veri marketplace — Expo (React Native, iOS) MVP.

Tüm ürün/UI kararları:
- [`product-spec.md`](./product-spec.md) — ürün, akışlar, veri modeli, VLM promptları, n8n
- [`frontend-spec.md`](./frontend-spec.md) — platform, kütüphaneler, tema, ekranlar, harita, a11y

## Geliştirme

```bash
npm install
cp .env.example .env   # Supabase URL + anon key, Stadia API key
npm start              # Expo Go ile telefonda QR kodu okut
```

iOS simülatör için `npm run ios`, Android için `npm run android`.

## Yapı

```
app/                    # Expo Router (file-based)
  _layout.tsx           # root: QueryClient, GestureHandler, fonts, Toaster
  index.tsx             # rol bazlı gateway redirect
  onboarding/           # hoş geldin → rol seçimi → izinler
  buddy/                # görme engelli akışı (Yürüyüş / Spor / Geçmiş)
  volunteer/            # gönüllü tab bar (Harita / Bildir / Akış / Profil)
  company/              # firma tab bar (Pano / Talepler / Profil)
src/
  theme/                # colors, typography, spacing, radius, shadows
  components/           # Button, Screen, RoleCard, AppMap, ... (custom, UI lib yok)
  lib/                  # supabase, queryClient, vlm (placeholder)
  stores/               # zustand stores (userStore vs.)
  constants/            # region (varsayılan ODTÜ/Mahall), seed örnekleri
  types/                # Ticket, User, vs.
  hooks/  utils/        # boş — gerektikçe doldurulur
assets/                 # icon, splash, fontlar
```

Path alias: `@/...` → `src/...`, `@app/...` → `app/...`.

## Harita

- **react-native-maps** + **Stadia Maps** tile overlay (Expo Go uyumlu, prebuild gerekmez).
- Varsayılan görünüm: Ankara — **ODTÜ Teknokent / Mahall Maidan** bölgesi.
- Stadia API key `EXPO_PUBLIC_STADIA_API_KEY` üzerinden, `src/components/AppMap.tsx` kullanır.

## Notlar

- **Expo Go uyumlu managed workflow.** Mapbox yerine Stadia tile + react-native-maps.
- VLM endpoint kararı henüz alınmadı — `src/lib/vlm.ts` placeholder.
- Supabase ortam değişkenleri `.env` üzerinden (`EXPO_PUBLIC_*` prefix Expo'da client'a yansır).
- Türkçe metin önceliği, gamification yok, yön emri verilmez (spec §9).
