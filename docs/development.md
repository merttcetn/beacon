# Geliştirme ve Çalıştırma

## Gereksinimler

- Python `>=3.13`
- `uv`
- `ffmpeg` (`/dev/buddy-video` ve `scripts/demo_buddy.py` için)
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

**Önerilen — `start.sh` (deterministik, her cihazda aynı):**

```bash
./start.sh
```

Script nereden çağrılırsa çağrılsın repo köküne geçer, ön-kontrolleri yapar
(proje dizini, `uv`, `.env`, bağımlılıklar, uygulama import'u, port), kabuktaki
`GEMINI_API_KEY` gibi `.env`'i ezen ortam değişkenlerini bu çalıştırmaya özgü
yok sayar ve uvicorn'u başlatır. Herhangi bir adım başarısız olursa net sebep +
çözüm + tam log (`runtime/start.log`) basar. Port değiştirmek için: `PORT=8001 ./start.sh`.

**Manuel alternatif** (script'in yaptığını elle yapmak istersen):

```bash
uv sync
uv run uvicorn ai_pipeline.main:app --reload --host 0.0.0.0 --port 8000
```

> Manuel komutu **mutlaka repo kökünden** (pyproject.toml'un olduğu dizin) çalıştır.
> Üst klasörden çalıştırırsan `uv` projeyi bulamaz ve `ModuleNotFoundError: ai_pipeline`
> alırsın. `start.sh` bu sorunu kendiliğinden çözer.

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

- **Canlı Simülasyon:** bir video telefon kamerası gibi oynatılır; her N saniyede bir kare
  `/v1/assist`'e `event=buddy_frame` olarak gider. Kullanıcı dilediği an sesli soru sorabilir
  → `event=voice`. Bir zaman çizelgesi her yanıtın intent/priority/ui_action/ticket bilgisini
  gösterir; bir TTS kuyruğu konuşmaların kesilmemesini sağlar.
- Manuel tek `/v1/assist` çağrısı.
- Açılır panelde izole tekil endpoint testleri: `/v1/buddy`, `/v1/voice` + `/v1/speech/transcribe`,
  `/v1/feedback`, `/v1/sport`.

Notlar:

- Mikrofon kaydı browser `MediaRecorder` API'sini kullanır.
- Video simülasyonunda frame tarayıcıda `1024px` genişliğe ölçeklenir.
- Test konsolu production UI değildir; entegrasyon ve demo aracıdır.

## Testler

```bash
uv run pytest
```

Mevcut test kapsamı (~41 test):

- orchestrator dispatch (`/v1/assist` event → intent → pattern)
- pattern fonksiyonları (Pattern A/B/C/D)
- Pydantic şemaları
- prompt builder'lar
- config yükleme
- gemini timeout/temperature override'ları
- `/v1/assist` endpoint'i
- `/health` smoke testi
- geo (Haversine mesafe + known issues seed + nearby filtre)

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
2. Her kareyi `POST /v1/buddy` mantığıyla işler.
3. `speak_text` varsa `/v1/speech/synthesize` ile ses üretir.
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
2. Tek endpoint `/v1/assist`'i entegre et: proaktif kareler için `event=buddy_frame`,
   kullanıcı konuştuğunda `event=voice` gönder. `speak_text`'i app TTS'i veya
   `/v1/speech/synthesize` ile oku; `ui_action`/`ticket`'a göre UI aksiyonu al.
3. İzole kullanım için tekil `/v1/*` pattern endpoint'leri (`/v1/buddy`, `/v1/voice`,
   `/v1/feedback`, `/v1/sport`) mevcuttur; production akışı `/v1/assist` üzerinden gider.

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
    patterns.py
    orchestrator.py
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
