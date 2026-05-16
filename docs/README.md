# `ai` Servisi Dokümantasyonu

Bu klasör, `ai` servisinin güncel çalışma şeklini anlatır. Kodun gerçek davranışı esas
alınmıştır; ürün bağlamı için ana kaynak repo kökündeki `../product-spec.md`, agent kuralları
için `../ai/AGENTS.md` dosyasıdır.

## Servis Ne Yapar?

`ai` servisi, görme engelli kullanıcı için kamera/ses girdilerini AI modellerinden geçirip
Türkçe rehberlik üreten FastAPI tabanlı backend'dir.

Ana yetenekler:

- **Buddy Mode / Pattern A:** tek frame veya video kareleri -> VLM -> güvenlik/rehberlik JSON'u.
- **Voice Q&A / Pattern D:** transcript veya ses + opsiyonel frame -> VLM -> Türkçe cevap JSON'u.
- **Feedback / Pattern B:** 1-3 problem fotoğrafı -> VLM -> erişilebilirlik problemi kategorisi.
- **Spor / Pattern C:** spor aleti fotoğrafı -> VLM -> kullanım anlatımı.
- **TTS:** Türkçe metin -> ses; provider `.env` ile `falai` veya `gemini`.
- **STT:** ses -> transcript; fal.ai Scribe tabanlı server fallback.
- **Known issues:** Supabase yerine statik seed JSON + Haversine yakınlık filtresi.

## Doküman Haritası

| Dosya | İçerik |
|---|---|
| [`architecture.md`](architecture.md) | Sistem mimarisi, modüller, veri akışları, hata/fallback politikası |
| [`api-contract.md`](api-contract.md) | Frontend ve test client'ların kullanacağı HTTP kontratı |
| [`configuration.md`](configuration.md) | `.env` anahtarları, provider/model seçimleri, güvenlik notları |
| [`development.md`](development.md) | Kurulum, lokal çalıştırma, test, lint, test konsolu ve demo script'leri |
| [`troubleshooting.md`](troubleshooting.md) | Sık hata durumları ve hızlı çözüm yolları |

## Hızlı Başlangıç

```bash
cd /Users/tng/Code/odtu-hackathon/ai
uv sync
cp .env.example .env
```

`.env` içinde en az şunlar gerekir:

```env
GEMINI_API_KEY=...
TTS_PROVIDER=falai
FAL_KEY=...
```

Servisi başlat:

```bash
uv run uvicorn ai_pipeline.main:app --reload --host 0.0.0.0 --port 8000
```

Kontrol:

```bash
curl http://localhost:8000/health
```

Tarayıcı test konsolu:

```text
http://localhost:8000/test
```

## Güncel Teknik Kararlar

- Python `>=3.13`, FastAPI, Pydantic v2, `uv`.
- VLM/structured output implementasyonu şu an **Gemini** üzerinden çalışır.
- Feature bazlı LLM provider/model seçimi config'te hazırdır, ancak Gemini dışı VLM adapter henüz yoktur.
- TTS provider seçimi çalışır durumdadır: `TTS_PROVIDER=falai` veya `TTS_PROVIDER=gemini`.
- STT server fallback fal.ai ElevenLabs Scribe V2 endpoint'iyle yapılır.
- App tarafı TTS playback, kuyruk, interrupt ve `priority: critical` davranışından sorumludur.
- Servis görsel/ses dosyalarını kalıcı saklamaz; demo çıktıları `output/` altında üretilirse `.gitignore` kapsamındadır.

## Bilinen Sınırlar

- VLM provider config'i genel tutuldu, fakat çalışan VLM adapter yalnızca Gemini'dir.
- `scripts/demo_buddy.py` WAV parçalarını birleştirir. `TTS_PROVIDER=falai` ve MP3 çıktı kullanılıyorsa
  script'in birleştirme kısmı uyumsuz olabilir; demo için `TTS_PROVIDER=gemini` veya fal.ai WAV çıktı tercih edilir.
- `/buddy/analyze-video` sunucu tarafında ffmpeg ister.
- Model ID'leri ve preview model davranışları provider tarafında değişebilir; `.env` ile güncellenebilir tutulmuştur.
