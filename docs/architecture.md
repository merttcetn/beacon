# Mimari

## Amaç

`ai` servisi, mobil uygulamanın AI pipeline katmanıdır. Uygulama kamera/mikrofon verisini
toplar; servis VLM/STT/TTS sağlayıcılarıyla konuşur ve frontend'in kullanacağı yapılandırılmış
JSON veya ses çıktısı üretir.

## Yüksek Seviye Akış

```text
Expo app / test console
  |
  | multipart/form-data
  v
FastAPI (`ai_pipeline.main`)
  |
  |-- Pattern A/B/C/D orchestration
  |-- known_issues geo enrichment
  |-- server-side STT/TTS helpers
  v
Provider clients
  |-- Gemini structured VLM
  |-- Gemini TTS fallback/alternative
  |-- fal.ai TTS
  |-- fal.ai STT
```

## Modüller

| Modül | Sorumluluk |
|---|---|
| `config.py` | `.env` ayarları; model/provider/timeout/interval seçimleri |
| `main.py` | FastAPI app, endpoint'ler, endpoint orchestration |
| `gemini.py` | Gemini structured VLM ve Gemini TTS çağrıları |
| `tts.py` | TTS provider dispatch: fal.ai veya Gemini |
| `stt.py` | fal.ai tabanlı server-side speech-to-text |
| `schemas.py` | Pattern A/B/C/D Pydantic response modelleri |
| `prompts.py` | VLM system/user prompt builder'ları |
| `geo.py` | Statik known issue seed yükleme ve Haversine filtre |
| `frames.py` | ffmpeg ile video -> frame extraction |
| `static/test.html` | Browser tabanlı manuel test konsolu |
| `scripts/demo_buddy.py` | App olmadan video -> Buddy -> TTS demo script'i |

## Pattern Akışları

### Pattern A: Buddy Mode

Endpoint'ler:

- `POST /buddy/analyze`
- `POST /buddy/analyze-video`

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

- `POST /voice/ask`

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
  -> /stt path (`stt.transcribe`)
  -> transcript
  -> Pattern D
```

Fallback:

- STT boşsa: `"Anlayamadım, tekrar söyler misin?"`
- VLM başarısızsa: `"Bağlantı sorunu var, biraz sonra tekrar dener misin?"`

### Pattern B: Feedback

Endpoint:

- `POST /feedback/categorize`

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

- `POST /sport/describe`

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

Başarısızlıkta `/tts` `503` döner ve metni response içinde korur; app kendi TTS fallback'ini
kullanabilir.

### STT

`stt.py`, fal.ai endpoint'ine audio data URI gönderir ve response içinden transcript'i toleranslı
şekilde bulur. Bu yol hem `/stt` endpoint'inde hem `/voice/ask` içinde transcript yoksa fallback
olarak kullanılır.

## Veri Saklama ve Gizlilik

- API key'ler `.env` içindedir; commit edilmez.
- Servis upload edilen görsel/ses dosyalarını kalıcı olarak saklamaz.
- `/buddy/analyze-video` geçici dosyaları `tempfile.TemporaryDirectory()` altında oluşturur ve işlem
sonunda silinir.
- `output/` ve `runtime/` `.gitignore` kapsamındadır.

## Hata Yönetimi İlkeleri

- VLM tarafında timeout, API hatası veya JSON parse hatası servis çökmesine neden olmamalıdır.
- Kullanıcıya giden response Pydantic modeline uygun kalır.
- Kritik güvenlik akışlarında boş/güvenli fallback tercih edilir.
- STT/TTS hatasında kullanıcıya metin fallback yolu açık bırakılır.
