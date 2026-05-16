# Geliştirme ve Çalıştırma

## Gereksinimler

- Python `>=3.13`
- `uv`
- `ffmpeg` (`/buddy/analyze-video` ve `scripts/demo_buddy.py` için)
- Gemini API key
- fal.ai API key (server-side TTS/STT için)

## Kurulum

```bash
cd /Users/tng/Code/odtu-hackathon/ai
uv sync
cp .env.example .env
```

`.env` içine key'leri ekle:

```env
GEMINI_API_KEY=...
FAL_KEY=...
TTS_PROVIDER=falai
```

## Lokal Servis

```bash
uv run uvicorn ai_pipeline.main:app --reload --host 0.0.0.0 --port 8000
```

Kontrol:

```bash
curl http://localhost:8000/health
```

OpenAPI UI:

```text
http://localhost:8000/docs
```

Manuel test konsolu:

```text
http://localhost:8000/test
```

## Test Konsolu

`/test` sayfası hackathon demosu ve hızlı debug için tasarlanmıştır.

Desteklediği akışlar:

- tek görsel ile `/buddy/analyze`
- video oynatırken tarayıcıda frame yakalayıp `/buddy/analyze`
- text veya mikrofon kaydıyla `/voice/ask` ve `/stt`
- `/feedback/categorize`
- `/sport/describe`
- `/tts`

Notlar:

- Mikrofon kaydı browser `MediaRecorder` API'sini kullanır.
- Video simülasyonunda frame tarayıcıda `1024px` genişliğe ölçeklenir.
- Test konsolu production UI değildir; entegrasyon ve demo aracıdır.

## Testler

```bash
uv run pytest
```

Mevcut test kapsamı:

- `/health` smoke testi
- Haversine mesafe hesabı
- known issues seed yükleme
- nearby issue sıralama/filtre

## Lint

```bash
uv run ruff check .
```

## Standalone Buddy Demo

App veya frontend gecikirse video -> Buddy -> TTS omurgasını script ile göstermek için:

```bash
uv run python scripts/demo_buddy.py path/to/video.mp4 output/buddy_demo.wav
```

Bu script:

1. ffmpeg ile videodan her `GEMINI_FRAME_INTERVAL_SECONDS` saniyede bir kare çıkarır.
2. Her kareyi `POST /buddy/analyze` mantığıyla işler.
3. `speak_text` varsa `/tts` ile ses üretir.
4. WAV parçalarını tek dosyada birleştirir.

Önemli caveat:

- Script WAV parçalarını birleştirir. `TTS_PROVIDER=falai` ve `FALAI_TTS_AUDIO_FORMAT=mp3`
  kullanılırsa birleşim hatalı olabilir. Script demo için en temiz ayarlar:

```env
TTS_PROVIDER=gemini
```

veya fal.ai WAV destekliyorsa:

```env
TTS_PROVIDER=falai
FALAI_TTS_AUDIO_FORMAT=wav
```

## Frontend Entegrasyon Sırası

1. `/health` ile backend erişimini doğrula.
2. `/buddy/analyze` için tek frame gönder.
3. `speak_text` alanını app TTS'i veya `/tts` ile oku.
4. `/voice/ask` için önce transcript-only entegrasyon yap.
5. Gerekiyorsa `/stt` veya `/voice/ask` audio fallback ekle.
6. Feedback/Spor endpoint'lerini ayrı akışlara bağla.

## Deployment / Tünel

Hackathon demosunda servis lokal koşabilir ve dışarı tünellenebilir.

Örnek:

```bash
uv run uvicorn ai_pipeline.main:app --host 0.0.0.0 --port 8000
```

Sonra `cloudflared` veya `ngrok` ile `localhost:8000` dışarı açılır.

Frontend base URL yalnızca domain değiştirir; path'ler aynı kalır.

## Dosya Düzeni

```text
ai/
  src/ai_pipeline/
    config.py
    main.py
    gemini.py
    tts.py
    stt.py
    schemas.py
    prompts.py
    geo.py
    frames.py
  data/
    istanbul_known_issues.json
  static/
    test.html
  scripts/
    demo_buddy.py
  tests/
  docs/
```
