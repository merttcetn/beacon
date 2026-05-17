# Mimari

## Amaç

`ai` servisi, mobil uygulamanın AI pipeline katmanıdır. Uygulama kamera/mikrofon verisini
toplar; servis VLM/STT/TTS sağlayıcılarıyla konuşur ve frontend'in kullanacağı yapılandırılmış
JSON veya ses çıktısı üretir.

## Yüksek Seviye Akış

```text
Expo app / test simülatörü
  |
  | multipart/form-data
  v
FastAPI (`ai_pipeline.main`)
  |
  |-- POST /v1/assist  (orchestrator — tek giriş noktası)
  |     |-- event=buddy_frame -> doğrudan Pattern A
  |     |-- event=voice       -> orchestrator LLM niyet sınıflandırma
  |     |                        -> Pattern A/B/C/D'ye dispatch
  |     v
  |-- patterns.py  (Pattern A/B/C/D çağrılabilir fonksiyonları)
  |-- known_issues geo enrichment
  |-- server-side STT/TTS helpers
  v
Provider clients
  |-- Gemini structured VLM
  |-- Gemini TTS fallback/alternative
  |-- fal.ai TTS
  |-- fal.ai STT
```

`POST /v1/assist`, UI'nin AI ile tek giriş noktasıdır: sesli niyeti sınıflandırır ve uygun
pattern'a dispatch eder. Tek tek pattern endpoint'leri (`/v1/buddy` vb.) izole test için durur.

## Modüller

| Modül | Sorumluluk |
|---|---|
| `config.py` | `.env` ayarları; model/provider/timeout/interval seçimleri |
| `main.py` | FastAPI app, endpoint'ler; pattern ve orchestrator katmanına yönlendirir |
| `patterns.py` | Pattern A/B/C/D çağrılabilir fonksiyonları (`analyze_buddy_frame`, `describe_sport`, `categorize_feedback`, `answer_voice`) + `model_for` — endpoint ve orchestrator için DRY ortak katman |
| `orchestrator.py` | `/v1/assist` — niyet sınıflandırma (`decide()`) + dispatch (`handle_assist()`) |
| `gemini.py` | Gemini structured VLM ve Gemini TTS çağrıları |
| `tts.py` | TTS provider dispatch: fal.ai veya Gemini |
| `stt.py` | fal.ai tabanlı server-side speech-to-text |
| `schemas.py` | Pattern A/B/C/D Pydantic response modelleri |
| `prompts.py` | VLM system/user prompt builder'ları |
| `geo.py` | Statik known issue seed yükleme ve Haversine filtre |
| `frames.py` | ffmpeg ile video -> frame extraction |
| `static/test.html` | Browser tabanlı `/v1/assist` simülatörü ve izole endpoint testleri |
| `scripts/demo_buddy.py` | App olmadan video -> Buddy -> TTS demo script'i |

## Orchestrator

`POST /v1/assist`, UI'nin tüm AI akışları için kullandığı tek giriş noktasıdır. Servis
stateless'tır — UI her isteğe kullanıcının çevresindeki kayıtlı ticket'ları (`nearby_tickets`)
ekler.

İki event:

- `buddy_frame` — proaktif sessiz kare. Deterministik: niyet sınıflandırma yapılmadan
  doğrudan Pattern A'ya gider, LLM ile sınıflandırma maliyeti yoktur.
- `voice` — kullanıcı konuştu. Bir orchestrator LLM çağrısı sıkı bir prompt ile
  `temperature=0`'da niyeti sınıflandırır ve Pattern A/B/C/D'ye dispatch eder.

Niyetler: `ask`, `describe_sport`, `report_issue`, `nearby_tickets`, `switch_mode`,
`stop`, `unknown`.

Sesli ticket akışı: kullanıcı "şunu bildir" derse → Pattern B → tek yanıtta bir `ticket`
payload (+ çevre özeti) döner; UI bunu n8n'e iletir.

Yanıt zarfı `AssistResponse`:

- `event` — istekteki event echo'su
- `intent` — sınıflandırılan niyet
- `speak_text` — TTS ile okunacak Türkçe metin
- `priority` — `low`/`medium`/`high`/`critical`
- `ui_action` — `none`/`open_ticket`/`switch_to_buddy`/`switch_to_sport`
- `ticket?` — `open_ticket` durumunda n8n'e iletilecek ticket payload'u
- `data?` — ilgili pattern'ın ham çıktısı

`orchestrator.py` iki fonksiyon sunar: `decide()` niyet sınıflandırıcı, `handle_assist()`
dispatcher. İkisi de — endpoint'ler gibi — `patterns.py` fonksiyonlarını çağırır (DRY).

## Pattern Akışları

### Pattern A: Buddy Mode

Endpoint'ler:

- `POST /v1/buddy`
- `POST /dev/buddy-video`

Akış:

```text
frame/video
  -> optional GPS
  -> nearby_issues(lat, lon)
  -> buddy prompt
  -> Gemini structured output
  -> BuddyAnalysis JSON
```

Fallback:

- VLM timeout/API/parse hatasında `BuddyAnalysis()` döner.
- Bu güvenli fallback `speak_text=""`, `priority="low"` davranışına karşılık gelir.

### Pattern D: Voice Q&A

Endpoint:

- `POST /v1/voice`

Akış:

```text
transcript
  -> optional frame/GPS/screen_context
  -> voice prompt
  -> Gemini structured output
  -> VoiceAnswer JSON
```

Transcript yoksa:

```text
audio
  -> /v1/speech/transcribe path (`stt.transcribe`)
  -> transcript
  -> Pattern D
```

Fallback:

- STT boşsa: `"Anlayamadım, tekrar söyler misin?"`
- VLM başarısızsa: `"Bağlantı sorunu var, biraz sonra tekrar dener misin?"`

### Pattern B: Feedback

Endpoint:

- `POST /v1/feedback`

Akış:

```text
1-3 photos
  -> feedback prompt
  -> Gemini structured output
  -> FeedbackResult JSON
```

Fallback:

- VLM başarısızsa boş/güvenli `FeedbackResult()` döner.

### Pattern C: Spor

Endpoint:

- `POST /v1/sport`

Akış:

```text
photo
  -> sport prompt
  -> Gemini structured output
  -> SportDescription JSON
```

Fallback:

- VLM başarısızsa boş/güvenli `SportDescription()` döner.

## Provider Yapısı

### VLM

Çalışan structured VLM adapter şu an Gemini'dir.

Feature bazlı config alanları:

- `PATTERN_A_LLM_PROVIDER`, `PATTERN_A_LLM_MODEL`
- `PATTERN_B_LLM_PROVIDER`, `PATTERN_B_LLM_MODEL`
- `PATTERN_C_LLM_PROVIDER`, `PATTERN_C_LLM_MODEL`
- `PATTERN_D_LLM_PROVIDER`, `PATTERN_D_LLM_MODEL`

Provider alanına Gemini dışı değer verilirse endpoint güvenli fallback'e düşer. OpenAI/Claude gibi
provider'lar için ayrıca adapter implementasyonu gerekir.

### TTS

`tts.py`, `TTS_PROVIDER` değerine göre dispatch eder:

- `falai`, `fal`, `fal.ai` -> fal.ai TTS
- `gemini`, `google` -> Gemini TTS

Başarısızlıkta `/v1/speech/synthesize` `503` döner ve metni response içinde korur; app kendi
TTS fallback'ini kullanabilir.

### STT

`stt.py`, fal.ai endpoint'ine audio data URI gönderir ve response içinden transcript'i toleranslı
şekilde bulur. Bu yol hem `/v1/speech/transcribe` endpoint'inde hem `/v1/voice` içinde transcript
yoksa fallback olarak kullanılır.

## Veri Saklama ve Gizlilik

- API key'ler `.env` içindedir; commit edilmez.
- Servis upload edilen görsel/ses dosyalarını kalıcı olarak saklamaz.
- `/dev/buddy-video` geçici dosyaları `tempfile.TemporaryDirectory()` altında oluşturur ve işlem
sonunda silinir.
- `output/` ve `runtime/` `.gitignore` kapsamındadır.

## Hata Yönetimi İlkeleri

- VLM tarafında timeout, API hatası veya JSON parse hatası servis çökmesine neden olmamalıdır.
- Kullanıcıya giden response Pydantic modeline uygun kalır.
- Kritik güvenlik akışlarında boş/güvenli fallback tercih edilir.
- STT/TTS hatasında kullanıcıya metin fallback yolu açık bırakılır.
