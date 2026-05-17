# Beacon — Product Specification

> **Bu doküman ne için?** Bu dosya AI asistanlara (kod yazımı, mimari kararlar, UX kararları için) **context** olarak verilecek bir ürün spec dosyasıdır. Tek kaynak (single source of truth). Implementation kararları bu spec'e referansla alınmalıdır. Doküman boyunca `Beacon` placeholder olarak kullanılmıştır.

---

## 1. ELEVATOR PITCH

Beacon, görme engelli bireylerin dış mekan yürüyüşlerini güvenli kılan bir AI buddy uygulamasıdır. Telefon kamerasından gelen görüntüleri Vision Language Model (VLM) ile işleyip, kulaklıktan Türkçe sesli rehberlik (TTS) sunar.

Uygulama üç paydaşı tek platformda birleştirir:
1. **Görme engelli kullanıcı** — AI buddy ile gerçek zamanlı yürüyüş ve spor aleti tanıma rehberliği alır
2. **Sosyal sorumluluk gönüllüsü** — Sağlam birey olarak yürürken kaldırım/yol problemlerini feedback olarak girer, görme engelli kullanıcıların güvenliğine katkıda bulunur
3. **İnşaat/altyapı firması (B2B müşteri)** — Toplanan problem verisini coğrafi/kategorik kümeler halinde satın alarak belediye ihalelerinde rekabet avantajı elde eder

**Tek cümle:** Görme engelliye sesli rehber, vatandaşa sosyal sorumluluk platformu, inşaat firmasına lead generation marketplace.

---

## 2. KAPSAM — HACKATHON MVP

Bu doküman **24 saatlik hackathon MVP** kapsamı için yazılmıştır. Aşağıdaki listede her özellik **MVP** veya **POST-MVP** olarak işaretlidir.

### 2.1. MVP'ye giren özellikler

- [MVP] iOS uygulaması (Expo / React Native)
- [MVP] Onboarding + rol seçimi (Görme engelli / Gönüllü / Firma)
- [MVP] **Buddy Mode** — Görme engelli için canlı yürüyüş rehberliği (kamera → VLM → TTS)
- [MVP] **Sesli Soru-Cevap Modu** — Görme engelli kullanıcı için her ekranda erişilebilir sesli soru-cevap katmanı (STT → VLM + son frame + GPS → TTS)
- [MVP] **Spor Aleti Tanıma Modu** — Spor alanında makine tanıma ve sesli kullanım anlatımı
- [MVP] **Feedback Modu** — Gönüllü vatandaş için problem tespit ve raporlama (fotoğraf + konum)
- [MVP] Harita üzerinde ticket görüntüleme (renkli pin'ler)
- [MVP] Timeline (ticket feed) — kronolojik ticket akışı
- [MVP] Firma dashboard'u (basit web/mobil ekran) — veri kümelerinin coğrafi gösterimi ve kategori filtreleri
- [MVP] n8n ile otomatik mail bazlı belediye/firma bildirimi
- [MVP] Mapillary + OSM seed data ile harita ön doldurma

### 2.2. POST-MVP (zamanı yoksa atla, vizyonda kalsın)

- [POST-MVP] Sepete ekleme + ödeme akışı (firma marketplace tarafı)
- [POST-MVP] Resmi 153 / E-Belediye entegrasyonu
- [POST-MVP] Çoklu dil desteği
- [POST-MVP] Android sürümü
- [POST-MVP] Gönüllü-engelli direkt mesajlaşma
- [POST-MVP] Gamification / rozet sistemi (sosyal sorumluluk çerçevesi gereği özellikle istenmiyor)
- [POST-MVP] On-device VLM (Gemini Nano, Apple Intelligence)
- [POST-MVP] Wake word desteği ("Hey Buddy" / "Asistan" gibi) — MVP'de tek tap + auto-stop, zaman kalırsa wake word eklenir

---

## 3. KULLANICI ROLLERI VE AKIŞLAR

### 3.1. Rol 1: Görme Engelli Kullanıcı

**Birincil değer:** Güvenli, bağımsız yürüyüş + spor alanı kullanımı.

**Tipik kullanım senaryosu:**
1. Kullanıcı kulaklığını takar, uygulamayı sesli komutla veya tek dokunuşla açar
2. "Buddy Mode" otomatik başlar (rol seçimi gereği)
3. Telefon boyna asılı / cepte / elde (Implementation note: kamera açık tutulmalı, ekran kapalı olabilir)
4. Kullanıcı yürürken VLM periyodik olarak frame işler, kritik durumları TTS ile bildirir
5. Kullanıcı sesli komutla soru sorabilir ("Önümde ne var?", "Hangi spor aletindeyim?") — bu Voice Q&A katmanı **uygulamanın her ekranında** erişilebilir (sadece Buddy Mode'a özel değil)
6. Sistem sesli cevap verir
7. Yürüyüş sonunda kullanıcı konuşma transcript'i geçmişinde saklanır (görsel saklanmaz)

**Kritik UX kuralları:**
- Ekran UI minimum (kullanıcı görmüyor) — tek büyük buton, yüksek kontrast
- Tüm etkileşim ses bazlı (input: STT, output: TTS)
- **Voice Q&A görme engelli rolü için her ekranda** — Buddy Mode, Spor Modu ve idle ekranlarında ekrana tek tap ile sesli soru sorulabilir. Telefon boyna asılı veya cebe takılı olduğu için tüm ekran tek bir mic tetikleyici sayılır. (Map/Timeline/Dashboard sighted users için, görme engelli kullanıcı bu ekranlara yönlendirilmez.)
- **STT tetikleme:** tek tap + auto-stop (sessizlik algılayınca biter). MVP'de bu. POST-MVP: "Hey buddy" wake word.
- **Interrupt mantığı:** Kullanıcı her zaman müdahale edebilmeli — TTS konuşurken tap ile susturup yeni soru sorabilir. **İSTİSNA:** `priority: critical` mesajlar interrupt edilemez (hayati uyarı bölünmesin).
- Bildirim **bilgilendirici**, **yönlendirici değil** — "5 metre ileride sağda çukur var" denir, "sağa dön" denmez (etik sınır: kullanıcının kararı)
- Acil tehlikelerde (5m içinde) ses tonu/öncelik yükseltilir
- VLM bekleme süresinde sessizlik korunur (gereksiz konuşma yorucu)

### 3.2. Rol 2: Sosyal Sorumluluk Gönüllüsü

**Birincil değer:** Anlamlı katkı + farkındalık eğitimi.

**Tipik kullanım senaryosu:**
1. Kullanıcı yürürken bir problem fark eder (çukur, eksik rampa, vb.)
2. Uygulamayı açar, "Problem Bildir" akışına girer
3. Kamerayı problem yönüne tutar, fotoğraf çeker (1-3 fotoğraf burst)
4. VLM otomatik kategorize eder (eksik rampa, çukur, su birikintisi, engel, vb.)
5. Kullanıcı VLM çıktısını onaylar veya düzeltir
6. GPS koordinatı otomatik eklenir
7. Ticket DB'ye yazılır, haritada pin olarak görünür
8. Bekleme ekranında "Gözünü eğit" mikro-içeriği gösterilir (eğitim katmanı)
9. Aynı koordinatta 3+ gönüllüden gelen tespit "doğrulanmış" sayılır, n8n workflow tetiklenir

**Kritik UX kuralları:**
- Gamification yok (rozet/puan/sıralama yok — sosyal sorumluluk çerçevesi)
- "Gözünü eğit" mikro-içerikleri her kritik temas noktasında gösterilir (kamera açılışı, bekleme ekranı, pin kartı)
- Doğrulama akışı: harita üzerinde mevcut pinlere "Ben de gördüm" / "Artık yok" / "Buradayım, bilmiyorum" üç buton

### 3.3. Rol 3: İnşaat/Altyapı Firması (B2B)

**Birincil değer:** Bölgesel/kategorik problem verisi → belediye ihalesi için içgörü.

**Tipik kullanım senaryosu (MVP):**
1. Firma temsilcisi web/mobil dashboard'a giriş yapar
2. Haritada toplanan problem ticket'larını coğrafi olarak görür
3. Filtreler: ilçe, problem kategorisi (çukur / rampa / yüzey hasarı / vb.), tarih aralığı, doğrulama seviyesi
4. İlgilendiği coğrafi/kategorik kümeyi seçer
5. Küme detayını görür: kaç ticket, hangi türler, harita üzerinde dağılım
6. **MVP'de:** Mail ile veri talep eder; n8n workflow firmaya örnek veri seti gönderir
7. **POST-MVP'de:** Sepete ekler, ödeme yapar, veri seti indirilebilir/API ile erişilebilir hale gelir

**Kritik UX kuralları:**
- Veri kümeleri **anonimleştirilmiş** (gönüllü kullanıcı kimlikleri görünmez)
- Veri kümelerinin "değer önermesi" net olmalı: "Bu küme = Kadıköy'de 47 doğrulanmış kaldırım hasarı, son 30 günde tespit edilmiş, belediye henüz aksiyon almamış"
- POST-MVP marketplace özellikleri (sepet, ödeme) MVP'de yok ama UI'da disable/preview olarak gösterilebilir

---

## 4. ÖZELLİKLER — DETAYLI

### 4.1. Buddy Mode (Görme Engelli için Canlı Rehberlik)

**Akış:**
1. Kullanıcı Buddy Mode'a girer (tek buton veya otomatik açılış)
2. Kamera arka planda çalışır
3. Her N saniyede bir (önerilen: 5 saniye) frame yakalanır
4. Frame + kullanıcı GPS konumu + yakın çevredeki kayıtlı ticket'lar VLM'e gönderilir
5. VLM structured JSON döner (bkz. §6)
6. JSON'daki `speak_text` alanı TTS ile sesli çıkar
7. Acil durumlar (yüksek severity) öncelikli olarak okunur
8. Kullanıcı STT ile sesli soru sorabilir → soru + son frame VLM'e gönderilir → cevap TTS'e

**VLM prompt yaklaşımı (özet, detay §6):**
- Sistem prompt: "Sen görme engelli bir kullanıcının yürüyüş asistanısın. Tehlikeleri bildir, kararı kullanıcıya bırak."
- User content: frame + konum + bilinen yakın problemler
- Çıktı: structured JSON

**Önemli mühendislik kararları:**
- VLM çağrısı asenkron, yeni frame eski çağrı bitmeden başlatılmamalı (queue)
- TTS çıktısı kuyruğa alınmalı, üst üste konuşma engellenmelidir
- Pil koruması: ekran kapalı tutulabilir, sadece kamera + ses çalışır
- "Sessizlik" değerli — VLM "söylenecek kritik bir şey yok" derse konuşma

### 4.2. Sesli Soru-Cevap Modu (Voice Q&A — App-wide, görme engelli rolüne özel)

> Bu mod **standalone bir feature değil, görme engelli kullanıcı rolü için uygulama genelinde bir katmandır.** Görme engelli kullanıcının primary input modu sesli komut olduğu için, görme engelli rolünde her ekranda (Buddy Mode, Spor Modu, idle) erişilebilir olmalıdır.
>
> **Diğer rollerde (gönüllü, firma) Voice Q&A MVP'de YOK.** Map ekranı, Timeline ve Firma Dashboard sighted users için tasarlanmıştır (normal dokunma + klavye etkileşimi). POST-MVP'de gönüllü için sesli komut isteğe bağlı eklenebilir.

**Kapsam ve fiziksel kullanım varsayımı (görme engelli kullanıcı):**
- Telefon **boyna asılı veya cebe/göğüse takılı**, kamera açık (Buddy Mode için frame yakalanabilsin)
- Ekran muhtemelen görünmüyor (kapalı veya yüze bakmıyor)
- Bu yüzden **ekranın TÜMÜ tek bir mic tetikleyici sayılır** — UI gesture conflict'i yok çünkü kullanıcı diğer dokunma etkileşimlerini kullanmıyor
- POST-MVP'de "Hey buddy" wake word ile tap'a alternatif sunulur (telefon erişilemiyorsa eller dolu/buz tutuyor)

**Akış:**
1. Kullanıcı ekrana tek tap yapar (telefon boyna asılıyken bile el ulaşabilir)
2. Eğer TTS o anda konuşuyorsa → **anında susar**, TTS kuyruğu temizlenir
   - **İSTİSNA:** TTS o an `priority: critical` bir mesaj okuyorsa **susmaz, devam eder**. Kullanıcının hayati tehlike uyarısını bölmesi engellenir.
3. STT açılır, mikrofon dinlemeye başlar (kısa "ding" ses cue'su)
4. Kullanıcı sorusunu söyler ("Önümde ne var?", "Bu nasıl çalışıyor?")
5. Sessizlik algılanınca (auto-stop, ~1.5sn sessizlik) STT durur, transcript üretilir
6. STT transcript + screen_context + son frame (varsa) + GPS → VLM'e gönderilir (Pattern D)
7. VLM structured JSON döner (bkz. §6.4)
8. JSON içindeki `answer_speak_text` TTS Queue'ya eklenir
9. JSON içinde `requires_action` varsa UI ona göre yönlendirme yapar
10. Transcript `conversations` tablosuna yazılır (`input_source: voice`, frame URL referansı, `screen_context`)

**Concurrency ve önceliklendirme (kritik):**

Pattern A (Buddy Mode proaktif) ve Pattern D (Voice Q&A reaktif) paralel akabilir. TTS Queue tek noktadan yönetilir ve `priority` etiketine göre davranır:

| Çakışma durumu | Davranış |
|---|---|
| TTS Pattern A `low/medium/high` çalıyor + kullanıcı tap | TTS susar, kuyruk flush, STT açılır (kullanıcı interrupt edebilir) |
| TTS Pattern A **`critical`** çalıyor + kullanıcı tap | **TTS susmaz, kritik mesaj bitene kadar dinlenir.** STT tetiklenmez. Kullanıcı kritik mesajdan sonra tekrar tap'lemeli. |
| TTS Pattern D (Voice Q&A cevabı) çalıyor + Pattern A `critical` çıktısı geldi | **Pattern D cevabı kesilir**, kritik uyarı araya girer (Voice Q&A cevabı kayba gider; hayat > cevap) |
| TTS Pattern D çalıyor + Pattern A `low/medium/high` geldi | Pattern A çıktısı kuyruğa girer, Pattern D bittikten sonra çalar |
| Pattern A 5sn periyodu Pattern D işlenirken geldi | Pattern A normal çalışır (frame yakala, VLM çağır). Çıktısı yukarıdaki kurallara göre kuyruğa girer veya ezer. |
| VLM Pattern D çağrısı pending + kullanıcı tap | Pattern D çağrısı cancel (abort controller), yeni STT açılır |
| VLM Pattern D çağrısı pending + Pattern A `critical` çıktı | Pattern D devam eder ama TTS kuyruğunda kritik öne geçer |

**Kural özeti tek cümlede:** `priority: critical` her zaman ezer ve ezilemez; diğer her şey kullanıcı interrupt'una açıktır.

**STT teknoloji stratejisi (önemli mühendislik kararı):**

İki STT sağlayıcı birden denenecek, üretimde latency'ye göre seçilecek. Mimari **adapter pattern** üzerine kurulur ki ikisi de plug-and-play olsun:

```typescript
// Soyut interface
interface STTAdapter {
  startListening(): Promise<void>
  stopListening(): Promise<{ transcript: string; confidence: number }>
  cancel(): void
}

// İki implementasyon
class ExpoNativeSTTAdapter implements STTAdapter { ... }
class WhisperAPISTTAdapter implements STTAdapter { ... }
```

- **Primary (denenecek):** `expo-speech-recognition` — native, ücretsiz, on-device, en hızlı (~200-500ms post-utterance)
- **Fallback (denenecek):** OpenAI Whisper API — daha doğru ama latency ekstra (1-2sn) + maliyet
- **Karar metodu:** Hackathon ilk 2 saatinde Türkçe 10 örnek cümle ile her ikisi de test edilir, accuracy + latency tabloya yazılır, karar verilir
- Ana mimari API tabanlı düşünülür (Whisper varsayımı) — native'e geçişte downgrade kolay, tersi zor

**Interrupt davranışı (kritik):**
- TTS konuşurken kullanıcı tap → TTS instant stop, kuyruk flush, STT açılır
- VLM çağrısı pending'ken kullanıcı tap → VLM çağrısı cancel edilir (abort controller), yeni STT açılır
- Sebep: kullanıcı "yeter, sus" diyebilmek için ya da "bekle, başka soru sorayım" diyebilmek için instant müdahale şart

**Hata durumları:**
- STT hiçbir şey duyamadı / boş transcript → "Anlayamadım, tekrar söyler misin?" TTS
- STT confidence düşük (< 0.4) → VLM'e gönderilir ama prompt'a "STT belirsiz, mantıklı yorumla" notu eklenir
- VLM timeout (> 8sn) → "Bağlantı sorunu var, biraz sonra tekrar dene" TTS
- Frame yok ve soru frame gerektiriyor → "Kamerayı önündeki şeye doğru tutar mısın?" TTS

**Context awareness (VLM'e gönderilen):**
VLM'e sadece STT text'i değil, kullanıcının uygulamada nerede olduğu da gönderilir. Aynı soru farklı ekranda farklı cevap alabilir:

| Soru | Buddy Mode | Spor Modu | Idle (mod kapalı) |
|---|---|---|---|
| "Bu ne?" | Frame'deki en belirgin nesneyi anlatır | Spor aletini detaylı anlatır | "Buddy modunu açayım mı?" diye sorar |
| "Tehlike var mı?" | Önündeki frame'i tarar | "Spor aleti güvenli kullanılıyor mu" diye bakar | Frame yok → "Kamerayı açmam lazım" |
| "Devam edebilir miyim?" | Frame analiz, immediate warning | "Bu seti bitirmeden dur" gibi | Bağlam belirsiz → kullanıcıya sor |

**Görme engelli kullanıcı için kapsam (önemli):** Voice Q&A sadece **Buddy Mode**, **Spor Modu**, ve **idle** ekranlarında aktiftir. Map, Timeline, Firma Dashboard gibi sighted users için tasarlanmış ekranlara görme engelli kullanıcı zaten girmez (rol bazlı routing onları Buddy Mode'a yönlendirir, bkz. §4.7).

**MVP kısıtları:**
- Çok turlu konuşma (multi-turn dialog) yok — her soru bağımsız işlenir (POST-MVP: 2-3 turluk context window)
- Background dinleme yok — kullanıcı tetiklemeli (POST-MVP: "Hey buddy" wake word)
- Sesli komutla ekran geçişi sınırlı — sadece `requires_action` JSON alanındaki tanımlı action'lar (switch_to_buddy, switch_to_sport, none). `open_feedback` ve `open_map` görme engelli için MVP'de yok (zaten erişmeyeceği ekranlar)

### 4.3. Spor Aleti Tanıma Modu

**Akış:**
1. Kullanıcı "Spor Modu"na girer (sesli komut veya butonla)
2. Kamerayı aletin üzerine tutar
3. VLM aleti tanır: cihaz türü (örneğin: leg press), kullanım talimatı, dikkat edilecekler
4. TTS ile aleti anlatır: "Bu bacak kaldırma makinesi. Önündeki kola otururken ayaklarını dayayacaksın..."
5. Kullanıcı sesli olarak takip soruları sorabilir ("Ağırlığı nasıl ayarlarım?")

**Hedef kitle:**
- Görme engelli birey (asıl)
- Yaşlı bireyler / makine kullanmayı bilmeyenler (yan değer)

**VLM prompt farkı:**
- Buddy Mode "tehlike tespiti" odaklı
- Spor Modu "açıklama" odaklı, daha detaylı, daha uzun cevap

**MVP basitleştirme:**
- Sadece açık alan park spor aletleri (kamuya açık)
- Spesifik marka tanıma yok — VLM'in genel tanıma yeteneği yeterli

### 4.4. Feedback Modu (Gönüllü Problem Tespiti)

**Akış:**
1. "Problem Bildir" akışı
2. Kamera açılır, 1-3 fotoğraf burst çekilir
3. Loading state'te "Gözünü eğit" mikro-içeriği gösterilir
4. VLM problem türünü kategorize eder, severity verir, etkilenen kullanıcı tiplerini listeler
5. Kullanıcı VLM çıktısını onaylar/düzeltir (kategori değiştirebilir)
6. Konum otomatik (GPS) + kullanıcının manuel ince ayar imkanı (harita üzerinde sürükle)
7. "Gönder" → ticket DB'ye yazılır → harita pin'i belirir → timeline'a düşer
8. n8n workflow tetiklenir (doğrulama kontrolü, varsa firma/belediye mail)

**Mikro-içerik örnekleri ("Gözünü eğit"):**
- "Tekerlekli sandalye için 2cm yükseklik farkı aşılmazdır."
- "Görme engelli için sarı dokunsal yüzey kritik. Eksikse görmek için bak."
- "Bebek arabası için kaldırım eğimi %8'i geçerse devrilir."
- "Beyaz baston için 30cm'den dar geçit engeldir."
- "Türkiye'de kaldırımların %73'ü tekerlekli sandalye standartlarına uymuyor (TSED 2023)."

### 4.5. Harita ve Timeline

**Harita ekranı:**
- Ticket'lar konum bazlı pin olarak gösterilir
- Pin renkleri:
  - Kırmızı (1 tespit, doğrulanmamış)
  - Turuncu (2 tespit)
  - Yeşil (3+ doğrulanmış)
- Pin'lere ikon eşliği zorunlu (renk körü erişilebilirliği)
- Pin'e tıklayınca kart: fotoğraf, problem türü, etkilenen kullanıcılar, doğrulama sayısı, "Ben de gördüm/Artık yok/Bilmiyorum" butonları
- Filtreler: kategori, tarih, doğrulama seviyesi

**Timeline ekranı:**
- Ticket'ların kronolojik feed'i
- Her ticket: fotoğraf, problem türü, konum (semt adı), zaman, doğrulama sayısı
- Tıklayınca detay kartı

### 4.6. Firma Dashboard (Marketplace MVP)

**Görünüm:**
- Harita merkezli (Türkiye geneli, başlangıçta İstanbul'a zoom)
- Sol panelde filtreler:
  - İlçe / mahalle
  - Problem kategorisi (multi-select)
  - Tarih aralığı
  - Doğrulama seviyesi (sadece doğrulanmış / hepsi)
- Filtre sonuçları haritada vurgulanır
- Üstte özet kartlar: "Toplam ticket: X", "Doğrulanmış: Y", "Etkilenen kullanıcı tahmini: Z"
- "Bu Kümeyi Talep Et" butonu → form (firma adı, mail, açıklama) → n8n workflow tetiklenir → admin'e mail gider + firmaya örnek veri seti mail atılır

**MVP basitleştirme:**
- Login basit (mail+şifre veya magic link)
- Ödeme akışı yok
- Veri seti indirme yok, sadece talep formu
- POST-MVP'de bu akış sepet + ödeme + indirme olur

### 4.7. Onboarding

**Adımlar (3 ekran):**
1. **Hoş geldin** — Ürün misyonu kısa anlatım (sosyal sorumluluk çerçevesi)
2. **Sen kimsin?** — Rol seçimi (Görme engelli / Gönüllü vatandaş / Firma)
3. **İzinler** — Kamera, mikrofon, konum, bildirim (rolüne göre değişir)

**Rol seçimine göre yönlendirme:**
- Görme engelli → Buddy Mode'a yönlendir, kulaklık takmaları için sesli uyarı
- Gönüllü → Harita ekranına yönlendir
- Firma → Dashboard'a yönlendir (login akışı)

---

## 5. TEKNİK MİMARİ

### 5.1. Tech Stack

| Katman | Teknoloji | Not |
|---|---|---|
| Mobil | Expo (React Native), iOS hedefli | Tek kod tabanı, hızlı iterasyon |
| Backend / DB | Supabase (Postgres + PostGIS + Storage + Auth) | Geocoded sorgu için PostGIS şart |
| VLM | Karar verilecek (Gemini 2.5 Flash veya Claude Sonnet 4.5 önerilir) | İlk 1 saatte 5 örnek görselle test edilip seçilecek |
| STT | **Adapter pattern:** `expo-speech-recognition` (primary deneme) + OpenAI Whisper API (fallback deneme) | Mimari API-tabanlı düşünülür (Whisper varsayımı). İkisi de denenir, latency+accuracy tablosuyla karar verilir. |
| TTS | Expo Speech (native, ücretsiz) | POST-MVP'de ElevenLabs Türkçe değerlendirilebilir |
| Otomasyon | n8n (hackathon kredisi mevcut) | Veri toplama, doğrulama döngüsü, mail bildirimi |
| Harita | react-native-maps + Mapbox veya Google Maps | PostGIS sorguları ile pin koordinatları |
| Dashboard (firma) | Next.js veya Expo web build | MVP için Expo web yeterli olabilir |

### 5.2. Mimari diyagram (mantıksal)

```
┌─────────────────────────────────────────────────────────────────┐
│                     MOBİL UYGULAMA (Expo)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Buddy Mode   │  │ Feedback     │  │ Harita/Timeline  │      │
│  │ (kamera+ses) │  │ Modu         │  │                  │      │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘      │
│         │                 │                   │                 │
│  ┌──────▼─────────────────▼───────────────────▼──────────────┐ │
│  │  Voice Q&A Layer (app-wide, her ekranda erişilebilir)     │ │
│  │  ┌─────────────┐         ┌─────────────────────────────┐  │ │
│  │  │ STT Adapter │◀───mic──│ Tek tap + auto-stop trigger │  │ │
│  │  │ (Expo/      │         └─────────────────────────────┘  │ │
│  │  │  Whisper)   │                                          │ │
│  │  └──────┬──────┘                                          │ │
│  │         │ transcript + screen_context + frame + GPS       │ │
│  │         ▼                                                 │ │
│  │  ┌──────────────┐         ┌──────────────────────────┐    │ │
│  │  │ TTS Queue    │◀────────│ TTS (Expo Speech)        │    │ │
│  │  │ + interrupt  │         │ ↑ instant stop on tap    │    │ │
│  │  └──────────────┘         └──────────▲───────────────┘    │ │
│  └─────────────────────────────────────┼────────────────────┘ │
│                                        │ speak_text             │
└───────────────────────────┬────────────┼────────────────────────┘
                            │            │
              ┌─────────────▼────────────┴─────────────┐
              │           VLM API (Gemini/Claude)      │
              │  Pattern A: Buddy Mode (frame periyodik)│
              │  Pattern B: Feedback (kategorize)       │
              │  Pattern C: Spor Modu (açıklama)        │
              │  Pattern D: Voice Q&A (text+frame+ctx)  │
              └────────────────┬───────────────────────┘
                               │
                               ▼
   ┌──────────────────────────────────────────────────────┐
   │              SUPABASE (Postgres + Storage)           │
   │  - users (rol bazlı)                                 │
   │  - tickets (problem ticket'ları)                     │
   │  - verifications (ben de gördüm onayları)            │
   │  - conversations (STT transkripti, frame ref, ctx)   │
   │  - data_requests (firma talepleri)                   │
   └────────────────────────▲─────────────────────────────┘
                            │
                            │ webhook trigger
                            ▼
                  ┌──────────────────────┐
                  │      n8n             │
                  │  - Seed data toplama │
                  │    (Mapillary, OSM)  │
                  │  - Doğrulama döngüsü │
                  │  - Mail bildirimi    │
                  │    (firma/belediye)  │
                  └──────────────────────┘
```

**AI Flow özet — iki yönlü:**

```
Yön 1 (proaktif, sistem tetikli — Buddy Mode):
  Kamera frame ──▶ VLM (Pattern A) ──▶ JSON.speak_text ──▶ TTS Queue ──▶ kullanıcı duyar

Yön 2 (reaktif, kullanıcı tetikli — Voice Q&A, her ekranda):
  Kullanıcı tap ──▶ STT Adapter ──▶ transcript + son frame + GPS + screen_context
                                  ──▶ VLM (Pattern D) ──▶ JSON.answer_speak_text
                                  ──▶ TTS Queue ──▶ kullanıcı duyar
                                  
  Interrupt: kullanıcı tap iken TTS konuşuyorsa → TTS instant stop, queue flush,
             pending VLM cancel, STT açılır
```

### 5.3. Veri modeli (Supabase)

**users**
```
id (uuid, pk)
email (text)
role (enum: visually_impaired, volunteer, company)
display_name (text)
created_at (timestamp)
```

**tickets**
```
id (uuid, pk)
created_by (uuid, fk → users.id)
location (geography POINT)         -- PostGIS
issue_type (enum: pothole, missing_ramp, missing_tactile_paving,
                  obstacle, uneven_surface, water_pooling, narrow_passage,
                  damaged_equipment, other)
severity (enum: low, medium, high)
affected_users (text[])             -- ['wheelchair', 'visually_impaired', 'stroller', 'elderly']
description_tr (text)
photo_urls (text[])                 -- Supabase Storage URL'leri
confidence (numeric)                -- VLM confidence skoru
source (enum: user_volunteer, user_visually_impaired, mapillary_seed, osm_seed, ibb_open_data)
verification_count (int, default 1)
verified (boolean, computed: verification_count >= 3)
status (enum: open, in_progress, resolved, dismissed)
created_at (timestamp)
updated_at (timestamp)
```

**verifications**
```
id (uuid, pk)
ticket_id (uuid, fk → tickets.id)
user_id (uuid, fk → users.id)
verification_type (enum: confirmed, denied, unknown)  -- "Ben de gördüm" / "Artık yok" / "Bilmiyorum"
created_at (timestamp)
```

**conversations** (görme engelli kullanıcı STT/TTS geçmişi)
```
id (uuid, pk)
user_id (uuid, fk → users.id)
session_id (uuid)
role (enum: user, assistant)
content_text (text)                 -- sadece text saklanır, ses kaydı YOK
input_source (enum: voice, text, system)  -- voice = STT'den, text = klavye (POST-MVP), system = AI proaktif (Buddy Mode)
stt_confidence (numeric, nullable)  -- STT confidence skoru (sadece voice ise)
stt_provider (enum: expo_native, whisper_api, nullable)  -- hangi STT adapter kullanıldı
frame_url (text, nullable)          -- soruyla beraber VLM'e gönderilen frame'in Storage URL'i (eğer Buddy/Spor modundaysa)
screen_context (text, nullable)     -- 'buddy_mode' | 'sport_mode' | 'idle' (Voice Q&A scope)
vlm_pattern (text, nullable)        -- 'A' | 'B' | 'C' | 'D' — hangi VLM pattern'i kullanıldı
location (geography POINT, nullable)
created_at (timestamp)
```

**data_requests** (firma talepleri)
```
id (uuid, pk)
company_user_id (uuid, fk → users.id)
filter_criteria (jsonb)             -- {ilce, kategori, tarih, vb.}
ticket_ids (uuid[])                 -- talep edilen ticket'lar
status (enum: pending, fulfilled, rejected)
contact_email (text)
created_at (timestamp)
```

### 5.4. VLM kullanım stratejisi

Dört ayrı VLM çağrı paterni var:

**Pattern A — Buddy Mode (low-latency, structured):**
- Input: frame + GPS + yakın ticket'lar
- Çıktı: JSON (immediate_warnings, upcoming_known_issues, navigation_hint, speak_text)
- Frekans: her 5 saniyede bir
- Kritik: hız > detay; gereksiz konuşma azaltılmalı

**Pattern B — Feedback Modu (one-shot, categorization):**
- Input: 1-3 fotoğraf
- Çıktı: JSON (has_damage, issues[], overall_accessibility_score)
- Frekans: kullanıcı tetikler
- Kritik: doğru kategorizasyon > hız

**Pattern C — Spor Modu (one-shot, descriptive):**
- Input: 1 fotoğraf
- Çıktı: JSON (equipment_name, usage_instructions_tr, safety_warnings_tr, speak_text)
- Frekans: kullanıcı tetikler
- Kritik: detaylı ve doğru anlatım > hız

**Pattern D — Voice Q&A (user-tetikli, contextual, multi-input):**
- Input: STT transcript + screen_context + son frame (varsa) + GPS + yakın bilinen ticket'lar
- Çıktı: JSON (interpreted_question, answer_speak_text, requires_camera, requires_action)
- Frekans: kullanıcı tetikler (tek tap)
- Kritik: bağlam farkındalığı + doğal Türkçe sözlü cevap. Aynı soru farklı ekranda farklı yanıt alır.
- Adapter abstraction: STT sağlayıcısı değişse de VLM girdisi aynı şekil (transcript + context object) — frontend STT impl detayını VLM'den saklar

---

## 6. VLM PROMPT ŞEMALARI

### 6.1. Buddy Mode prompt

```
ROL: Sen görme engelli bir kullanıcının yürüyüş asistanısın. 
Türkçe, sakin, kısa ve net konuşursun. Asla yön emri vermezsin 
(örn. "sola dön" demezsin) — sadece bilgilendirirsin, karar 
kullanıcıya aittir.

INPUT:
- Frame (kullanıcının önündeki ortam)
- Kullanıcı konumu: [lat, lon]
- Yakın çevredeki bilinen problemler:
  {known_issues_json}

GÖREV:
Şu JSON şemasında cevap ver:

{
  "immediate_warnings": [
    "1 cümle, 5 metre içinde olan kritik tehlikeler"
  ],
  "upcoming_known_issues": [
    "bilinen yakın problemler, sade dille"
  ],
  "speak_text": "Türkçe, doğal, sakin, 2-3 cümle. Bu metin sese çevrilecek. Sadece kullanıcının bilmesi gereken kritik bilgi. Söylenecek bir şey yoksa boş string döndür.",
  "priority": "low" | "medium" | "high" | "critical"
}

ÖNEMLİ:
- speak_text boş bırakılabilir (sessizlik değerli)
- Söylenecek bir şey yoksa zorla konuşma
- "Önünde", "sağında", "solunda" gibi yön referansları frame'e göre kullanılır
- Mesafeyi tahmin et, küçük belirsizlik kabul edilir
- **priority değerleri:**
  - `low` — bilgi notu, kullanıcı duymasa da olur (örn: "Sağında bir bank var")
  - `medium` — dikkat çekici ama acil değil (örn: "İlerde kalabalık var")
  - `high` — yakın çevrede tehlike, hızlı bildirilmeli (örn: "5 metre ileride çukur var")
  - `critical` — **anında müdahale gereken hayati tehlike** (örn: "Hemen önünde merdiven boşluğu var", "Yola çıkmak üzeresin")
- `critical` sadece çarpışma/düşme/araç gibi anlık fiziksel risk içeren durumlarda kullanılır. Aşırı kullanma — boyun "kurt" gibi olur.
```

### 6.2. Feedback Modu prompt

```
ROL: Sen kaldırım/yol erişilebilirliği uzmanısın. Vatandaşın 
çektiği fotoğrafı analiz edip problem(ler)i kategorize ediyorsun.

INPUT:
- 1-3 fotoğraf (aynı problemin farklı açılarından)

GÖREV:
Şu JSON şemasında cevap ver:

{
  "has_damage": boolean,
  "issues": [
    {
      "type": "pothole" | "missing_ramp" | "missing_tactile_paving" 
              | "obstacle" | "uneven_surface" | "water_pooling" 
              | "narrow_passage" | "damaged_equipment" | "other",
      "severity": "low" | "medium" | "high",
      "affected_users": ["wheelchair", "visually_impaired", "stroller", "elderly"],
      "description_tr": "tek cümle Türkçe açıklama",
      "confidence": 0.0-1.0
    }
  ],
  "overall_accessibility_score": 1-10
}

ÖNEMLİ:
- Sadece kesin gördüğün problemleri raporla
- Emin değilsen confidence düşür, uydurma
- Birden fazla problem varsa hepsini listele
- "affected_users" alanı her problem için spesifik olmalı
```

### 6.3. Spor Modu prompt

```
ROL: Sen spor aleti açıklama uzmanısın. Görme engelli veya 
makineyi bilmeyen bir kullanıcıya parktaki/spor alanındaki 
aleti anlatıyorsun.

INPUT:
- 1 fotoğraf (spor aleti)

GÖREV:
Şu JSON şemasında cevap ver:

{
  "equipment_detected": boolean,
  "equipment_name_tr": "aletin Türkçe adı",
  "muscle_groups": ["ayak", "kol", "sırt", "karın", "bacak", "omuz"],
  "usage_steps_tr": [
    "Adım 1...",
    "Adım 2...",
    "Adım 3..."
  ],
  "safety_warnings_tr": [
    "Dikkat edilmesi gereken nokta 1",
    "Nokta 2"
  ],
  "speak_text": "Türkçe, doğal, akıcı paragraf. Kullanıcıya aletin ne olduğunu, nasıl oturacağını, ne yapacağını anlatır. 4-6 cümle."
}

ÖNEMLİ:
- Aleti tanıyamıyorsan equipment_detected: false
- Türkçe açıklama doğal olmalı, "step 1" gibi listelemeden kaçın
- Güvenlik uyarıları kritik, eksik bırakma
```

### 6.4. Sesli Soru-Cevap (Voice Q&A) prompt

```
ROL: Sen görme engelli bir kullanıcının sesli asistanısın. Kullanıcı
sana SESLİ soru sordu (STT ile metne çevrildi) ve sen Türkçe SÖZLÜ
cevap vereceksin. Cevabın TTS ile sese çevrilecek — bu yüzden kısa,
doğal, KONUŞMA DİLİ kullan. Asla yön emri verme (etik sınır).

INPUT:
- Kullanıcının sorusu (STT transkripti): "{question_text}"
- STT confidence: {0.0-1.0}  -- düşükse mantıklı yorumla, varsa düzelt
- Kullanıcının bulunduğu ekran/durum (screen_context): 
    "buddy_mode" | "sport_mode" | "idle"
- O anki en son frame (varsa, Buddy/Spor modundayken): {frame}
- Kullanıcı konumu: [lat, lon]  (varsa)
- Yakın bilinen problemler: {known_issues_json}  (varsa)

GÖREV:
Şu JSON şemasında cevap ver:

{
  "interpreted_question": "Kullanıcının ne sorduğunu nasıl anladığın (debug için, kısa)",
  "answer_speak_text": "TTS'e gidecek Türkçe SÖZLÜ cevap. Konuşma dili. 1-3 cümle. Yön emri YASAK. Belirsizlik varsa kullanıcıya sor.",
  "requires_camera": boolean,
  "requires_action": "none" | "switch_to_buddy" | "switch_to_sport",
  "confidence": 0.0-1.0
}

BAĞLAM FARKINDALIĞI (screen_context'e göre cevap stratejisi):

- buddy_mode: Frame'i analiz et, kullanıcının önündeki çevreyi sor sorduysa anlat.
  "Bu ne?" → frame'deki en belirgin nesne. "Tehlike var mı?" → immediate warnings.

- sport_mode: Frame'deki spor aletine odaklan. Detaylı, eğitici cevap.
  "Bu nasıl çalışıyor?" → kullanım adımları. "Güvenli mi?" → güvenlik uyarıları.

- idle: Herhangi bir AI modu açık değil. Genel uygulama soruları, mod değiştirme.
  "Buddy modunu aç" → requires_action: switch_to_buddy.
  "Spor aletine bakacağım" → requires_action: switch_to_sport.
  Frame yok bu durumda — frame gerektiren sorularda kullanıcıya nazikçe Buddy/Sport modunu açmasını öner.

ÖNEMLİ KURALLAR:
- Cevap SÖZLÜ konuşma dili — yazılı dil değil. Madde madde yok, paragraf yok.
- Yön emri YASAK ("sağa git" deme — "sağında ... var" de). Etik sınır.
- STT yanlış transkripsiyon yapmış olabilir; ses benzerliklerini düşün ve mantıklı yorumla.
  Örnek: "çukur" yerine "şükür" gelmiş olabilir, context'e göre düzelt.
- Frame yok ama soru frame gerektiriyorsa: requires_camera: true, answer_speak_text'te 
  nazikçe kameraya tutmasını iste ("Kamerayı önündeki şeye doğru tutar mısın?").
- Kullanıcı "sus" / "yeter" / "tamam" derse: answer_speak_text boş string döndür. 
  (TTS zaten kullanıcı tap'le susturuldu; cevap üretmek loop yaratır. VLM bu durumda da çağrılmamalıdır
  ama yine de çağrıldıysa boş speak_text üret.)
- Kullanıcı ekran değiştirmek isterse: requires_action'da uygun route'u belirt.
- Sorunun cevabı emin değilsen: confidence düşür, kullanıcıya nazikçe sor.
```

---

## 7. n8n WORKFLOW'LARI

### 7.1. Workflow 1: Seed Data Toplama (hackathon başında bir kez çalıştırılır)

**Tetikleyici:** Manual

**Akış:**
```
Manual Trigger
  ↓
HTTP Request → Mapillary API
  (bbox: İstanbul merkez bölgeleri, 5-6 farklı koordinat)
  ↓
Split In Batches (rate limit için)
  ↓
HTTP Request → Supabase Storage (görsel yükle)
  ↓
HTTP Request → VLM API (Feedback Modu prompt)
  ↓
Code Node (JSON parse + ticket nesnesi oluştur)
  ↓
HTTP Request → Supabase REST (tickets insert)
  ↓
[Paralel branch]
HTTP Request → OSM Overpass API
  (kerb=raised, wheelchair=no, smoothness=bad, surface=*)
  ↓
Code Node (OSM tag → ticket nesnesi)
  ↓
HTTP Request → Supabase REST (tickets insert, source='osm_seed')
```

**Beklenen sonuç:** ~100 Mapillary tabanlı ticket + ~500 OSM tabanlı ticket. Harita demo için zengin.

### 7.2. Workflow 2: Doğrulama Döngüsü ve Bildirimler

**Tetikleyici:** Supabase webhook (verifications tablosuna yeni satır)

**Akış:**
```
Webhook Trigger
  ↓
HTTP Request → Supabase (ilgili ticket'ı al)
  ↓
IF Node: verification_count >= 3 mü?
  ├─ Hayır → STOP
  └─ Evet ↓
Code Node (firma kategorisi belirle: hangi tür problem → hangi firma türü)
  ↓
[Paralel branch 1] Send Email (firma alert):
  - To: dummy@inşaatfirması.com (MVP'de hardcoded test mail)
  - Subject: "Yeni doğrulanmış ticket: {issue_type} - {ilçe}"
  - Body: Ticket detayları + harita linki
  ↓
[Paralel branch 2] Send Email (belediye alert):
  - To: dummy@belediye.gov.tr (MVP'de hardcoded test mail)
  - Subject: "Şikayet bildirimi: {issue_type} - {koordinat}"
  - Body: Ticket detayları
  ↓
HTTP Request → Supabase (ticket.status = 'in_progress' güncelle)
```

### 7.3. Workflow 3: Firma Veri Talebi

**Tetikleyici:** Supabase webhook (data_requests tablosuna yeni satır)

**Akış:**
```
Webhook Trigger
  ↓
HTTP Request → Supabase (talep edilen ticket'ları al)
  ↓
Code Node (CSV oluştur veya JSON'u biçimlendir)
  ↓
Send Email:
  - To: {firma email}
  - Subject: "Veri talebiniz hazır: {filter_summary}"
  - Body: Özet + ek dosya (CSV)
  - Attachment: ticket_data.csv
  ↓
HTTP Request → Supabase (data_requests.status = 'fulfilled')
```

### 7.4. n8n kredi yönetimi

**Yüksek değer, düşük maliyet (yap):**
- Seed data toplama (1 kez çalışır)
- Mail bildirimi (event-driven, az sayıda)
- Veri talebi karşılama (manuel tetikli)

**Krediyi yakar (yapma veya dikkatli):**
- Her vatandaş feedback'inde otomatik VLM çağrısı → bunu backend kodunda yap, n8n'e atma
- Real-time Buddy Mode → doğrudan VLM API'sine, n8n'e uğratma
- Saniyelik webhook trigger → batch'le

---

## 8. UX İLKELERİ

### 8.1. Görme engelli kullanıcı için

- **Tek el kullanım** — tüm kritik etkileşim tek elle ulaşılabilir olmalı
- **Sesli odak** — ekran ikincil, ses birincil
- **Voice Q&A görme engelli rolüne özel** — Buddy Mode, Spor Modu ve idle ekranlarında tek tap ile sesli soru. Telefon boyna asılı/cepte olduğu için ekranın tümü mic tetikleyici. Map/Dashboard sighted users için, görme engelli kullanıcı bu ekranlara yönlendirilmez.
- **STT tetikleme:** tek tap + auto-stop (sessizlik algılayınca biter). MVP'de bu. POST-MVP: "Hey buddy" wake word.
- **Interrupt mantığı:** Kullanıcı her zaman müdahale edebilmeli — TTS konuşurken tap ile susturup yeni soru sorabilir. **Tek istisna:** `priority: critical` mesajlar interrupt edilemez (hayati uyarı bölünmesin, bkz. §4.2 concurrency tablosu).
- **Sessizlik değerli** — uygulama "söylenecek bir şey varsa" konuşur, gevezelik etmez
- **Tehlike önceliği** — kritik tehlikeler diğer sesleri keser (interrupt)
- **Bilgilendir, emretme** — kullanıcının kararını sınırlandırmadan, tehlikeyi bildir

### 8.2. Gönüllü için

- **Gamification yok** — rozet, puan, sıralama olmayacak
- **Eğitim katmanı her temas noktasında** — "Gözünü eğit" mikro-içerikleri
- **Hızlı feedback akışı** — 30 saniyede problem bildirilmeli
- **Doğrulama düşük efor** — pin'e tıkla, tek butonla onay/red

### 8.3. Firma için

- **Veri değer önermesi net** — her küme için "kaç ticket, ne kategorisi, ne kadar doğrulanmış, ne kadar yeni"
- **Filtreler hızlı** — coğrafi + kategorik + zamansal filtreler 2 saniyede sonuç vermeli
- **Talep süreci basit** — MVP'de tek form, POST-MVP'de sepet

### 8.4. Görsel tasarım

- **Yüksek kontrast** (görme engelli kullanıcı bile düşük görüş seviyesinde algılayabilmeli)
- **Renk + ikon** (renk körü erişilebilirliği)
- **Büyük dokunma alanları** (44pt+ Apple guideline)
- **Türkçe yazım** — Türkçe karakter desteği, doğru i/I, ç, ş, ğ kullanımı

---

## 9. ERIŞILEBILIRLIK VE ETIK

### 9.1. Görme engelli kullanıcı sorumluluğu

- **Yön emri verilmez** — "sağa dön" gibi direktifler yasak (yaralanma sorumluluğu)
- **Bilgilendirme yapılır** — "Önünde 5 metre ileride çukur var" gibi
- **Kullanıcı her zaman karar verir** — uygulama destek aracıdır, asistan değildir

### 9.2. Veri ve gizlilik (açık sorular — zamanı varsa araştır)

- Kamera açıkken çevredeki yabancıların görüntüleri çekiliyor → KVKK kapsamında ne yapılmalı?
  - **MVP kararı:** Görseller VLM'e gönderilir, **kullanılmaz** (eğitim için saklanmaz)
  - **POST-MVP:** Yüz/plaka otomatik blurlama
- Kullanıcının konuşması (STT) text'e çevrilip saklanır
  - **Ses kaydı SAKLANMAZ** (sadece transcript text'i)
- Görseller AI eğitimi için kullanılmaz

### 9.3. Çocuk koruması

- Uygulama yetişkin kullanıcılara yönelik
- Görme engelli çocuklar için ebeveyn onayı gerekir (POST-MVP)

---

## 10. SUCCESS METRICS (MVP demo için)

Hackathon demosunda başarı kriterleri:

- **Buddy Mode canlı çalışıyor** — kamerayı tutunca 5-10 saniye içinde sesli çıktı
- **Voice Q&A canlı çalışıyor** — kullanıcı tek tap → soru sorar → 3-5 saniyede sesli cevap. Demo: "Önümde ne var?" sorusu Buddy Mode'da, "Bu nasıl çalışır?" sorusu Spor Modu'nda
- **Interrupt çalışıyor** — TTS konuşurken tap ile susturulabiliyor, hemen yeni soru sorulabiliyor
- **Feedback akışı canlı çalışıyor** — fotoğraf çekildi, kategorize edildi, harita pin'i belirdi
- **Spor modu çalışıyor** — bir spor aleti fotoğrafına anlamlı Türkçe anlatım
- **Harita zengin** — 500+ pin (seed data sayesinde)
- **n8n canlı gösterilebiliyor** — workflow ekranı yansıtılıp doğrulama → mail akışı canlı tetikleniyor
- **Firma dashboard'unda filtreler çalışıyor** — kümeleme + talep formu gösterilebiliyor

---

## 11. AÇIK SORULAR / RİSKLER

1. **VLM seçimi** — Gemini 2.5 Flash mı, Claude Sonnet 4.5 mi? İlk 1 saatte 5 örnek görselle test edilip karar verilecek.
2. **TTS kalitesi** — Expo Speech native sesi Türkçe için mekanik olabilir. POST-MVP'de ElevenLabs değerlendirilmeli.
3. **VLM latency** — 5-8 saniye gecikme Buddy Mode UX'ini etkiler. Frame frekansı ayarlanmalı.
4. **STT sağlayıcı kararı** — Expo Speech Recognition (native) vs OpenAI Whisper API. Adapter pattern ile ikisi de pluggable. Hackathon ilk 2 saatinde Türkçe 10 örnek cümleyle test edilip seçilecek. Mimari API-tabanlı düşünülür (Whisper varsayımı), böylece native'e geçiş downgrade olur.
5. **KVKK çevre gizliliği** — Kamera açıkken çekilen görseller hakkında yasal pozisyon netleştirilmeli (hackathon sonrası).
6. **Doğrulama eşik sayısı** — 3 doğrulama yeterli mi? Az kullanıcılı erken dönemde belki 2 olmalı. A/B test ile karar verilecek (POST-MVP).
7. **Spor aleti kapsamı** — Sadece park aletleri mi, kapalı spor salonu da mı? MVP'de açık alan.
8. **Firma onboarding** — KVKK + ticari sözleşme + faturalama (POST-MVP).

---

## 12. SÖZLÜK

- **VLM** — Vision Language Model (görüntü + dil modeli, örn. Gemini 2.5 Flash, Claude Sonnet 4.5, GPT-4o)
- **TTS** — Text-to-Speech (metinden sese)
- **STT** — Speech-to-Text (sesten metne)
- **Voice Q&A Layer / Sesli Soru-Cevap Katmanı** — Uygulamanın her ekranında erişilebilir, kullanıcının tek tap ile sesli soru sorup sesli cevap aldığı app-wide katman. STT → VLM (frame+context dahil) → TTS akışını sarar.
- **STT Adapter** — Farklı STT sağlayıcıları (Expo native, Whisper API) arasında plug-and-play geçiş sağlayan soyutlama
- **Screen Context** — Kullanıcının uygulamada bulunduğu ekran/durum (buddy_mode, sport_mode, map, vb.) — Voice Q&A için VLM'e gönderilir
- **Pattern D** — Voice Q&A VLM çağrı paterni (STT text + frame + context → answer_speak_text)
- **Ticket** — Tespit edilen problem kaydı
- **Doğrulanmış ticket** — 3+ farklı kullanıcıdan onay almış ticket
- **Buddy Mode** — Görme engelli kullanıcı için canlı yürüyüş rehberlik modu
- **Mikro-içerik** — "Gözünü eğit" başlığı altındaki kısa eğitici metinler
- **Seed data** — Mapillary/OSM/İBB'den hackathon başında toplanan ön ticket verisi

---

**Son güncelleme:** Hackathon başlangıcı için hazırlandı.
**Bu doküman AI asistanlara context olarak verilmek üzere yazılmıştır. Kararlar değiştikçe güncellenmelidir.**