# API Kontratı

Base URL lokal geliştirmede:

```text
http://localhost:8000
```

Tünel kullanıldığında frontend aynı path'leri tünel domain'i altında çağırır.

## Genel Kurallar

- Görsel/ses taşıyan endpoint'ler `multipart/form-data` kullanır.
- Analiz endpoint'leri `application/json` döner.
- `/tts` başarılıysa binary audio döner; başarısızsa JSON hata döner.
- VLM başarısızlıklarında servis mümkün olduğunca geçerli response şemasıyla güvenli fallback döner.
- Secret değerleri response'larda dönmez; `/health` yalnızca key var/yok bilgisi verir.

## `GET /health`

Servisin ayakta olup olmadığını ve ana provider seçimlerini kontrol eder.

Örnek response:

```json
{
  "status": "ok",
  "gemini_key_loaded": "yes",
  "tts_provider": "falai",
  "pattern_a_llm_provider": "gemini",
  "pattern_d_llm_provider": "gemini"
}
```

## `GET /test`

Tarayıcıdan manuel test için statik konsol döner.

Örnek:

```text
http://localhost:8000/test
```

Bu sayfa şunları test eder:

- tek frame Buddy analizi
- video üzerinden gerçek zamanlı Buddy simülasyonu
- yazılı veya mikrofon kayıtlı Voice Q&A
- Feedback kategorize
- Spor anlatımı
- server-side TTS

## `POST /buddy/analyze`

Tek frame üzerinden Buddy Mode analizi yapar.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `frame` | image file | evet | Kullanıcının önündeki kare; jpg/png önerilir |
| `lat` | float | hayır | Kullanıcı enlemi |
| `lon` | float | hayır | Kullanıcı boylamı |

Örnek:

```bash
curl -X POST http://localhost:8000/buddy/analyze \
  -F "frame=@street.jpg" \
  -F "lat=40.9905" \
  -F "lon=29.0270"
```

Response:

```json
{
  "immediate_warnings": ["Yaklaşık üç metre ileride kaldırım kenarı var."],
  "upcoming_known_issues": ["Yakında bozuk kaldırım yüzeyi kaydı var."],
  "speak_text": "Önünde yol açık görünüyor, sağ tarafta kaldırım kenarına dikkat et.",
  "priority": "medium"
}
```

Alanlar:

| Alan | Tip | Açıklama |
|---|---|---|
| `immediate_warnings` | string[] | 5 metre içindeki kritik tehlikeler |
| `upcoming_known_issues` | string[] | GPS verilirse seed data'dan yakın problemler |
| `speak_text` | string | App/TTS tarafından okunacak Türkçe metin |
| `priority` | `low`/`medium`/`high`/`critical` | App tarafı TTS kuyruğu ve interrupt için öncelik |

Fallback:

```json
{
  "immediate_warnings": [],
  "upcoming_known_issues": [],
  "speak_text": "",
  "priority": "low"
}
```

## `POST /buddy/analyze-video`

Video dosyasını server tarafında karelere ayırır ve her kareyi Pattern A ile analiz eder.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `video` | video file | evet | `.mp4`, `.mov` gibi ffmpeg'in okuyabildiği dosya |
| `lat` | float | hayır | Kullanıcı enlemi |
| `lon` | float | hayır | Kullanıcı boylamı |

Davranış:

- Kare aralığı: `GEMINI_FRAME_INTERVAL_SECONDS`
- Maksimum kare sayısı: `VIDEO_MAX_FRAMES`
- Paralel VLM çağrı limiti: `VIDEO_CONCURRENCY`

Response:

```json
{
  "frame_count": 3,
  "frame_interval_seconds": 5,
  "processing_ms": 12400,
  "frames": [
    {
      "t_seconds": 0.0,
      "immediate_warnings": [],
      "upcoming_known_issues": [],
      "speak_text": "Önünde yol açık görünüyor.",
      "priority": "low"
    }
  ]
}
```

Not: Bu endpoint sunucuda `ffmpeg` gerektirir.

## `POST /voice/ask`

Voice Q&A akışıdır. App transcript gönderebilir; transcript yoksa audio gönderilirse servis STT yapar.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `transcript` | string | hayır | App-side STT çıktısı. Varsa audio kullanılmaz |
| `audio` | audio file | hayır | Transcript yoksa fal.ai STT için kullanılır |
| `screen_context` | `buddy_mode`/`sport_mode`/`idle` | hayır | Varsayılan `idle` |
| `frame` | image file | hayır | Buddy/Spor context'inde önerilir |
| `lat` | float | hayır | Kullanıcı enlemi |
| `lon` | float | hayır | Kullanıcı boylamı |

En iyi entegrasyon yolu:

- Mobil app STT yapabiliyorsa `transcript` gönder.
- Server-side STT yalnızca fallback/demo için `audio` ile kullanılsın.

Örnek transcript-only:

```bash
curl -X POST http://localhost:8000/voice/ask \
  -F "transcript=Önümde ne var?" \
  -F "screen_context=buddy_mode" \
  -F "frame=@street.jpg"
```

Response:

```json
{
  "interpreted_question": "Kullanıcı önündeki çevreyi soruyor.",
  "answer_speak_text": "Önünde açık bir yaya yolu görünüyor, sol tarafta kalabalık olabilir.",
  "requires_camera": false,
  "requires_action": "none",
  "confidence": 0.84
}
```

Fallback'ler:

- Transcript yok/STT başarısız:

```json
{
  "interpreted_question": "",
  "answer_speak_text": "Anlayamadım, tekrar söyler misin?",
  "requires_camera": false,
  "requires_action": "none",
  "confidence": 0.0
}
```

- VLM başarısız:

```json
{
  "interpreted_question": "",
  "answer_speak_text": "Bağlantı sorunu var, biraz sonra tekrar dener misin?",
  "requires_camera": false,
  "requires_action": "none",
  "confidence": 0.0
}
```

## `POST /stt`

Server-side speech-to-text endpoint'idir.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `audio` | audio file | evet | WebM/WAV/M4A gibi provider'ın desteklediği ses |

Örnek:

```bash
curl -X POST http://localhost:8000/stt \
  -F "audio=@question.webm"
```

Response:

```json
{
  "transcript": "Önümde ne var?",
  "ok": true
}
```

Başarısız response:

```json
{
  "transcript": "",
  "ok": false
}
```

## `POST /feedback/categorize`

Gönüllü kullanıcının çektiği 1-3 fotoğrafı erişilebilirlik problemi açısından kategorize eder.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `photos` | image file[] | evet | Aynı problemin 1-3 açıdan fotoğrafı |

Örnek:

```bash
curl -X POST http://localhost:8000/feedback/categorize \
  -F "photos=@pothole-1.jpg" \
  -F "photos=@pothole-2.jpg"
```

Response:

```json
{
  "has_damage": true,
  "issues": [
    {
      "type": "pothole",
      "severity": "high",
      "affected_users": ["visually_impaired", "elderly"],
      "description_tr": "Yaya yolunda derin bir çukur görünüyor.",
      "confidence": 0.91
    }
  ],
  "overall_accessibility_score": 3
}
```

## `POST /sport/describe`

Spor aleti fotoğrafını tanımlar ve Türkçe kullanım anlatımı üretir.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `photo` | image file | evet | Spor aleti veya spor alanı fotoğrafı |

Örnek:

```bash
curl -X POST http://localhost:8000/sport/describe \
  -F "photo=@equipment.jpg"
```

Response:

```json
{
  "equipment_detected": true,
  "equipment_name_tr": "Dış mekan eliptik bisiklet",
  "muscle_groups": ["bacak", "kalça", "kol"],
  "usage_steps_tr": [
    "Ayaklarını pedallara yerleştir.",
    "Yan tutacaklardan kavra.",
    "Pedalları kontrollü şekilde ileri geri hareket ettir."
  ],
  "safety_warnings_tr": ["Pedallar hareketliyken hızlı inmeye çalışma."],
  "speak_text": "Bu dış mekan eliptik bisiklete benziyor..."
}
```

## `POST /tts`

Türkçe metni server-side TTS provider ile seslendirir.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `text` | string | evet | Seslendirilecek Türkçe metin |

Örnek:

```bash
curl -X POST http://localhost:8000/tts \
  -F "text=Önünde açık bir yol var." \
  --output speech.bin
```

Başarılı response:

- Body: audio binary
- `Content-Type`: provider'a göre `audio/mpeg`, `audio/wav`, vb.

Başarısız response:

```json
{
  "error": "tts_unavailable",
  "text": "Önünde açık bir yol var."
}
```

App tarafı başarısızlıkta `text` değerini kendi TTS fallback'iyle okuyabilir.
