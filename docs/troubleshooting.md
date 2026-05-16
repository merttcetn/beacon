# Troubleshooting

## `/health` `gemini_key_loaded: "no"` Dönüyor

Neden:

- `.env` yok.
- `GEMINI_API_KEY` boş.
- Servis farklı working directory'den başlatıldı ve `.env` okunmadı.

Çözüm:

```bash
cd /Users/tng/Code/odtu-hackathon/ai
cp .env.example .env
```

`.env` içine key ekle ve servisi bu dizinden başlat.

## VLM Endpoint'leri Boş Fallback Dönüyor

Belirti:

- `/buddy/analyze` `speak_text=""`, `priority="low"` döner.
- Feedback/Spor boş model döner.

Olası nedenler:

- Gemini key yanlış veya kota/rate limit var.
- Seçili model ID geçersiz.
- `PATTERN_*_LLM_PROVIDER` Gemini dışında bir değer.
- Timeout çok düşük.
- Görsel mime/type veya dosya bozuk.

Kontrol:

```env
PATTERN_A_LLM_PROVIDER=gemini
PATTERN_A_LLM_MODEL=gemini-3.1-flash-lite
GEMINI_TIMEOUT_SECONDS=60
```

Loglarda `Gemini çağrısı başarısız` mesajlarını incele.

## `TTS_PROVIDER=falai` İle `/tts` 503 Dönüyor

Olası nedenler:

- `FAL_KEY` boş veya yanlış.
- `FALAI_TTS_MODEL` geçersiz.
- fal.ai response şeması beklenen URL alanını döndürmedi.
- Timeout/rate limit.

Kontrol:

```env
TTS_PROVIDER=falai
FAL_KEY=...
FALAI_TTS_MODEL=fal-ai/minimax/speech-02-hd
FALAI_TTS_AUDIO_FORMAT=mp3
FALAI_TTS_TIMEOUT_SECONDS=30
```

Geçici fallback:

```env
TTS_PROVIDER=gemini
GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
GEMINI_TTS_VOICE_NAME=Sulafat
```

## `/stt` Boş Transcript Dönüyor

Olası nedenler:

- `FAL_KEY` eksik.
- Audio format provider tarafından desteklenmiyor.
- Browser çok kısa/sessiz kayıt gönderdi.
- `FALAI_STT_LANGUAGE` yanlış ayarlandı.

Kontrol:

```env
FALAI_STT_MODEL=fal-ai/elevenlabs/speech-to-text/scribe-v2
FALAI_STT_LANGUAGE=tur
FALAI_STT_TIMEOUT_SECONDS=45
```

Alternatif olarak `FALAI_STT_LANGUAGE` boş bırakılıp auto-detect denenebilir.

## `/buddy/analyze-video` Çalışmıyor

Olası nedenler:

- `ffmpeg` kurulu değil.
- Video codec'i ffmpeg tarafından okunamıyor.
- Video çok büyük; timeout veya bellek baskısı var.

Kontrol:

```bash
ffmpeg -version
```

Kısıtları düşür:

```env
VIDEO_MAX_FRAMES=8
VIDEO_CONCURRENCY=2
GEMINI_FRAME_INTERVAL_SECONDS=5
```

## Test Konsolu Mikrofonu Açmıyor

Nedenler:

- Browser mikrofon izni vermedi.
- Sayfa güvenli context dışında çalışıyor.
- Tarayıcı `MediaRecorder` formatını desteklemiyor.

Çözüm:

- Lokal `http://localhost:8000/test` kullan.
- Browser izinlerini sıfırla.
- Safari yerine Chrome deneyin.

## Demo Script Ses Dosyası Üretemiyor

Neden:

- `scripts/demo_buddy.py` WAV concat bekler.
- fal.ai default config MP3 döndürebilir.

Çözüm:

```env
TTS_PROVIDER=gemini
```

veya provider WAV döndürüyorsa:

```env
TTS_PROVIDER=falai
FALAI_TTS_AUDIO_FORMAT=wav
```

## `uv run` Cache Hatası

Belirti:

```text
Failed to initialize cache at ~/.cache/uv
```

Bu genelde sandbox/izin problemidir. Lokal terminalde normal kullanıcıyla tekrar çalıştır.

```bash
uv run pytest
uv run ruff check .
```
