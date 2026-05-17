# API Kontratı

Base URL lokal geliştirmede:

```text
http://localhost:8000
```

Tünel kullanıldığında frontend aynı path'leri tünel domain'i altında çağırır.

## Genel Kurallar

- Görsel/ses taşıyan endpoint'ler `multipart/form-data` kullanır.
- Analiz endpoint'leri `application/json` döner.
- `/v1/speech/synthesize` başarılıysa binary audio döner; başarısızsa JSON hata döner.
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

- canlı simülasyon — video `/v1/assist` üzerinden `buddy_frame` olarak işlenir; kullanıcı
  dilediği an sesli soru sorar → `voice`
- manuel tek `/v1/assist` çağrısı
- izole tekil endpoint testleri (buddy / voice / feedback / sport)
- server-side TTS / STT

## `POST /v1/assist`

Orchestrator — UI'nin AI ile **tek giriş noktası**. UI tüm AI akışlarında bunu kullanır.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `event` | `voice` / `buddy_frame` | evet | `voice`: kullanıcı konuştu. `buddy_frame`: proaktif sessiz kare. |
| `transcript` | string | hayır | `event=voice` — app-side STT çıktısı. Varsa `audio` kullanılmaz. |
| `audio` | audio file | hayır | `event=voice` — transcript yoksa server STT eder. |
| `frame` | image file | hayır | O anki kamera karesi. `buddy_frame`'de zorunlu; `voice`'ta describe_sport/ask/report için gerekir. |
| `screen_context` | `buddy_mode`/`sport_mode`/`idle` | hayır | Varsayılan `idle`. |
| `lat` / `lon` | float | hayır | Kullanıcı konumu. |
| `recent_guidance` | string | hayır | `buddy_frame` — son birkaç `speak_text` (satırla ayrılmış); tekrar önleme. |
| `nearby_tickets` | string (JSON dizi) | hayır | Kullanıcının çevresindeki kayıtlı ticket'lar (her istekte gönderilir). |

`nearby_tickets` JSON öğe şekli:

```json
[
  {"issue_type": "pothole", "severity": "high", "description_tr": "Derin çukur var.", "distance_m": 18}
]
```

Response — `AssistResponse` zarfı (örnek: sesli ticket bildirimi):

```json
{
  "event": "voice",
  "intent": "report_issue",
  "speak_text": "Önündeki sorunu kaydediyorum. Derin çukur var. Yakında bir engel daha var.",
  "priority": "medium",
  "ui_action": "open_ticket",
  "ticket": {
    "issue_type": "pothole",
    "severity": "high",
    "affected_users": ["visually_impaired"],
    "description_tr": "Derin çukur var.",
    "confidence": 0.9,
    "lat": 40.9905,
    "lon": 29.0270,
    "source": "user_visually_impaired"
  },
  "data": {}
}
```

Alanlar:

| Alan | Tip | Açıklama |
|---|---|---|
| `event` | string | İstekteki `event` echo'su. |
| `intent` | string | `ask`/`describe_sport`/`report_issue`/`nearby_tickets`/`switch_mode`/`stop`/`unknown`/`buddy_frame`. |
| `speak_text` | string | TTS ile okunacak Türkçe metin (boş = sessizlik). |
| `priority` | `low`/`medium`/`high`/`critical` | TTS kuyruğu önceliği. Dinamik öncelik yalnız `buddy_frame`'de. |
| `ui_action` | `none`/`open_ticket`/`switch_to_buddy`/`switch_to_sport` | UI'nin yapacağı aksiyon. |
| `ticket` | object \| null | `ui_action=open_ticket` ise: UI bunu n8n ticket-oluşturma workflow'una iletir. |
| `data` | object \| null | İlgili pattern'ın ham çıktısı (detay isteyen UI için). |

UI davranışı:

- `ui_action=open_ticket` → `ticket` payload'unu n8n'e ilet (yeni ticket).
- `ui_action=switch_to_buddy`/`switch_to_sport` → ilgili moda geç.
- `speak_text` boşsa konuşma; doluysa TTS kuyruğuna ekle (`/v1/speech/synthesize`).

4 kritik senaryo:

1. **Soru** — `event=voice`, `transcript=Önümde ne var` → `intent=ask`, `speak_text`=ortam anlatımı.
2. **Spor** — `transcript=Bu aleti anlat` + `frame` → `intent=describe_sport`, `ui_action=switch_to_sport`.
3. **Bildir** — `transcript=Şunu bildir` + `frame` + `nearby_tickets` → `intent=report_issue`, `ui_action=open_ticket`, `ticket` dolu, `speak_text`=onay + çevre özeti.
4. **Proaktif** — `event=buddy_frame` + `frame` (+ `recent_guidance`, `nearby_tickets`) → `intent=buddy_frame`, `ui_action=none`.

Örnek:

```bash
curl -X POST http://localhost:8000/v1/assist \
  -F "event=voice" \
  -F "transcript=Bu aleti anlat" \
  -F "screen_context=idle" \
  -F "frame=@equipment.jpg"
```

## `POST /v1/buddy`

Tek frame üzerinden Buddy Mode analizi yapar.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `frame` | image file | evet | Kullanıcının önündeki kare; jpg/png önerilir |
| `lat` | float | hayır | Kullanıcı enlemi |
| `lon` | float | hayır | Kullanıcı boylamı |
| `recent_guidance` | string | hayır | Realtime akışta son söylenen `speak_text`'ler (satırla ayrılmış); model tekrarı önler |

Örnek:

```bash
curl -X POST http://localhost:8000/v1/buddy \
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

## `POST /dev/buddy-video` (dev-only, OpenAPI'de gizli)

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

## `POST /v1/voice`

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
curl -X POST http://localhost:8000/v1/voice \
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

## `POST /v1/speech/transcribe`

Server-side speech-to-text endpoint'idir.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `audio` | audio file | evet | WebM/WAV/M4A gibi provider'ın desteklediği ses |

Örnek:

```bash
curl -X POST http://localhost:8000/v1/speech/transcribe \
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

## `POST /v1/feedback`

Gönüllü kullanıcının çektiği 1-3 fotoğrafı erişilebilirlik problemi açısından kategorize eder.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `photos` | image file[] | evet | Aynı problemin 1-3 açıdan fotoğrafı |

Örnek:

```bash
curl -X POST http://localhost:8000/v1/feedback \
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

## `POST /v1/sport`

Spor aleti fotoğrafını tanımlar ve Türkçe kullanım anlatımı üretir.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `photo` | image file | evet | Spor aleti veya spor alanı fotoğrafı |

Örnek:

```bash
curl -X POST http://localhost:8000/v1/sport \
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

## `POST /v1/speech/synthesize`

Türkçe metni server-side TTS provider ile seslendirir.

İstek: `multipart/form-data`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---:|---|
| `text` | string | evet | Seslendirilecek Türkçe metin |

Örnek:

```bash
curl -X POST http://localhost:8000/v1/speech/synthesize \
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
