# AGENTS.md — AI Servisi (`ai` repo)

> `ai` repo'sunun **tek kaynak (single source of truth)** agent context'i. Codex, Claude Code, Cursor — repoda çalışan her agent bunu okur. `CLAUDE.md` bu dosyayı `@AGENTS.md` ile import eder; içeriği tekrar etmez (DRY).
>
> - **Ürün:** `[ÜRÜN_ADI]` — adı henüz belirlenmedi (spec'te de placeholder).
> - **Repo:** https://github.com/odtu-hackathon-project/ai
> - **Ürün spec'i (asıl tek kaynak):** `product-spec.md` — tüm implementation kararları buna referansla alınır. Spec şu an repo'nun bir üst dizininde; `ai/docs/product-spec.md` olarak repoya alınması önerilir.
> - **Bağlam:** ODTÜ hackathon, 24 saatlik MVP.

## 1. Bu Repo Ne?

`ai` repo'su, `[ÜRÜN_ADI]` ürününün **AI pipeline servisi**dir — Python + FastAPI.

**Ürün (bağlam):** Görme engelli bireylerin dış mekan yürüyüşlerini güvenli kılan bir AI buddy uygulaması. Telefon kamerası görüntüsünü VLM ile işler, kulaklıktan Türkçe sesli rehberlik (TTS) verir. Üç paydaş: görme engelli kullanıcı (sesli rehber), gönüllü vatandaş (kaldırım/yol problemi bildirimi), inşaat firması (problem verisi marketplace'i).

**Bu servisin işi — ürünün "AI tarafı":** Görüntü ve ses girdilerini VLM / TTS / STT modellerinden geçirip Türkçe sesli rehberlik üretmek.

```
Yön 1 — proaktif (Buddy Mode, Pattern A):
  frame ──▶ VLM ──▶ JSON.speak_text ──▶ TTS ──▶ ses ──▶ (app çalar)

Yön 2 — reaktif (Voice Q&A, Pattern D):
  ses (soru) ──▶ STT ──▶ transcript + frame + GPS + screen_context
            ──▶ VLM ──▶ JSON.answer_speak_text ──▶ TTS ──▶ ses
```

## 2. Repo Sınırı (Scope)

**Bu repoda (`ai`) yapılır:**
- Frame extraction — video / kamera akışından kare üretimi (ffmpeg / OpenCV)
- VLM client + 4 çağrı paterni (A/B/C/D) + structured JSON parse & Pydantic validation
- `speak_text` üretimi — VLM çıktısının TTS'e uygun, doğal Türkçe konuşma diline getirilmesi
- TTS — metin → ses (API tabanlı)
- STT — ses → transcript (Whisper API; Voice Q&A / Pattern D için)
- FastAPI servis katmanı (endpoint'ler, request/response şemaları)
- VLM / STT / TTS sağlayıcıları için **adapter pattern**

**Bu repoda DEĞİL (yalnızca context — ayrı repo/ekip):**
- Expo mobil uygulama — kamera UI, ekranlar, TTS playback, tap/interrupt gesture
- Supabase — Postgres + PostGIS + Storage + Auth
- n8n workflow'ları — seed data, doğrulama döngüsü, mail
- Firma dashboard, harita, timeline
- DB yazımı: bu servis Supabase'e doğrudan yazmaz; orchestration app/n8n tarafında (aksi netleşene dek — bkz. §10).

## 3. Mimari

```
┌──────────────────┐     HTTP      ┌──────────────────────────────────┐
│  Expo Mobil App  │ ────────────▶ │       ai SERVİSİ (bu repo)        │
│  kamera · mic ·  │ ◀──────────── │  FastAPI                          │
│  TTS playback    │  JSON + ses   │   frames → VLM → speak_text → TTS │
└──────────────────┘               │   ses → STT → VLM (Pattern D)     │
                                    └─────────────┬─────────────────────┘
                                                  │ API
                                   ┌──────────────▼───────────────┐
                                   │   VLM · TTS · STT API'leri    │
                                   │   (sağlayıcı: adapter / TBD)  │
                                   └───────────────────────────────┘
```

**Spec'ten kabul edilen sapma:** Spec §5.2 diyagramı VLM çağrısını app'ten, STT/TTS'i app içi native (`expo-speech-recognition`, Expo Speech) yapar. Python servis kararıyla VLM/STT/TTS çağrıları **`ai` servisinden** yapılır → STT = server-side Whisper API, TTS = server-side API TTS. Bu sapma spec'in kendi yönelimiyle tutarlı: §4.2 STT'yi "API-tabanlı düşün" diyor, §11 Expo Speech Türkçe kalite riskini işaretliyor.

## 4. VLM Çağrı Paternleri

Dört patern var. Prompt şemalarının **tam tanımı `product-spec.md §6`'da** (tek kaynak) — kod prompt template'lerini oradan türetir, kopyalamaz; spec değişince güncellenir.

| Patern | Mod | Girdi | Çıktı (JSON ana alanlar) | Tetik | Öncelik |
|---|---|---|---|---|---|
| **A** | Buddy Mode | frame + GPS + yakın ticket'lar | `immediate_warnings`, `upcoming_known_issues`, `speak_text`, `priority` | her ~5 sn | hız > detay |
| **B** | Feedback | 1-3 fotoğraf | `has_damage`, `issues[]`, `overall_accessibility_score` | kullanıcı | doğru kategori > hız |
| **C** | Spor Modu | 1 fotoğraf | `equipment_*`, `usage_steps_tr`, `safety_warnings_tr`, `speak_text` | kullanıcı | detaylı anlatım > hız |
| **D** | Voice Q&A | STT transcript + `screen_context` + frame? + GPS | `interpreted_question`, `answer_speak_text`, `requires_camera`, `requires_action` | kullanıcı (tek tap) | bağlam farkındalığı + doğal Türkçe |

**Orchestrator (spec genişletmesi):** UI ile AI arasında tek giriş noktası `POST /v1/assist`.
İki event: `buddy_frame` (deterministik → Pattern A) ve `voice` (orchestrator LLM ile niyet
sınıflandırma → Pattern A/B/C/D'ye dispatch). Sesli ticket akışı: kullanıcı "şunu bildir"
derse Pattern B → `ticket` payload + çevre özeti tek yanıtta döner; UI bunu n8n'e iletir.
Servis stateless — UI her isteğe `nearby_tickets` ekler. Detay: `docs/superpowers/plans/`.

**Kritik kurallar (spec §6, §9):**
- VLM çıktısı **her zaman** Pydantic ile validate edilir; parse hatası güvenli fallback'e düşer (boş/zararsız `speak_text`), exception yutulmaz.
- `priority` değerleri: `low` / `medium` / `high` / `critical`. `critical` yalnızca anlık fiziksel risk (çarpışma/düşme/araç) — abartma.
- **Yön emri YASAK** — "sağa dön" denmez, "sağında ... var" denir. Etik sınır; prompt'ta zorlanır.
- "Sessizlik değerli" — söylenecek kritik bir şey yoksa `speak_text` boş döner.

**TTS playback / kuyruk / interrupt app tarafındadır** (spec §4.2 concurrency tablosu). `ai` servisi `speak_text` + `priority` (+ ses) üretir; kuyruğu ve interrupt'ı app `priority`'ye göre yönetir. `priority: critical` app tarafında ezilemez.

## 5. Entegrasyon Kontratı

Tüm görsel/ses taşıyan endpoint'ler `multipart/form-data`. VLM endpoint'leri JSON döner;
`/v1/speech/synthesize` ses döner. Versiyonlu prefix: `/v1/`. Mod başına **tek** endpoint
(mod adıyla); ses yardımcıları `/v1/speech/` altında; `/health` ve dev araçları prefix'siz.

| Endpoint | Patern | Girdi | Çıktı |
|---|---|---|---|
| `POST /v1/assist` | A/B/C/D | `event`, `transcript`\|`audio`, `frame?`, `screen_context`, `lat?`, `lon?`, `recent_guidance?`, `nearby_tickets?` | `AssistResponse` JSON |
| `POST /v1/buddy` | A | `frame`, `lat?`, `lon?`, `recent_guidance?` | `BuddyAnalysis` JSON |
| `POST /v1/voice` | D | `transcript` **veya** `audio`, `screen_context`, `frame?`, `lat?`, `lon?` | `VoiceAnswer` JSON |
| `POST /v1/feedback` | B | `photos` (1-3) | `FeedbackResult` JSON |
| `POST /v1/sport` | C | `photo` | `SportDescription` JSON |
| `POST /v1/speech/transcribe` | — | `audio` | `{ transcript, ok }` |
| `POST /v1/speech/synthesize` | — | `text` | ses (`audio/*`) |
| `GET /health` | — | — | servis durumu |
| `POST /dev/buddy-video` | A | `video`, `lat?`, `lon?` | batch zaman çizelgesi — **yalnız dev/test**, OpenAPI'de gizli |

**Bağlam (`recent_guidance`) — Buddy realtime:** Servis stateless. Realtime akışta app, son
1-3 `speak_text`'i (en yenisi sonda, satırla ayrılmış) `recent_guidance` form alanında geri
yollar; model aynı uyarıyı tekrarlamaz, yalnızca yeni tehlike / belirgin değişim / yeni
faydalı bilgi olduğunda konuşur. Server-side session memory **yok** (bilinçli karar — app
orchestrate eder, servis saf fonksiyon kalır).

**Orchestrator (`/v1/assist`) — production tek endpoint:** UI tüm AI akışları için bunu
kullanır. `event=voice` → orchestrator LLM (sıkı prompt, `temperature=0`) niyeti
sınıflandırır; `event=buddy_frame` → doğrudan Pattern A. Yanıt zarfı `AssistResponse`:
`speak_text`, `priority`, `ui_action` (`none`/`open_ticket`/`switch_to_buddy`/`switch_to_sport`),
`ticket?`, `data?`. Tek tek pattern endpoint'leri (`/v1/buddy` vb.) test/izole kalite testi
için durur; ikisi de `patterns.py`'yi çağırır (DRY).

## 6. Adapter Pattern — VLM / STT / TTS

Üç model katmanı da sağlayıcı-bağımsız **adapter** arkasında. Sebep: spec sağlayıcıları "ilk 1-2 saatte test edip seç" diyor (§11) — kod tek bir sağlayıcıya bağlanmamalı.

- **VLMAdapter** — `GeminiVLMAdapter`, `ClaudeVLMAdapter` (seçim TBD). Girdi: görsel(ler) + prompt; çıktı: structured JSON.
- **STTAdapter** — `WhisperAPIAdapter` (server-side). Expo native STT client tarafında kalır, bu repo dışı.
- **TTSAdapter** — sağlayıcı TBD (ElevenLabs / OpenAI / Google). Girdi: metin; çıktı: ses.

Ortak kural: her adapter aynı interface'i implemente eder, çağıran kod somut sağlayıcıyı bilmez. Yeni sağlayıcı = yeni adapter sınıfı, çağıran kod değişmez.

## 7. Teknik Konvansiyonlar

**Python stack:**
- **uv** — paket & ortam yönetimi
- **FastAPI** + **Pydantic v2** — servis & şema; her request/response ve VLM I/O modellenir
- **async/await** default — VLM/TTS/STT çağrıları I/O-bound
- Type hints zorunlu (`from __future__ import annotations`)
- **ruff** — format + lint (`.py` Edit/Write sonrası otomatik çalışır)
- **pytest** — test
- Structured logging (loguru / structlog)
- Hata raise edilir, yutulmaz; `try/except` yalnızca bilinen hata sınıfı için. VLM JSON parse hatası bilinen sınıftır — güvenli fallback'e düşer.

**Test politikası:**
- Kritik yollar pytest ile test edilir: VLM JSON parse + Pydantic validation, adapter'lar, prompt builder'lar, frame extraction.
- VLM/TTS/STT API çağrıları testlerde **mock'lanır** (maliyet + flakiness).
- 24 saatlik hackathon temposunda blanket %80 coverage hedeflenmez; kritik-yol güvenilirliği önceliklidir. (Kullanıcının global kuralı %80 — bu repoda hackathon istisnası uygulanır; strict isteniyorsa kullanıcı belirtir.)

**Dil:**
- Kod yorumları: İngilizce
- Commit mesajları: İngilizce, conventional commits (`feat:` `fix:` `refactor:` `chore:` `docs:`)
- `docs/` içeriği: Türkçe
- Kullanıcıya giden çıktı (`speak_text`, `answer_speak_text`): **Türkçe**, doğal konuşma dili, doğru Türkçe karakterler (ç ş ğ ü ö ı İ)
- Commit/PR'lara AI-attribution satırı (`Co-Authored-By`, "Generated with ...") **eklenmez**

## 8. Güvenlik / Gizlilik (spec §9)

- **API key'ler** (VLM/TTS/STT) `.env`'de — `.env` ve secret'lar **asla** commit'lenmez
- **Görseller** VLM'e gönderilir ama **saklanmaz** (AI eğitimi için kullanılmaz)
- **Ses kaydı saklanmaz** — yalnızca STT transcript text'i
- Push'tan önce kullanıcı onayı alınır

## 9. AI Agent Davranış Kuralları (repoda çalışan her agent)

- **Türkçe konuş** — kullanıcıyla iletişim Türkçe, teknik terimler İngilizce kalabilir
- **Proaktif ol** — riski kullanıcı söylemeden önce işaretle; "bu mevcut akışı kırar mı?" diye sor
- **DRY** — mevcut dosyayı düzenle, "v2/improved/enhanced" kopya oluşturma. Tekrar eden kodu helper'a taşı. Config tek yerde. Aynı bilgiyi iki yere yazma, referans ver.
- **Kritik kararları kullanıcıya sor** — sessizce varsayma
- **Büyük mimari kararlarda önce araştırma yap** — sonra seçenek + öneri sun
- **İteratif düşün** — önceki kararları sorgula, hata kök nedenini Five Whys ile bul
- **`product-spec.md` tek kaynaktır** — implementation spec'e referansla alınır; spec değişince kod ve bu doküman güncellenir
- Kayda değer değişiklik sonrası bu dosyanın §12'sini ve gerekiyorsa `docs/`'u güncelle

## 10. Açık Konular (TBD)

- VLM sağlayıcı seçimi (Gemini 2.5 Flash / Claude) — spec §11, ilk saatte test
- TTS sağlayıcı seçimi (ElevenLabs / OpenAI / Google)
- Entegrasyon kontratının kesinleşmesi (§5) — frontend ekibiyle
- `ai` servisi Supabase'e yazacak mı, yoksa app/n8n mi orchestrate edecek?
- Hosting — servis nerede koşacak (VM / Cloud Run / hackathon demosu için tünel)

## 11. Codex'in Görevi — Claude Plan Review

Claude bir plan veya kod değişikliği ürettiğinde Codex'e review için gönderir. **Codex'in bu repodaki tek rolü review** — implementasyon yapmaz, kod yazmaz, planı kendisi düzeltmez. Görevi: planı objektif, kanıt-bazlı değerlendirmek.

**Review prensipleri:**

1. **Yalnızca review.** Codex "şunu şöyle yazdım" demez; "şu adım şu sebeple hatalı/eksik, şöyle olmalı" der. Düzeltmeyi Claude yapar.
2. **Her kararı tasdikiyle (justification) incele.** Plandaki her mimari/teknik karar için: *Gerekçe belirtilmiş mi? Gerekçe sağlam mı? Alternatif değerlendirilmiş mi?* Gerekçesiz karar başlı başına bir bulgudur.
3. **Proaktif ve derinlemesine.** Yüzeysel okuma yok — spec, mevcut kod, testler, config dahil "ilgili tüm dosyalar" gerçekten incelenir.
4. **Çepeçevre düşün.** Sadece istenen kısmı değil etkilediği her şeyi kontrol et: yeni adapter mevcut pattern'a uyuyor mu? Yeni helper zaten var mı (DRY)? Schema/endpoint değişikliği consumer'ı kırar mı?
5. **İteratif.** İlk bulgudan sonra "bu fix başka neyi etkiler?" diye sor.
6. **Kanıtla.** Her bulgu: dosya yolu + satır / `product-spec.md §` + ilgili alıntı + neden-zinciri. Kanıtsız bulgu yazma.
7. **Objektif ve profesyonel.** Övgü, cesaretlendirme, "plan iyi görünüyor" gibi içi boş yorum yok. Gerçek defect odaklı.
8. **Net verdict:** **APPROVED** veya **NEEDS_REVISION**. Her CRITICAL/HIGH bulgu için: konum + sorun + kanıt + önerilen somut düzeltme.

**Neye bakılır (yalnızca bunlar):**
- **Correctness** — plan gerçekten çalışır mı?
- **Spec uyumu** — `product-spec.md`'ye aykırı mı? (özellikle §4.2 concurrency/priority, §6 prompt şemaları, §9 etik sınırlar — yön emri yasağı)
- **Proje kuralı ihlali** — bu dosyadaki konvansiyonlar
- **Completeness** — eksik adım var mı?
- **Risk** — handle edilmemiş edge case (VLM timeout, boş/düşük-confidence STT, JSON parse hatası, frame yok)?
- **Güvenlik** — API key sızıntısı, `.env`, görsel/ses saklama ihlali?
- **Simplicity / DRY** — over-engineered mi? Tekrar eden kod mu?

**Kapsam dışı (Codex bunları YAZMAZ):** stil/naming/formatting yorumu (ruff halleder), "nice to have" önerisi, scope creep, planı özetleme, övme.

**Her bulgu için self-check:** Spesifik kanıt var mı? Bir principal engineer bunu flag eder mi? Task kapsamında mı, scope creep mi? — "Evet" değilse bulguyu sil.

## 12. Versiyon

- **v1 — 16.05.2026** — İlk sürüm. `ai` repo'su Python + FastAPI AI pipeline servisi olarak konumlandı. Scope, mimari, 4 VLM paterni, adapter pattern, konvansiyonlar ve "Codex'in Görevi — Claude Plan Review" bölümü tanımlandı. `CLAUDE.md` bu dosyayı import eder.
- **v1.1 — 17.05.2026** — Endpoint'ler `/v1/<mod>` şemasına geçti (mod başına tek endpoint, ses yardımcıları `/v1/speech/` altında, batch video `/dev/buddy-video` dev-only). Buddy realtime'a stateless **`recent_guidance`** bağlamı eklendi — app son `speak_text`'leri geri yollar, model tekrarı önler. §5 kontrat tablosu güncellendi.
- **v1.2 — 17.05.2026** — Orchestrator katmanı: tek endpoint `POST /v1/assist` (2 event), sesli niyet sınıflandırma + dispatch. Pattern mantığı `patterns.py`'ye çıkarıldı (DRY); `orchestrator.py` eklendi. `issue` (VLM-içi) / `ticket` (boundary) ayrımı. `generate_structured`'a `temperature`.
