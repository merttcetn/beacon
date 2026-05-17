# n8n Ticket Report Webhook — Entegrasyon Notu

> **Hedef kitle:** Frontend (Expo) ekibi — Toprak & Mert
> **Sahip:** Tunahan (n8n altyapısı)
> **Durum:** Çalışıyor, lokal n8n üzerinde test edildi

## Bu webhook ne yapar?

Volunteer veya görme engelli kullanıcının **Pattern B (Feedback)** akışında tespit ettiği erişilebilirlik sorununu uygun Türkiye kamu kurumlarına (İBB, ilçe belediyeleri, CİMER, İSKİ vb.) mail ile bildirir. n8n içinde sırasıyla:

1. Payload validate
2. Reverse geocode (OSM Nominatim) → koordinattan ilçe/il çıkarımı
3. Authority routing (issue_type × ilçe kuralları)
4. Türkçe mail composition (rol + severity-aware)
5. Mailtrap SMTP üzerinden gönderim (sandbox inbox)
6. Aggregated response

**Sadece Pattern B bu webhook'u tetikler.** Pattern A (Buddy Mode), C (Spor), D (Voice Q&A) → sadece `ai/` servisi ile konuşur, n8n yok.

---

## Endpoint

**Public (Expo / telefon / dış cihaz için — kullanın bunu):**
```
POST https://unripe-overlap-lizard.ngrok-free.dev/webhook/ticket-report
Content-Type: application/json
```

**Lokal (Tunahan'ın makinesinde test için):**
```
POST http://localhost:5678/webhook/ticket-report
```

URL ngrok'un statik dev domain'i — Tunahan'ın hesabına bağlı, her tunnel restart'ında **aynı kalır**. Frontend `.env`:

```
EXPO_PUBLIC_N8N_BASE=https://unripe-overlap-lizard.ngrok-free.dev
```

> ⚠️ **Tunnel açık olmalı.** Tunahan lokalde `ngrok http --url=unripe-overlap-lizard.ngrok-free.dev 5678` koşturuyor. Tunnel kapalıysa istek 502 döner — Tunahan'a yaz.

---

## İstek (Payload)

`ai/` servisinin `/feedback/categorize` response'u **olduğu gibi** `categorization` alanına konur, yanına Expo extra'ları eklenir.

```json
{
  "transcript": "Önümde derin bir çukur var",
  "categorization": {
    "has_damage": true,
    "issues": [
      {
        "type": "pothole",
        "severity": "high",
        "affected_users": ["visually_impaired", "elderly"],
        "description_tr": "Yaya yolunda derin bir çukur var.",
        "confidence": 0.91
      }
    ],
    "overall_accessibility_score": 3
  },
  "location": { "lat": 41.0082, "lon": 28.9784 },
  "timestamp": "2026-05-17T14:30:00Z",
  "user": { "role": "visually_impaired" }
}
```

### Alan açıklamaları

| Alan | Zorunlu | Tip | Not |
|---|---|---|---|
| `transcript` | evet | string | Kullanıcının kendi sesli ifadesi (mail body'de tırnak içinde alıntılanır) |
| `categorization` | evet | object | **`ai/feedback/categorize` response'u olduğu gibi** |
| `categorization.has_damage` | evet | bool | `false` ise n8n bildirimi reddeder (zaten gönderme) |
| `categorization.issues[]` | evet | array | En az 1 issue. **n8n sadece `issues[0]`'ı kullanır** |
| `categorization.issues[0].type` | evet | enum | Aşağıdaki tabloya bak |
| `categorization.issues[0].severity` | evet | enum | `low` / `medium` / `high` / `critical` |
| `categorization.issues[0].affected_users` | hayır | string[] | `wheelchair` / `visually_impaired` / `stroller` / `elderly` |
| `categorization.issues[0].description_tr` | hayır | string | Türkçe açıklama (mail body'de görünür) |
| `location.lat`, `location.lon` | evet | number | WGS84 koordinat (Expo `expo-location`'dan) |
| `timestamp` | evet | ISO 8601 | `new Date().toISOString()` |
| `user.role` | evet | enum | `visually_impaired` / `volunteer` (mail tonunu belirler) |

### Desteklenen `issues[0].type` değerleri

`pothole`, `uneven_surface`, `narrow_passage`, `missing_ramp`, `missing_tactile_paving`, `obstacle`, `water_pooling`, `damaged_equipment`, `other`

Bilinmeyen `type` → İBB Çağrı Merkezi'ne (`other` fallback) yönlendirilir.

---

## Response

### Başarılı (HTTP 200)

```json
{
  "success": true,
  "ticket_id": "ticket-1778975660073-drponp",
  "sent_count": 3,
  "sent_to": [
    { "authority_name": "Fatih Belediyesi Fen İşleri Müdürlüğü", "email": "feniisleri@mock.fatih.bel.tr", "tier": "TO" },
    { "authority_name": "İBB Yol Bakım ve Onarım Daire Başkanlığı", "email": "yol.bakim@mock.ibb.gov.tr", "tier": "CC" },
    { "authority_name": "Cumhurbaşkanlığı İletişim Merkezi (CİMER)", "email": "cimer@mock.gov.tr", "tier": "CC" }
  ],
  "timestamp_processed": "2026-05-17T11:54:26.758Z"
}
```

UI'da kullanım önerisi:
- `ticket_id` → "Bildirim ID: ..." satırı
- `sent_count` → "✓ 3 kuruma iletildi"
- `sent_to[]` → liste/expandable detay (opsiyonel)

### Validation hatası (HTTP 200 ama boş body)

Şu durumlarda boş response döner — frontend zaten bunları **göndermeden önce** kontrol etmeli:
- `has_damage: false`
- `issues` array boş
- Zorunlu alan eksik
- `location.lat/lon` sayı değil

---

## Curl ile manuel test

```bash
curl -X POST https://unripe-overlap-lizard.ngrok-free.dev/webhook/ticket-report \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Önümde derin bir çukur var",
    "categorization": {
      "has_damage": true,
      "issues": [{
        "type": "pothole",
        "severity": "high",
        "affected_users": ["visually_impaired"],
        "description_tr": "Yaya yolunda derin bir çukur.",
        "confidence": 0.91
      }],
      "overall_accessibility_score": 3
    },
    "location": {"lat": 41.0082, "lon": 28.9784},
    "timestamp": "2026-05-17T14:30:00Z",
    "user": {"role": "visually_impaired"}
  }'
```

---

## Önerilen Expo akışı (Pattern B)

```ts
// 1. ai/ servisine fotoğrafları yolla
const aiResp = await fetch(`${AI_BASE}/feedback/categorize`, {
  method: 'POST',
  body: photosFormData,
});
const categorization = await aiResp.json();

// 2. has_damage kontrolü — false ise kullanıcıya "sorun yok" göster, n8n'e basma
if (!categorization.has_damage || categorization.issues.length === 0) {
  showToast('Tespit edilen bir sorun yok');
  return;
}

// 3. n8n webhook'una post
const n8nResp = await fetch(`${N8N_BASE}/webhook/ticket-report`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcript: voiceTranscript,        // Pattern D veya kullanıcı yazdığı not
    categorization,                      // ai/ response'u olduğu gibi
    location: { lat, lon },              // expo-location'dan
    timestamp: new Date().toISOString(),
    user: { role: currentUser.role },    // 'visually_impaired' | 'volunteer'
  }),
});
const result = await n8nResp.json();
// → result.ticket_id, result.sent_count, result.sent_to
```

---

## Gotchas

1. **Çoklu issue:** `ai/` birden fazla `issue` döndürürse n8n **sadece ilkini** alır (en yüksek confidence/öncelik varsayımı). Demo için yeterli — tek-issue iletim ideathon scope'unda doğru karar.
2. **`has_damage: false` filtreleme:** Frontend'de yapın, n8n çağrısı bile yapmayın. n8n bunu reddeder ama UX için frontend'de erken kesilmesi daha temiz.
3. **Reverse geocode hassasiyeti:** Nominatim Türkiye için iyi ama bazı kırsal yerlerde "ilçe" çıkmayabilir → "Belirsiz" ile devam eder, mail yine gider. Demo için İstanbul üzerinde test edilmiş.
4. **Mailtrap sandbox:** Mail'ler gerçek alıcılara gitmez, sadece sandbox inbox'a düşer. Demo'da inbox screenshot'ı/canlı gösterim ile sunulur.
5. **Bilinmeyen issue type:** `other` fallback ile İBB Çağrı Merkezi'ne yönlenir, hata fırlatmaz.
6. **ngrok latency:** Tunnel üzerinden istek ~3 sn ek gecikme bindirir (lokal ~6 sn → ngrok ~9 sn). UI tarafında "bildirim gönderiliyor..." spinner'ı en az 10 saniye dayanabilmeli.
7. **ngrok free tier limiti:** 40 conn/dakika. Demo sırasında sorun olmaz, load test yapmayın.

---

## İletişim

Sorun olursa Tunahan'a yaz. Webhook URL, payload şeması veya routing kuralları değişirse bu doküman güncellenir.
