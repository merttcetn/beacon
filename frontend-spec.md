# Beacon — Frontend Specification

> **Bu doküman ne için?** AI asistanlara (UI implementasyonu, component kararları, ekran akışı için) **context** olarak verilecek frontend spec'idir. `product-spec.md` ile birlikte okunmalıdır — ürün mantığı orada, UI implementasyon detayları burada.

---

## 1. PLATFORM VE TEMEL TEKNİK KARARLAR

### 1.1. Hedef platform

- **iOS** (birincil, MVP)
- Android — POST-MVP
- Web (firma dashboard'u için POST-MVP, MVP'de mobil ekran olarak gösterilir)

### 1.2. Workflow seçimi

**Expo Managed Workflow + Expo Go (TÜM HACKATHON BOYUNCA)**
- QR ile telefonda anında test, hot reload
- Hiçbir native build adımı yok
- Xcode, Mac, simülatör **gerekmez**
- Ekip arkadaşları kendi telefonlarına Expo Go indirir, QR okutur → uygulama çalışır
- Prebuild yok, EAS Build yok, Development Build yok

**Bu kararın gereği:** Sadece Expo Go uyumlu kütüphaneler kullanılır. Native modüller (Mapbox, vision-camera vb.) **kullanılamaz**. Harita için `react-native-maps` + Stadia Maps tile overlay tercih edilmiştir (bkz. §2.3, §5).

### 1.3. Dil ve yerelleştirme

- **Sadece Türkçe** (MVP)
- Tüm UI metinleri Türkçe
- Türkçe karakter desteği (ç, ş, ğ, ü, ö, ı, İ) tüm component'larda test edilmeli
- Tarihler: Türkçe lokalizasyon (`date-fns/locale/tr`)
- POST-MVP: çoklu dil

---

## 2. KÜTÜPHANE TERCİHLERİ

### 2.1. Core stack

| Amaç | Kütüphane | Not |
|---|---|---|
| Framework | Expo SDK (en güncel) | Managed workflow, Expo Go ile çalışır — prebuild yok |
| Dil | TypeScript | Strict mode |
| State management | Zustand | Redux yerine — hafif, hookbazlı, hackathon hızı için ideal |
| Navigation | Expo Router (file-based) | React Navigation üzerine kurulu, basit |
| Form | React Hook Form | Sadece firma talep formu gibi yerlerde |
| API client | Supabase JS Client | REST + Realtime tek pakette |
| Async state | TanStack Query (React Query) | Cache + refetch + optimistic update |

### 2.2. UI & görsel

| Amaç | Kütüphane | Not |
|---|---|---|
| Component library | **YOK** — custom StyleSheet | shadcn web için, RN'de eşdeğeri yok; hackathon'da component library yükü gereksiz |
| Bottom sheet | `@gorhom/bottom-sheet` | Harita üstündeki ticket detay kartı için zorunlu |
| İkon | `@expo/vector-icons` | Ionicons + MaterialCommunityIcons |
| Animasyon | `react-native-reanimated` | Expo'da hazır gelir; sadece kritik anlar için |
| Gesture | `react-native-gesture-handler` | Reanimated ile birlikte gelir |
| SVG | `react-native-svg` | Custom pin'ler ve illustrasyonlar için |
| Toast/notification | `sonner-native` | Hafif, native bildirimler |
| Safe area | `react-native-safe-area-context` | Notch/Dynamic Island için |

### 2.3. Harita

| Amaç | Kütüphane | Not |
|---|---|---|
| Harita | `react-native-maps` | Apple Maps backend; Expo Go uyumlu |
| Cluster | `react-native-map-clustering` | `<MapView>` üzerine sarmalayıcı, pin kümeleme |
| Tile sağlayıcı | **Stadia Maps** (raster tile) | Custom harita stili — Apple Maps default görünümü yerine; ayda 200K request ücretsiz |
| Tile yükleyici | `<UrlTile>` (react-native-maps içinde) | Stadia tile URL'i bu component'e verilir |
| Geolocation | `expo-location` | Foreground tracking; Buddy Mode için BestForNavigation accuracy |

### 2.4. Medya

| Amaç | Kütüphane | Not |
|---|---|---|
| Kamera | `expo-camera` | MVP için yeterli; `takePictureAsync` ile periyodik frame |
| Görsel manipülasyon | `expo-image-manipulator` | Resize/compress (VLM'e yollamadan önce 720p) |
| Görsel cache | `expo-image` | RN'in default Image'i yerine, performans için |

### 2.5. Ses

| Amaç | Kütüphane | Not |
|---|---|---|
| TTS | `expo-speech` | Native iOS Türkçe ses, ücretsiz |
| STT | `expo-av` (ses kaydı) + OpenAI Whisper API | Expo Go uyumlu; native STT paketleri kullanılamaz |
| Ses kayıt yönetimi | `expo-av` | Audio.Recording API |

### 2.6. Yardımcı

| Amaç | Kütüphane | Not |
|---|---|---|
| Tarih | `date-fns` + `date-fns/locale/tr` | Türkçe lokalizasyon |
| ID | `nanoid/non-secure` | UUID gereksiz, kısa ID'ler yeterli |
| Validation | `zod` | VLM JSON response validasyonu için kritik |

### 2.7. Kütüphane yasakları (kullanma)

- ❌ **shadcn/ui** — web için, RN'de çalışmaz
- ❌ **Tailwind / NativeWind** — hackathon hızı için fazla setup; custom StyleSheet daha hızlı
- ❌ **Tamagui / Gluestack** — kurulum maliyeti hackathon scope'unda gereksiz
- ❌ **React Navigation manuel** — Expo Router daha basit
- ❌ **Redux / Redux Toolkit** — Zustand yeterli ve hızlı
- ❌ **MMKV / AsyncStorage karmaşık state** — Zustand persist + Supabase yeterli

---

## 3. TASARIM SİSTEMİ

### 3.1. Tema yönü — "Yüksek Kontrast Erişilebilir"

Ürün DNA'sı (görme engelli + sosyal sorumluluk + B2B ciddiyet) için seçilen yön. WCAG AAA kontrast oranlarını karşılar.

### 3.2. Renk paleti

**Önemli:** Renkler React Native'de **CSS variable** olarak değil, **TypeScript object** olarak tanımlanır. `src/theme/colors.ts` dosyasında tek kaynak (single source of truth) olarak tutulur.

> ⚠️ **Not:** Bu renk paleti **geçici** — UI'ın temel yapısı kurulup demo görseli netleştikten sonra güncellenecek. Şimdilik tutarlı bir başlangıç paleti.

**Tema objesi şeması (`src/theme/colors.ts`):**

```
colors = {
  bg: {
    primary:   '#FAF7F2'   // açık krem zemin, ana arka plan
    secondary: '#F0EDE6'   // hafif vurgulu zemin
    elevated:  '#FFFFFF'   // kart/sheet zemin
  },
  text: {
    primary:   '#1A1D24'   // ana metin, antrasit
    secondary: '#4A5060'   // ikincil metin
    tertiary:  '#8B92A3'   // etiket, hint
    inverse:   '#FAF7F2'   // koyu zeminde metin
  },
  border: {
    default:   '#D9D5CC'   // kart kenarı
    divider:   '#E5E1D7'   // ayırıcı çizgi
  },
  status: {
    new:       '#E63946'   // kırmızı — 1 tespit, doğrulanmamış
    partial:   '#F4A261'   // turuncu — 2 tespit
    verified:  '#2A9D8F'   // yeşil — 3+ doğrulanmış
    resolved:  '#6C757D'   // gri — çözüldü, kapalı
  },
  severity: {
    low:       '#FFF4E0'   // açık sarı vurgu
    medium:    '#FFE4D6'   // açık turuncu vurgu
    high:      '#FFD6D6'   // açık kırmızı vurgu
  },
  accent: {
    primary:   '#1F3A5F'   // derin lacivert — birincil CTA
    hover:     '#2A4D7A'
    pressed:   '#14283F'
  },
  role: {
    visuallyImpaired: '#5E4FA2'   // mor
    volunteer:         '#2A9D8F'   // yeşil
    company:           '#1F3A5F'   // lacivert
  }
  // Not: Harita renkleri (su, yol, bina) Stadia Maps tile'larının içine
  // gömülüdür — burada tanımlanmaz. Harita stili için bkz. §5.
}
```

**Kullanım:** Tüm StyleSheet'lerde `import { colors } from '@/theme/colors'` ile import edilir, hardcoded hex değer YASAK.

### 3.3. Tipografi

**Font seçimi:**

- **Display (başlıklar, vurgular):** `Inter` veya `Manrope` — özgün ama RN'de güvenli yüklenir
- **Body (gövde metni):** `Inter`
- **Mono (kod, koordinat):** `JetBrains Mono` veya system mono

Hackathon'da font yükleme `expo-font` ile yapılır, Google Fonts üzerinden çekilir. Alternatif olarak `@expo-google-fonts/inter` paketi ile gelir.

**Tip ölçekleri:**
```
display-xl:   32pt / line 40 / weight 700  /* onboarding başlık */
display-lg:   28pt / line 36 / weight 700  /* ekran başlık */
display-md:   24pt / line 32 / weight 600  /* kart başlık */

heading-lg:   20pt / line 28 / weight 600  /* alt başlık */
heading-md:   18pt / line 24 / weight 600
heading-sm:   16pt / line 22 / weight 600

body-lg:      17pt / line 26 / weight 400  /* görme engelli için minimum */
body-md:      15pt / line 22 / weight 400
body-sm:      13pt / line 18 / weight 400  /* etiket, hint */

caption:      12pt / line 16 / weight 500  /* meta bilgi */
```

**Görme engelli moduna özel ölçek:** Tüm body metinler `body-lg` (17pt) minimum. Buton metinleri 18pt minimum.

### 3.4. Spacing (4pt grid)

```
space-1:   4pt
space-2:   8pt
space-3:   12pt
space-4:   16pt   /* default kenar boşluğu */
space-5:   20pt
space-6:   24pt   /* bölüm aralığı */
space-8:   32pt
space-10:  40pt
space-12:  48pt
space-16:  64pt
```

### 3.5. Köşe yumuşatma (border radius)

```
radius-xs:    4pt   /* chip, etiket */
radius-sm:    8pt   /* küçük buton */
radius-md:    12pt  /* kart, input */
radius-lg:    16pt  /* bottom sheet */
radius-xl:    24pt  /* büyük kart, modal */
radius-full:  9999  /* avatar, pill buton */
```

### 3.6. Gölge (elevation)

iOS native gölge mantığı. 3 seviye yeterli:

```
shadow-sm:  shadowOpacity 0.05, shadowRadius 4,  shadowOffset (0,2)
shadow-md:  shadowOpacity 0.08, shadowRadius 12, shadowOffset (0,4)
shadow-lg:  shadowOpacity 0.12, shadowRadius 24, shadowOffset (0,8)
```

### 3.7. Dokunma alanı (touch target)

- Minimum 44×44pt (Apple HIG)
- Görme engelli kullanıcı ekranlarında **minimum 64×64pt**
- Buton padding minimum 16pt yatay, 12pt dikey

### 3.8. Animasyon

**İlke:** Az ama anlamlı. Gereksiz mikro-animasyon yok.

**Süreler:**
- Hızlı geçiş: 150ms (state change)
- Standart: 250ms (sayfa geçişi, modal)
- Yavaş: 400ms (büyük etki, onboarding)

**Easing:** `cubic-bezier(0.4, 0.0, 0.2, 1)` (material standard)

**Kullanım yerleri:**
- Bottom sheet açılış/kapanış (spring physics)
- Pin doğrulama sayısı değişimi (sayı animasyonu)
- Buddy mode'da konuşma dalgası (sürekli animasyon, kullanıcıya çalıştığını söyler)
- TTS okurken alt çubuk (dalga animasyonu)
- "Gözünü eğit" kart geçişleri (fade + slide)

**Yapma:**
- Loading spinner everywhere
- Bouncing buttons
- Onboarding'de aşırı parallax

---

## 4. EKRANLAR

### 4.1. Ekran haritası — yüksek seviye

```
[İlk açılış]
  ↓
Splash
  ↓
Onboarding (3 ekran)
  ├─ Hoş geldin
  ├─ Rol seçimi
  └─ İzinler
  ↓
[Rol bazlı yönlendirme]
  ├─ Görme engelli → Buddy Hub
  ├─ Gönüllü → Map (varsayılan)
  └─ Firma → Login → Dashboard

[Görme engelli akış]
Buddy Hub
  ├─ Buddy Mode (canlı yürüyüş)
  ├─ Spor Mode (alet tanıma)
  └─ Geçmiş konuşmalar

[Gönüllü akış]
Tab Bar:
  ├─ Map (harita)
  ├─ Feedback (problem bildir)
  ├─ Timeline (feed)
  └─ Profil

[Firma akış]
Tab Bar:
  ├─ Dashboard (filtrelenebilir harita)
  ├─ Veri Talepleri (geçmiş)
  └─ Profil
```

### 4.2. Ekran listesi — MVP

#### **A. ORTAK EKRANLAR**

| # | Ekran | Öncelik | Açıklama |
|---|---|---|---|
| A1 | Splash | MVP | Logo + yüklenme; 1.5sn |
| A2 | Onboarding — Hoş geldin | MVP | Misyon anlatımı, tek tap geç |
| A3 | Onboarding — Rol seçimi | MVP | 3 büyük kart: Görme engelli / Gönüllü / Firma |
| A4 | Onboarding — İzinler | MVP | Rol bazlı izin (kamera/mikrofon/konum/bildirim) |
| A5 | Profil | MVP | Rol, mail, çıkış; basit |

#### **B. GÖRME ENGELLİ EKRANLAR**

| # | Ekran | Öncelik | Açıklama |
|---|---|---|---|
| B1 | Buddy Hub | MVP | Tek ekran, 2 büyük buton: "Yürüyüş" / "Spor" |
| B2 | Buddy Mode (yürüyüş) | MVP | Kamera arka planda, ekran minimal; "konuşma dalgası" + tek STOP butonu |
| B3 | Spor Mode | MVP | Kamera + "Tanı" butonu; sonuç gelince TTS başlar |
| B4 | Geçmiş konuşmalar | MVP | Eski yürüyüş transcript'leri (sadece text) |

#### **C. GÖNÜLLÜ EKRANLAR**

| # | Ekran | Öncelik | Açıklama |
|---|---|---|---|
| C1 | Map | MVP | Stadia Maps tile + Marker'lar (ticket pin'leri) + filtre üst çubuk + heat toggle |
| C2 | Pin detayı (Bottom Sheet) | MVP | Ticket detayı + "Ben de gördüm/Artık yok" butonları |
| C3 | Feedback — Kamera | MVP | Burst fotoğraf; "Gözünü eğit" şerit üstte |
| C4 | Feedback — Onay | MVP | VLM çıktısı + kullanıcı düzeltme + konum onayı + gönder |
| C5 | Feedback — Başarılı | MVP | Teşekkür + "Pin'in haritada" + mikro-içerik |
| C6 | Timeline | MVP | Kronolojik ticket feed |
| C7 | Timeline — Detay | MVP | Bir ticket'ın tam görünümü |

#### **D. FİRMA EKRANLAR**

| # | Ekran | Öncelik | Açıklama |
|---|---|---|---|
| D1 | Login | MVP | Magic link veya mail+şifre; basit |
| D2 | Dashboard — Harita | MVP | Filtrelenebilir harita + sol panel filtre + üst özet kartlar |
| D3 | Dashboard — Küme detayı | MVP | Seçilen bölge/kategori ticket'larının listesi |
| D4 | Veri Talebi Formu | MVP | Filtreyi onayla → mail + açıklama → gönder |
| D5 | Talep Başarılı | MVP | "Mail gönderildi, en kısa sürede dönüş" |
| D6 | Veri Talepleri Geçmişi | POST-MVP | Geçmiş talepler listesi (MVP'de boş tab) |

#### **E. POST-MVP / ATLA**

| # | Ekran | Açıklama |
|---|---|---|
| E1 | Bildirimler | Push merkezi |
| E2 | Ayarlar | Detaylı ayarlar |
| E3 | Sepet + Ödeme | Marketplace v2 |
| E4 | Gönüllü-engelli mesajlaşma | v2 |
| E5 | Rozet/profil sayfası | Yapma — gamification yok |

### 4.3. Ekran detayları — kritik olanlar

#### **B2. Buddy Mode (yürüyüş)** — ürünün kalbi

**Ekran anatomisi (yukarıdan aşağıya):**

1. **Status bar** — siyah/koyu, "Yürüyüş aktif" yazılı, sol üstte
2. **Konuşma alanı (60% yükseklik, ekran ortası)** — Geniş, koyu lacivert daire/oval — TTS okuduğunda **canlı dalga animasyonu** (sesle senkron, reanimated ile)
3. **Mevcut tespit metni** — TTS'in son söylediği metin **büyük puntoyla** (24pt+) yazılı olur; düşük görüşlü kullanıcı için okunabilir
4. **STOP butonu** — Ekranın altında, ekran genişliğinin %80'i, **96pt yükseklikte**, kırmızı, "DURDUR" yazılı

**Davranış:**
- Ekrana dokunma → mevcut konuşmayı sesli tekrarla
- 3 saniye basılı tutma → STOP
- Çift dokunma → sesli soru moduna geç (mikrofon açılır, "Soru sor" sesli prompt)
- Ekran her zaman açık (auto-lock disabled)

**Kritik UI kararı:** Bu ekran kullanıcının **görmediği** varsayımıyla tasarlanmalı. Ama düşük görüş seviyesinde (low vision) kullanıcılar da var → bu yüzden büyük metin ve yüksek kontrast korunur.

#### **C1. Map** — gönüllünün ana ekranı

**Ekran anatomisi:**

1. **Üst çubuk (60pt)** — sol: arama ikonu, orta: "Beacon" logo, sağ: filtre ikonu
2. **Harita** — Stadia Maps tile (Alidade Smooth) + Marker'lar; pin tasarımı bkz. §6
3. **Sağ alt: FAB (floating action button)** — "Problem Bildir" → Feedback akışı açılır
4. **Sol alt: Heat map toggle** — "Pinler / Yoğunluk" switch
5. **Pin tıklanınca:** Bottom Sheet kayar (yarım yükseklik)

**Filtre paneli (üst çubuğun filtre ikonu):**
- Kategori (multi-select chip'ler)
- Tarih aralığı (preset: bugün / bu hafta / bu ay / tümü)
- Doğrulama seviyesi (tümü / sadece doğrulanmış)
- Mesafe (yakınımdaki / şehir geneli)

#### **C2. Pin detayı (Bottom Sheet)**

**Snap points:** %30 (önizleme), %75 (detay), kapalı

**Önizleme (snap 1):**
- Üstte sürükle handle çizgisi
- Sol: küçük ikon (kategori), orta: başlık + ilçe, sağ: durum etiketi
- Tek tap: detaya geç (snap 2)

**Detay (snap 2):**
- Üst kısımda fotoğraf (galeri swipe, 3 foto)
- Problem başlığı (heading-lg)
- Açıklama (body-md)
- Etkilenen kullanıcılar — chip'ler:
  - 👤 Tekerlekli sandalye
  - 👁️ Görme engelli
  - 👶 Bebek arabası
  - 🧓 Yaşlı
- Doğrulama göstergesi: "3 kullanıcı doğruladı"
- Konum: ilçe + sokak adı + harita preview
- Zaman: "3 saat önce tespit edildi"
- **Üç aksiyon butonu (sticky alt):**
  - ✓ Ben de gördüm (yeşil)
  - ✗ Artık yok (gri)
  - ? Bilmiyorum (sadece outline)

#### **C3. Feedback — Kamera**

**Ekran anatomisi:**

1. **Üst şerit (40pt)** — "Gözünü eğit" mikro-içeriği, soft animation ile değişebilir
   - Örnek: *"Tekerlekli sandalye için 2cm yükseklik farkı aşılmazdır."*
2. **Kamera viewport** — tam ekran
3. **Alt kontrol paneli (140pt)**:
   - Sol: galeri butonu (önceden çektiği fotoyu seç)
   - Orta: shutter (büyük, 80pt)
   - Sağ: kamera çevir (ön/arka)
4. **Üstte sağ:** X (iptal)

**Shutter davranışı:**
- Tek tap: 1 fotoğraf
- Basılı tut (500ms+): 3 fotoğraflık burst
- Çekildikten sonra "Devam" butonu → Onay ekranı

#### **C4. Feedback — Onay**

**Ekran anatomisi (yukarıdan):**

1. **Üst:** "X" iptal + "Düzenle" geri
2. **Fotoğraflar:** Yatay swipe galeri (1-3 foto)
3. **VLM tespit kartı:**
   - "Bu problemi tespit ettik" başlığı
   - Kategori ikonu + adı: "Eksik rampa"
   - Severity rozetli: "Yüksek önem"
   - Etkilenen kullanıcılar (chip'ler)
   - "Düzenle" butonu (kategori değiştir)
4. **Konum kartı:**
   - Mini harita preview (pinli, Stadia tile)
   - Adres: "Kadıköy, Moda Cad. 47"
   - "Konumu ince ayarla" butonu → harita modal
5. **Açıklama (opsiyonel):**
   - Multiline text input: "Ek bilgi ekle (opsiyonel)"
6. **Alt sticky:** "Gönder" butonu (büyük, accent renk)

#### **D2. Firma Dashboard — Harita**

**Ekran anatomisi:**

1. **Üst çubuk (60pt):** Logo + arama + bildirim + profil avatar
2. **Sol panel (320pt genişlik):** Filtreler
   - İlçe (multi-select dropdown)
   - Kategori (chip'ler)
   - Tarih aralığı (date range picker)
   - Doğrulama seviyesi (slider veya toggle)
   - "Filtreyi Temizle" buton
3. **Sağ ana alan:** Harita (Stadia tile + cluster + heat map)
4. **Üstte sağ overlay kartlar (özet):**
   - "Toplam ticket: 247"
   - "Doğrulanmış: 183"
   - "Etkilenen kullanıcı tahmini: ~12,400"
   - "Kategori dağılımı: Eksik rampa %34, Çukur %28..."
5. **Sağ alt FAB:** "Bu Kümeyi Talep Et" — açılır form

**Mobil layout farkı:** Sol panel **bottom sheet** olur, FAB ile açılır.

---

## 5. HARİTA STİLİ (Stadia Maps Tile Overlay)

### 5.1. Yaklaşım — Stadia Maps tile servisi

Apple Maps'in default görünümü yerine, **Stadia Maps**'in tile servisinden gelen özelleştirilmiş tile'lar kullanılır. `<MapView>` üzerine `<UrlTile>` component'i ile binilir, harita görünümü tamamen değişir.

**Neden Stadia Maps:**
- Ücretsiz tier: ayda 200K request (hackathon için fazlasıyla yeterli)
- Kredi kartı gerekmez
- Hazır özelleştirilmiş stiller (Alidade Smooth, Outdoors, vb.)
- Browser tabanlı custom stil editörü (kendi renklerin için)
- Expo Go ile çalışır (sadece HTTP tile request)

### 5.2. Stil seçenekleri

**Seçenek A — Hazır stil (hızlı, MVP için yeterli)**

Stadia Maps'in stil galerisinden bir stil seç:
- **Alidade Smooth** — açık zemin, ürün DNA'sıyla uyumlu, "yüksek kontrast erişilebilir" hissi verir
- **Alidade Smooth Dark** — POST-MVP dark mode için
- **Outdoors** — yeşillik vurgulu (parklar belirgin)
- **OSM Bright** — klasik OSM görünümü, renkli

Tile URL örneği (API key ile):
```
https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png?api_key=YOUR_KEY
```

**Seçenek B — Custom stil (POST-MVP veya zamanı varsa)**

Stadia Maps'in customize editörü (`maps.stadiamaps.com/customize/`) ile kendi renklerini ayarla:
- Su, yol, bina, park, etiket renkleri tek tek değiştirilebilir
- Stil kaydedilir, kendi tile URL'in olur
- Tarayıcıda canlı önizleme ile 10 dakikada özel stil hazır

**MVP kararı:** Seçenek A ile başla (Alidade Smooth), demo gücün için yeter. Vakit kalırsa Seçenek B ile özelleştir.

### 5.3. Kurulum

API key ortam değişkeninde tutulur:

```
.env:
EXPO_PUBLIC_STADIA_API_KEY=xxx
```

Tile URL'i bir helper'dan üretilir:
```
// src/map/tiles.ts
export const STADIA_TILE_URL =
  `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png?api_key=${process.env.EXPO_PUBLIC_STADIA_API_KEY}`
```

`<MapView>` içinde:
```
<UrlTile urlTemplate={STADIA_TILE_URL} maximumZ={20} flipY={false} />
```

### 5.4. Apple Maps default'unu gizleme

`<MapView>` `mapType="none"` ayarı ile Apple Maps default tile'ları kapatılır → sadece Stadia tile'ları görünür. Bu önemli — yoksa iki tile katmanı üst üste biner.

### 5.5. Tile cache

`<UrlTile>` `tileCachePath` prop'u ile yerel cache kullanılabilir → offline'da daha önce görülen tile'lar yüklenir, network kullanımı düşer. POST-MVP optimizasyon.

### 5.6. Sınırlamalar

- **Raster tile** (vector değil): yüksek zoom'da Mapbox kadar keskin değil, demo'da fark edilmez
- **Vector style spec'in tam gücü yok**: layer-bazlı dinamik styling, expression'lar yok — istediğin renk paleti tile'ın içine "yapışmış" gelir
- **Etiketler tile'a gömülü**: Türkçe yer adları Stadia'nın stil ayarına göre gelir; manuel düzenleme yok

Bu sınırlamalar hackathon scope'unda kabul edilebilir.

---

## 6. PIN TASARIMI (Ticket Görselleştirme)

### 6.1. Render stratejisi — Viewport-based + `<Marker>` component

**Kritik karar:** Tüm pin'ler aynı anda render edilmez. Sadece haritada **görünür alan (viewport region)** içindeki ticket'lar çekilir ve render edilir. Kullanıcı zoom/pan yapınca yeni veri çekilir.

**Akış:**
1. Harita kamerası değişti (`onRegionChangeComplete` event'i — react-native-maps)
2. Yeni region'un bbox'ı hesaplanır (latitude/longitude + delta'lar)
3. Bbox + 300ms debounce ile Supabase'e sorgu:
   ```
   SELECT * FROM tickets
   WHERE ST_Within(location, ST_MakeEnvelope(...))
   LIMIT 500
   ```
4. PostGIS sorgusu indexli, <100ms döner
5. State'e (Zustand veya TanStack Query) yazılır
6. `<Marker>` listesi state'ten map edilerek render edilir

**Bu yaklaşımın faydaları:**
- DB'de 100.000 ticket bile olsa, ekranda maksimum 500 marker oluşur → FPS dert değil
- Network kullanımı minimal — sadece görünür alan
- Pan/zoom anında veri güncellenir

### 6.2. Render mimarisi — `<Marker>` + custom child

react-native-maps'te her pin bir `<Marker>` component'idir. Custom görünüm için Marker'ın **child component'i** olarak SVG render edilir.

**Yapı (yüksek seviye):**
- `<MapView>` içinde
  - `<UrlTile>` (Stadia Maps zemin)
  - `tickets.map(t => <Marker key={t.id} coordinate={...}><TicketPin ticket={t} /></Marker>)`
  - `<Marker>`'lar `react-native-map-clustering`'in `<ClusteredMapView>` sarmalayıcısı ile otomatik kümelenir
  - Kullanıcı konumu için `<Marker>` + custom child (pulse animasyonlu daire)

**`<TicketPin>` component'i:**
- `react-native-svg` ile çizilir
- Üç katmanlı tasarım (§6.3'te detay)
- Props: `status`, `severity`, `category`, `verificationCount`
- Memoize edilir (`React.memo`) — gereksiz re-render önlenir

**Seçili pin:**
- Tıklanan Marker `selected` state'ine alınır
- O Marker'a animasyon eklenir (scale + pulse, reanimated ile)
- Aynı zamanda Bottom Sheet açılır

### 6.3. Pin anatomi — üç katman (görsel tasarım)

Her pin SVG ile çizilir, üç katman var:

**Katman 1 — Dış halka (doğrulama durumu)**
- Halka rengi (`colors.status` referansı):
  - `colors.status.new` — 1 tespit (kırmızı)
  - `colors.status.partial` — 2 tespit (turuncu)
  - `colors.status.verified` — 3+ doğrulanmış (yeşil)
- Halka kalınlığı doğrulama sayısına göre artar:
  - 1 tespit: 3pt
  - 2 tespit: 4pt
  - 3+ tespit: 5pt
  - 10+ tespit: 6pt + glow effect

**Katman 2 — Orta zemin (severity)**
- Low: beyaz dolgu
- Medium: `colors.severity.medium`
- High: `colors.severity.high`

**Katman 3 — İç ikon (kategori)**

Her kategori için SVG ikon (16pt, ortalı):
- `pothole` → daire içinde "boşluk" (ortası boş)
- `missing_ramp` → küçük merdiven
- `missing_tactile_paving` → noktalı yüzey grid
- `obstacle` → uyarı üçgeni
- `uneven_surface` → dalgalı çizgi
- `water_pooling` → su damlası
- `narrow_passage` → iki paralel çizgi
- `damaged_equipment` → kırık halter
- `other` → soru işareti

### 6.4. Pin boyut — zoom'a duyarlı

react-native-maps'te zoom seviyesi `region.latitudeDelta` üzerinden hesaplanır. Üç eşik:
- Çok uzak (delta > 0.5): nokta (8pt), kategori ikon yok
- Orta (delta 0.05 - 0.5): küçük pin (24pt), halka + iç renk, ikon yok
- Yakın (delta < 0.05): tam pin (40pt), üç katman, ikon dahil

Bu state component içinde `useMemo` ile zoom seviyesine bağlı hesaplanır.

### 6.5. Cluster (kümeleme)

**`react-native-map-clustering`** paketi `<MapView>`'in yerine `<ClusteredMapView>` koyar, otomatik kümeleme yapar:
- Daire içinde sayı: "47"
- Daire boyutu sayıya göre: 32pt → 56pt arası (paket prop'larıyla ayarlanır)
- Daire rengi: custom `renderCluster` ile özelleştirilir — en yüksek severity'e göre renk
- Tap → zoom in, küme açılır (default davranış)

**Önemli:** Cluster, viewport-based query ile **birlikte** çalışır. Önce bbox sorgusu yapılır, dönen ticket'ları paket cluster yapar.

### 6.6. Heat map (yoğunluk haritası)

react-native-maps'in built-in `<Heatmap>` component'i kullanılır:
- `points` prop'una `{latitude, longitude, weight}` listesi verilir
- `radius`, `opacity`, `gradient` prop'ları ile ayarlanır
- Toggle ile `<Marker>` görünümünün **alternatifi** olarak gösterilir

Heat map için viewport sınırı **gevşetilir** — daha geniş bbox'tan veri çekilir (kullanıcı genel yoğunluk görmek istiyor). Örnek: viewport bbox × 1.5.

Firma dashboard'unda **default heat map**, mobil gönüllü ekranında **default marker** olabilir.

### 6.7. Pin etkileşim

- `onPress` prop'u → Marker seçili state'e alınır → Bottom sheet açılır
- `onLongPress` → vurgu animasyonu (1sn) + paylaş seçeneği
- Pinch zoom: cluster açılır (paket otomatik)

### 6.8. Kullanıcı konumu pin'i

`<MapView>` `showsUserLocation={true}` ile default mavi nokta gösterilir. Custom istersen:
- `expo-location` ile koordinat alınır
- `<Marker>` ile özel görsel (lacivert nokta + pulse halka)
- Pulse animasyonu reanimated ile
- Buddy Mode aktifken halka yeşil (yürüyüş aktif)

**MVP kararı:** Default `showsUserLocation` yeterli. Custom konum pin'i POST-MVP.

---

## 7. UX İLKELERİ — EKRAN BAZLI

### 7.1. Görme engelli ekranlar

- **Tek el kullanım** — tüm CTA'lar ekranın alt yarısında
- **Tek tap** — kritik aksiyonlar tek dokunuşla
- **Sesli geri bildirim** — her etkileşim TTS ile onaylanır ("Yürüyüş başlatıldı")
- **Haptic feedback** — her tap'te hafif vibrasyon
- **VoiceOver tam destek** — `accessibilityLabel` her component'te zorunlu
- **Auto-lock disabled** — Buddy Mode'da ekran kapanmaz (`expo-keep-awake`)

### 7.2. Gönüllü ekranlar

- **Mikro-içerik her temas noktasında** — kamera açılışı, bekleme, başarılı gönderim
- **Gamification YOK** — rozet, puan, "level", "leaderboard" hiçbir yerde olmayacak
- **Doğrulama akışı 2 tap'te biter** — pin tap → ben de gördüm tap
- **Bekleme süresinde değer üret** — VLM 5-8 saniye sürüyor, o sürede mikro-içerik göster

### 7.3. Firma ekranlar

- **Filtre sonucu < 2 saniye** — Supabase PostGIS sorguları indexli olmalı
- **Veri değer önermesi her kümede net** — "47 ticket, son 30 günde, %78 doğrulanmış"
- **MVP ekranlarında sepet/ödeme YOK** ama gelecek sürüm preview gösterilebilir

### 7.4. Bütün ekranlar

- **Yükleme durumları:**
  - <500ms: gösterme
  - 500ms-2sn: skeleton loader
  - 2sn+: spinner + mikro-içerik (eğitim)
- **Boş durumlar:**
  - Anlamlı illustration + 1 cümle açıklama + CTA
- **Hata durumları:**
  - "Bir şey ters gitti" + retry butonu
  - VLM hatası özel: "Tespit yapılamadı, lütfen tekrar dene"
- **Offline:**
  - Mevcut data cache'den okunur (TanStack Query)
  - Yeni ticket queue'ya alınır, online olunca senkronize
  - POST-MVP: tam offline mode

---

## 8. ERIŞILEBILIRLIK (a11y) GEREKSİNİMLERİ

### 8.1. Kontrast

- Metin/zemin kontrastı: minimum WCAG AA (4.5:1), tercihen AAA (7:1)
- Buton metin/zemin: AAA
- İkon/zemin: minimum 3:1

### 8.2. Dokunma alanı

- Standart: 44×44pt minimum
- Görme engelli ekran: 64×64pt minimum
- Buton padding: 16pt yatay, 12pt dikey minimum

### 8.3. VoiceOver

- Her interaktif element'te `accessibilityLabel`
- Her decorative element'te `accessible={false}`
- Buton'da `accessibilityRole="button"`
- Pin'lerde özel `accessibilityLabel`: "Eksik rampa, Kadıköy, 3 kullanıcı doğruladı"

### 8.4. Dinamik font boyutu

- iOS'un Dynamic Type ayarını destekle
- `allowFontScaling={true}` (default)
- Maksimum %150 büyütme

### 8.5. Renk körü

- Pin'lerde renk + ikon her zaman birlikte
- Sadece renkle anlam ifade eden hiçbir UI elementi yok

### 8.6. Hareket azaltma

- iOS'un "Reduce Motion" ayarını dinle
- Açıksa animasyonları kısalt veya kaldır
- `AccessibilityInfo.isReduceMotionEnabled()` kullan

---

## 9. KOMPONENT KATALOĞU (Custom)

Tekrar kullanılacak temel component'ler. Hepsi custom, library yok.

### 9.1. Atomik

| Component | Açıklama |
|---|---|
| `<Button variant primary/secondary/ghost size sm/md/lg>` | Ana buton |
| `<IconButton icon size>` | Sadece ikon buton (44pt+) |
| `<Chip label icon onPress selected>` | Filtre chip, etiket |
| `<Badge variant status/severity label>` | Küçük rozet |
| `<Avatar size initials>` | Profil avatarı |
| `<Divider>` | Ayırıcı çizgi |
| `<Skeleton width height>` | Loading placeholder |

### 9.2. Form

| Component | Açıklama |
|---|---|
| `<TextInput label error>` | Standart input |
| `<TextArea label rows>` | Çok satırlı |
| `<DateRangePicker>` | Tarih aralığı |
| `<MultiSelectChips options>` | Chip bazlı multi-select |
| `<Switch label>` | Toggle |

### 9.3. Layout

| Component | Açıklama |
|---|---|
| `<Screen scroll header footer>` | Ekran wrapper (safe area + scroll) |
| `<Card padding shadow>` | Standart kart |
| `<Section title subtitle>` | Başlıklı içerik bölümü |
| `<EmptyState illustration title cta>` | Boş durum |
| `<ErrorBoundary>` | Hata yakalayıcı |

### 9.4. Domain özel

| Component | Açıklama |
|---|---|
| `<TicketPin status severity category>` | Harita pin SVG |
| `<TicketCard ticket compact>` | Liste/feed için ticket kartı |
| `<TicketDetailSheet ticket>` | Bottom sheet detay |
| `<EyeTrainCard content>` | "Gözünü eğit" mikro-içerik kartı |
| `<RoleBadge role>` | Rol göstergesi |
| `<VLMResultCard result onEdit>` | VLM çıktısı + düzenle |
| `<ConversationWave isActive>` | Buddy Mode konuşma dalgası |
| `<VerificationButtons ticket>` | "Ben de gördüm/Artık yok/Bilmiyorum" |
| `<HeatmapToggle value onChange>` | Pin/Heat toggle |

---

## 10. SES (TTS / STT) UX

### 10.1. TTS (Text-to-Speech)

**Konfigürasyon:**
- Dil: `tr-TR`
- Hız: 1.0 (standart)
- Pitch: 1.0
- Ses: iOS default Türkçe (Yelda)

**Kuyruk yönetimi:**
- Çoklu TTS isteği birikirse kuyruğa al
- Acil durum (high priority) gelirse mevcut konuşmayı kes (`Speech.stop()`)
- Aynı metin tekrar gelirse yoksay

**UI göstergeleri:**
- TTS okurken Buddy Mode'da konuşma dalgası animasyonu
- Ekranın altında ince çubuk (progress)

### 10.2. STT (Speech-to-Text)

**Akış:**
1. Kullanıcı mikrofon butonuna basar veya çift tap yapar
2. `expo-av` ile ses kaydı başlar (max 10 saniye)
3. Kayıt durur (silence detect veya manual stop)
4. Ses dosyası OpenAI Whisper API'ye gönderilir (`whisper-1` modeli, `language=tr`)
5. Transcript metin VLM'e iletilir
6. Sadece **text saklanır**, ses dosyası yerel olarak silinir

**UI göstergeleri:**
- Kayıt aktifken kırmızı yanıp sönen halka
- Mikrofon ikonu büyür
- "Konuşuyorum..." etiketi (sesli okunur)

---

## 11. DEMO HAZIRLIK NOTLARI (UI tarafı)

Jüri demosu için UI optimize edilmeli:

### 11.1. Demo data

- Haritada 1500+ seed pin (Mapillary + OSM seed data, Marker'lar olarak render edilir)
- Demo başlamadan önce kontrol: pin'ler doğru render ediliyor mu, cluster çalışıyor mu?
- Heat map preview: İstanbul üzerinde göz alıcı yoğunluk

### 11.2. Demo akışı için kısayollar

- Onboarding'i atlayarak doğrudan ekrana gitme (dev menu)
- Test kullanıcıları önceden oluşturulmuş (3 rol için)
- VLM çağrılarında düşük latency için Gemini Flash öneriliyor

### 11.3. Demo cihaz

- iPhone (herhangi bir modern model — native build yok)
- Kulaklık (Buddy Mode TTS demo için)
- Kablo + yedek pil (canlı demo enerji ihtiyacı)
- Stadia Maps API key kotası kontrolü (200K request/ay free tier yeterli)
- Expo Go uygulaması ekip telefonlarında kurulu olsun

### 11.4. Yedek planlar

- VLM API down olursa: Önceden kaydedilmiş response'lar (mock mode toggle)
- İnternet down: Cache'den çalışma (TanStack Query persist)
- GPS yok (kapalı alan): Manuel konum seçimi opsiyonu

---

## 12. AÇIK SORULAR

1. **❓ VLM entegrasyonu — NETLEŞMEMİŞ** — Frontend tarafında VLM çağrısı nasıl yapılacak? Üç seçenek:
   - (a) Doğrudan mobile app'ten VLM API'sine (Gemini/Claude) — API key client'ta, KVKK/güvenlik riski
   - (b) Supabase Edge Function üzerinden proxy — API key server-side, güvenli ama latency artar
   - (c) Backend (Next.js API route veya benzeri) üzerinden — daha kontrollü, ama ekstra altyapı
   
   **Şu an karar verilmedi**, hackathon başında netleşmeli. Doğrudan client çağrısı en hızlı, Supabase Edge Function en güvenli.

2. **Font seçimi netleşmeli** — Inter mi başka mı? Inter güvenli ama özgün değil. Alternatif: Manrope (display), Geist (body). Karar: ilk 2 saatte.
3. **Stadia Maps API key paylaşımı** — Ekipte tek hesap mı, herkes ayrı mı? Tek hesap önerilir, key `.env`'de.
4. **Logo / brand identity** — `Beacon` placeholder, gerçek isim ve logo netleştiğinde.
5. **Dark mode** — MVP'de yok mu? Karar: yok (zaman). POST-MVP.
6. **Tablet desteği** — iPad'de nasıl görünür? MVP'de iPhone-only, iPad'de scaled.

---

## 13. SÖZLÜK

- **FAB** — Floating Action Button (sağ alt köşede dairesel buton)
- **Bottom Sheet** — Aşağıdan yukarı kayan kart
- **Snap point** — Bottom sheet'in durduğu yükseklik seviyeleri
- **Pin** — Harita üzerindeki ticket gösterimi
- **Cluster** — Yakın pin'lerin tek bir özet daireye toplanması
- **Heat map** — Yoğunluk haritası
- **Stadia Maps** — Tile sağlayıcı servis, custom harita renkleri için kullanılır
- **`<UrlTile>`** — react-native-maps'in custom tile yükleyici component'i
- **react-native-maps** — Expo Go uyumlu harita kütüphanesi (Apple Maps backend)
- **`<Marker>`** — Harita üzerinde tek pin (custom child component alabilir)
- **Region** — react-native-maps'in viewport gösterimi (lat/lng + delta'lar)
- **GeoJSON** — Coğrafi veri için JSON formatı
- **TTS** — Text-to-Speech
- **STT** — Speech-to-Text
- **VoiceOver** — iOS'un ekran okuyucu özelliği

---

**Son güncelleme:** Hackathon başlangıcı için hazırlandı.
**Bu doküman `product-spec.md` ile birlikte AI asistanlara context olarak verilmek üzere yazılmıştır.**
