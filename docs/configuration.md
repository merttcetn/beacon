# Konfigürasyon

Servis tüm ayarları `.env` üzerinden okur. `.env` dosyası commit edilmez. Başlangıç için:

```bash
cp .env.example .env
```

## Minimum Gerekli Ayarlar

```env
GEMINI_API_KEY=...
TTS_PROVIDER=falai
FAL_KEY=...
```

`GEMINI_API_KEY` VLM için gereklidir. `FAL_KEY`, `TTS_PROVIDER=falai` veya server-side STT
kullanılacaksa gereklidir.

## LLM / VLM Ayarları

Çalışan VLM provider şu an Gemini'dir. Provider alanları ileride OpenAI/Claude gibi adapter'lar
eklenebilmesi için feature bazında tutulur.

| Env | Varsayılan | Kullanım |
|---|---|---|
| `LLM_DEFAULT_PROVIDER` | `gemini` | Tanımsız feature fallback provider'ı |
| `PATTERN_A_LLM_PROVIDER` | `gemini` | Buddy Mode provider'ı |
| `PATTERN_A_LLM_MODEL` | `gemini-3.1-pro-preview` | Buddy Mode modeli |
| `PATTERN_B_LLM_PROVIDER` | `gemini` | Feedback provider'ı |
| `PATTERN_B_LLM_MODEL` | `gemini-3.1-pro-preview` | Feedback modeli |
| `PATTERN_C_LLM_PROVIDER` | `gemini` | Spor provider'ı |
| `PATTERN_C_LLM_MODEL` | `gemini-3.1-pro-preview` | Spor modeli |
| `PATTERN_D_LLM_PROVIDER` | `gemini` | Voice Q&A provider'ı |
| `PATTERN_D_LLM_MODEL` | `gemini-3.1-pro-preview` | Voice Q&A modeli |
| `SEED_DATA_LLM_PROVIDER` | `gemini` | Seed/batch görsel analizi provider'ı |
| `SEED_DATA_LLM_MODEL` | `gemini-3.1-flash-lite` | Seed/batch modeli |

Notlar:

- `PATTERN_*_LLM_PROVIDER` için bugün güvenli değer `gemini` veya `google`.
- Gemini dışı provider seçilirse endpoint fallback'e düşer; adapter implementasyonu yoktur.
- Eski `GEMINI_PATTERN_*_MODEL` alanları kodda durur, ancak yeni config standardı
  `PATTERN_*_LLM_MODEL` alanlarıdır.

## Gemini Genel Ayarları

| Env | Varsayılan | Açıklama |
|---|---:|---|
| `GEMINI_API_KEY` | boş | Gemini API key |
| `GEMINI_STRUCTURED_OUTPUT` | `true` | Structured output niyeti; client şu an `response_schema` kullanır |
| `GEMINI_TIMEOUT_SECONDS` | `60` | VLM timeout |
| `GEMINI_MAX_RETRIES` | `2` | Gemini, fal.ai TTS/STT retry sayısı için de kullanılıyor |
| `GEMINI_FRAME_INTERVAL_SECONDS` | `5` | Video/frame extraction aralığı |

Hackathon latency için daha hızlı ayar örneği:

```env
PATTERN_A_LLM_MODEL=gemini-3.1-flash-lite
PATTERN_D_LLM_MODEL=gemini-3-flash-preview
GEMINI_TIMEOUT_SECONDS=30
```

Kalite öncelikli demo için:

```env
PATTERN_A_LLM_MODEL=gemini-3.1-pro-preview
PATTERN_B_LLM_MODEL=gemini-3.1-pro-preview
PATTERN_C_LLM_MODEL=gemini-3.1-pro-preview
PATTERN_D_LLM_MODEL=gemini-3.1-pro-preview
GEMINI_TIMEOUT_SECONDS=60
```

## TTS Ayarları

Provider seçimi:

```env
TTS_PROVIDER=falai
```

Geçerli değerler:

- `falai`, `fal`, `fal.ai`
- `gemini`, `google`

### fal.ai TTS

| Env | Varsayılan | Açıklama |
|---|---|---|
| `FAL_KEY` | boş | Önerilen fal.ai API key adı |
| `FAL_API_KEY` | boş | Alternatif key adı |
| `FALAI_API_KEY` | boş | Alternatif key adı |
| `FALAI` | boş | Mevcut ortamda kullanılan alternatif key adı |
| `FALAI_TTS_MODEL` | `fal-ai/minimax/speech-02-hd` | TTS model endpoint'i |
| `FALAI_TTS_VOICE_ID` | `Wise_Woman` | Ses ID |
| `FALAI_TTS_LANGUAGE_BOOST` | `Turkish` | Türkçe yönlendirme |
| `FALAI_TTS_OUTPUT_FORMAT` | `url` | fal response output modu |
| `FALAI_TTS_AUDIO_FORMAT` | `mp3` | `mp3`, `wav`, `flac`, `pcm` |
| `FALAI_TTS_SAMPLE_RATE_HZ` | `32000` | Audio sample rate |
| `FALAI_TTS_BITRATE` | `128000` | Bitrate |
| `FALAI_TTS_CHANNEL` | `1` | Mono |
| `FALAI_TTS_SPEED` | `1.0` | Konuşma hızı |
| `FALAI_TTS_VOLUME` | `1.0` | Ses seviyesi |
| `FALAI_TTS_PITCH` | `0` | Pitch |
| `FALAI_TTS_EMOTION` | `neutral` | Duygu |
| `FALAI_TTS_TIMEOUT_SECONDS` | `30` | TTS timeout |

### Gemini TTS

```env
TTS_PROVIDER=gemini
GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
GEMINI_TTS_VOICE_NAME=Sulafat
GEMINI_TTS_TIMEOUT_SECONDS=20
GEMINI_TTS_SAMPLE_RATE_HZ=24000
```

Gemini TTS kodu PCM çıktısını WAV içine sarar ve `/tts` response'unu `audio/wav` döndürür.

## STT Ayarları

Server-side STT fal.ai üzerinden yapılır.

| Env | Varsayılan | Açıklama |
|---|---|---|
| `FALAI_STT_MODEL` | `fal-ai/elevenlabs/speech-to-text/scribe-v2` | STT endpoint'i |
| `FALAI_STT_LANGUAGE` | `tur` | Türkçe ISO 639-3 kodu; boşsa auto detect |
| `FALAI_STT_TIMEOUT_SECONDS` | `45` | STT timeout |

Önerilen mimari:

- Mobil app mümkünse kendi STT'sini yapıp `/voice/ask` içine `transcript` göndersin.
- Server-side STT demo/fallback için kullanılsın.

## Geo ve Video Ayarları

| Env | Varsayılan | Açıklama |
|---|---:|---|
| `KNOWN_ISSUES_RADIUS_M` | `150.0` | Seed problem arama yarıçapı |
| `VIDEO_MAX_FRAMES` | `20` | `/buddy/analyze-video` maksimum kare sayısı |
| `VIDEO_CONCURRENCY` | `4` | Video kareleri için paralel VLM çağrı limiti |

## Servis Ayarları

| Env | Varsayılan | Açıklama |
|---|---|---|
| `SERVICE_HOST` | `0.0.0.0` | Uvicorn host |
| `SERVICE_PORT` | `8000` | Uvicorn port |
| `LOG_LEVEL` | `INFO` | Logging seviyesi |

## Güvenlik

- `.env` commit edilmez.
- API key'leri response, log veya dokümana yazma.
- `api-key.md` gibi düz metin key kaynakları repo içine alınmamalı.
- Upload edilen ses/görsel geçici işlenir; kalıcı storage yoktur.
