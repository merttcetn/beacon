# Orchestrator Katmanı — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** UI ile AI servisi arasına tek giriş noktası (`POST /v1/assist`) olan bir orchestrator katmanı eklemek — sesli kullanıcı niyetini sınıflandırıp doğru pattern'a yönlendiren, sesli ticket akışını yöneten "akıllı kapı".

**Architecture:** İki event'li tek endpoint. `event=buddy_frame` deterministik → doğrudan Pattern A (orchestrator LLM yok). `event=voice` → tek bir sıkı orchestrator LLM çağrısı (metin-only, temperature 0) niyeti sınıflandırır ve gerektiğinde çevre ticket özetini üretir → mevcut pattern fonksiyonlarına (A/B/C/D) yönlendirilir. Pattern mantığı `patterns.py`'ye çıkarılır (DRY); hem mevcut `/v1/*` endpoint'leri hem orchestrator oradan çağırır.

**Tech Stack:** Python 3, FastAPI, Pydantic v2, `google-genai` (Gemini), `uv`, `pytest`, `ruff`.

---

## Tasarım Bağlamı (brainstorming çıktısı)

Bu plan, kullanıcıyla yapılan tasarım diyaloğunun sonucudur. Kilitlenen kararlar:

- **Tek endpoint, 2 event.** Kör kullanıcı → buton yok, her şey sesle. UI deterministik olarak `event` set eder: proaktif sessiz frame → `buddy_frame`; kullanıcı konuştu → `voice`.
- **İki aşamalı yönlendirme.** Orchestrator LLM yalnızca `event=voice`'ta çalışır. Sıkı prompt + structured output + `temperature=0` → keyword katmanı olmadan deterministiğe yakın sınıflandırma.
- **`issue` vs `ticket`.** Mevcut pattern şemaları `issue` kalır (VLM-içi tespit terimi). Yeni orchestrator kodu boundary'de `ticket` kullanır (DB/n8n/UI dili). Mevcut şemalar yeniden adlandırılmaz.
- **Çevre bilgisi her istekte.** UI her isteğe `nearby_tickets` (JSON dizi) ekler. Servis DB'siz (AGENTS.md §2) — geri-çağrı yok; orchestrator gerekirse bu listeyi tek seferde özetler.
- **TTS UI tarafında.** Orchestrator `speak_text` + `priority` döner; ses sentezi `/v1/speech/synthesize` plumbing endpoint'inde kalır (spec §4.2 — TTS kuyruğu/interrupt app-side).
- **`recent_guidance`** bağlamı önceki turda eklendi — bu planın kapsamı dışında, dokunulmaz.

### Niyet → aksiyon tablosu

| intent | Yönlendirme | Sonuç |
|---|---|---|
| `ask` | Pattern D (`answer_voice`) | `speak_text`=cevap; `requires_action`→`ui_action` |
| `describe_sport` | Pattern C (`describe_sport`) | `speak_text`=anlatım; `ui_action=switch_to_sport` |
| `report_issue` | Pattern B (`categorize_feedback`) | `ticket{}`; `speak_text`=onay + çevre özeti; `ui_action=open_ticket` |
| `nearby_tickets` | — (orchestrator özeti) | `speak_text`=`nearby_tickets_speak_text` |
| `switch_mode` | — | `ui_action=switch_to_buddy`/`switch_to_sport` |
| `stop` | — | `speak_text=""` |
| `unknown` | — | açıklama isteyen `speak_text` |

### Mevcut prompt denetimi — bu plan neyi kapatıyor

- ✅ Hazır: Pattern D (ortam soruları), Pattern C (spor), "sus" — dokunulmaz.
- ⚠️ Düzeltilecek: Pattern B çerçevelemesi gönüllü-odaklı → görme engelli kullanıcının tek karesini de kapsayacak (Task 4).
- ❌ Sıfırdan: `ORCHESTRATOR_SYSTEM` niyet sınıflandırma + ticket özetleme (Task 4), dispatch katmanı (Task 7).

### Dosya haritası

| Dosya | Sorumluluk | Durum |
|---|---|---|
| `src/ai_pipeline/gemini.py` | Gemini client; `generate_structured`'a `temperature` | Modify |
| `src/ai_pipeline/config.py` | `.env` ayarları; orchestrator model/temperature | Modify |
| `src/ai_pipeline/schemas.py` | Pydantic modeller; orchestrator şemaları | Modify |
| `src/ai_pipeline/prompts.py` | VLM prompt'ları; `ORCHESTRATOR_SYSTEM` + Pattern B düzeltmesi | Modify |
| `src/ai_pipeline/patterns.py` | Pattern A/B/C/D çağrılabilir fonksiyonlar | **Create** |
| `src/ai_pipeline/orchestrator.py` | `decide()` + `handle_assist()` dispatch | **Create** |
| `src/ai_pipeline/main.py` | FastAPI; endpoint'ler `patterns.py`'ye iner + `/v1/assist` | Modify |
| `static/test.html` | Test konsolu; Orchestrator bölümü | Modify |
| `AGENTS.md` | §4/§5/§12 dokümantasyon | Modify |

---

## Task 1: `generate_structured`'a `temperature` parametresi

Orchestrator sınıflandırması deterministik olmalı → `temperature=0`. Şu an `generate_structured` temperature kabul etmiyor.

**Files:**
- Modify: `src/ai_pipeline/gemini.py:35-60`
- Test: `tests/test_gemini_config.py` (Create)

- [ ] **Step 1: Write the failing test**

`tests/test_gemini_config.py`:

```python
"""generate_structured temperature parametresi testi (gerçek API çağırmaz)."""

import asyncio

from ai_pipeline import gemini
from ai_pipeline.schemas import BuddyAnalysis


class _FakeModels:
    def __init__(self) -> None:
        self.last_config = None

    async def generate_content(self, *, model, contents, config):  # noqa: ANN001
        self.last_config = config

        class _Resp:
            parsed = None
            text = "{}"

        return _Resp()


class _FakeClient:
    def __init__(self) -> None:
        self.models_obj = _FakeModels()

        class _Aio:
            pass

        self.aio = _Aio()
        self.aio.models = self.models_obj


def test_temperature_passed_to_config(monkeypatch) -> None:  # noqa: ANN001
    fake = _FakeClient()
    monkeypatch.setattr(gemini, "get_client", lambda: fake)
    asyncio.run(
        gemini.generate_structured(
            model="m",
            system_instruction="s",
            user_prompt="u",
            response_schema=BuddyAnalysis,
            temperature=0.0,
        )
    )
    assert fake.models_obj.last_config.temperature == 0.0


def test_temperature_defaults_to_none(monkeypatch) -> None:  # noqa: ANN001
    fake = _FakeClient()
    monkeypatch.setattr(gemini, "get_client", lambda: fake)
    asyncio.run(
        gemini.generate_structured(
            model="m",
            system_instruction="s",
            user_prompt="u",
            response_schema=BuddyAnalysis,
        )
    )
    assert fake.models_obj.last_config.temperature is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_gemini_config.py -v`
Expected: FAIL — `generate_structured() got an unexpected keyword argument 'temperature'`

- [ ] **Step 3: Add the `temperature` parameter**

`gemini.py` — `generate_structured` imzasına ekle ve `GenerateContentConfig`'e geçir. İmza (satır 35-42):

```python
async def generate_structured(
    *,
    model: str,
    system_instruction: str,
    user_prompt: str,
    response_schema: type[BaseModel],
    images: list[Image] | None = None,
    temperature: float | None = None,
) -> BaseModel | None:
```

Config bloğu (satır 56-60) şununla değiştirilir:

```python
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        response_schema=response_schema,
        temperature=temperature,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_gemini_config.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add src/ai_pipeline/gemini.py tests/test_gemini_config.py
git commit -m "feat: add temperature param to generate_structured"
```

---

## Task 2: Orchestrator konfigürasyonu

Orchestrator için model + temperature `.env`'den okunmalı (kodda hardcode yok — AGENTS.md §7).

**Files:**
- Modify: `src/ai_pipeline/config.py:25-44` (provider/model alanları), `92-123` (feature map'leri)
- Test: `tests/test_config.py` (Create)

- [ ] **Step 1: Write the failing test**

`tests/test_config.py`:

```python
"""Orchestrator config alanları testi."""

from ai_pipeline.config import settings


def test_orchestrator_model_resolves() -> None:
    assert settings.llm_model_for("orchestrator")
    assert settings.llm_provider_for("orchestrator") == "gemini"


def test_orchestrator_temperature_default() -> None:
    assert settings.orchestrator_temperature == 0.0


def test_orchestrator_min_confidence_in_range() -> None:
    assert 0.0 < settings.orchestrator_min_confidence <= 1.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_config.py -v`
Expected: FAIL — `KeyError: 'orchestrator'` (llm_model_for) / `AttributeError: orchestrator_temperature`

- [ ] **Step 3: Add orchestrator settings**

`config.py` — provider alanlarının altına (satır 32'den sonra, `seed_data_llm_provider` satırının ardına) ekle:

```python
    orchestrator_llm_provider: str = "gemini"  # niyet sınıflandırma + ticket özet
```

Model alanlarının altına (satır 38'den sonra, `seed_data_llm_model` satırının ardına) ekle:

```python
    orchestrator_llm_model: str = "gemini-3.1-flash-lite"  # hızlı, deterministik routing
    orchestrator_temperature: float = 0.0  # sınıflandırma → sıfır sıcaklık
    orchestrator_min_confidence: float = 0.6  # altı: geri-dönüşsüz aksiyon yerine netleştir
```

`llm_provider_for`'daki `providers` sözlüğüne `"seed_data"` satırının ardına ekle:

```python
            "orchestrator": self.orchestrator_llm_provider,
```

`llm_model_for`'daki `models` sözlüğüne `"seed_data"` satırının ardına ekle:

```python
            "orchestrator": self.orchestrator_llm_model,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_config.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add src/ai_pipeline/config.py tests/test_config.py
git commit -m "feat: add orchestrator model + temperature config"
```

---

## Task 3: Orchestrator şemaları

Yeni Pydantic modelleri: `event` discriminator yok (form alanı), ama orchestrator I/O modellenmeli.

**Files:**
- Modify: `src/ai_pipeline/schemas.py` (sonuna eklenir)
- Test: `tests/test_schemas.py` (Create)

- [ ] **Step 1: Write the failing test**

`tests/test_schemas.py`:

```python
"""Orchestrator şemaları testi."""

from ai_pipeline.schemas import (
    AssistResponse,
    NearbyTicket,
    OrchestratorDecision,
    Ticket,
)


def test_orchestrator_decision_defaults() -> None:
    d = OrchestratorDecision()
    assert d.intent == "unknown"
    assert d.target_mode == "none"
    assert d.nearby_tickets_speak_text == ""


def test_ticket_from_fields() -> None:
    t = Ticket(issue_type="pothole", severity="high", description_tr="Çukur var.")
    assert t.issue_type == "pothole"
    assert t.lat is None
    assert t.source == "user_visually_impaired"  # sesli bildirim → kör kullanıcı


def test_nearby_ticket_tolerates_missing_distance() -> None:
    nt = NearbyTicket.model_validate({"issue_type": "obstacle", "description_tr": "Engel."})
    assert nt.distance_m is None


def test_assist_response_minimal() -> None:
    r = AssistResponse(event="voice")
    assert r.intent == ""
    assert r.ui_action == "none"
    assert r.ticket is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_schemas.py -v`
Expected: FAIL — `ImportError: cannot import name 'AssistResponse'`

- [ ] **Step 3: Add the schemas**

`schemas.py` — dosyanın sonuna ekle (mevcut `Priority`, `Severity`, `IssueType`, `AffectedUser` literal'leri yeniden kullanılır — DRY):

```python
Intent = Literal[
    "ask",
    "describe_sport",
    "report_issue",
    "nearby_tickets",
    "switch_mode",
    "stop",
    "unknown",
]
UiAction = Literal[
    "none",
    "open_ticket",
    "switch_to_buddy",
    "switch_to_sport",
]
TargetMode = Literal["buddy", "sport", "none"]


class NearbyTicket(BaseModel):
    """UI'nin gönderdiği, kullanıcının çevresindeki kayıtlı ticket — orchestrator girdisi."""

    issue_type: IssueType = "other"
    severity: Severity = "medium"
    description_tr: str = ""
    distance_m: float | None = None


class OrchestratorDecision(BaseModel):
    """Orchestrator LLM çağrısının structured çıktısı (niyet + opsiyonel çevre özeti)."""

    intent: Intent = "unknown"
    target_mode: TargetMode = "none"
    nearby_tickets_speak_text: str = Field(
        default="",
        description="Yalnızca report_issue / nearby_tickets niyetinde doldurulur; yoksa boş.",
    )
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class Ticket(BaseModel):
    """Sesli bildirimle oluşturulacak ticket — UI bunu n8n'e iletir (boundary entity)."""

    issue_type: IssueType = "other"
    severity: Severity = "medium"
    affected_users: list[AffectedUser] = Field(default_factory=list)
    description_tr: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    lat: float | None = None
    lon: float | None = None
    source: str = Field(
        default="user_visually_impaired",
        description="DB tickets.source (spec §5.3) — sesli bildirim hep kör kullanıcı.",
    )


class AssistResponse(BaseModel):
    """POST /v1/assist birleşik yanıt zarfı — UI tek response şekliyle çalışır."""

    event: str
    intent: str = ""
    speak_text: str = ""
    priority: Priority = "low"
    ui_action: UiAction = "none"
    ticket: Ticket | None = None
    data: dict | None = Field(
        default=None, description="İlgili pattern'ın ham çıktısı (UI detay isterse)."
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_schemas.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add src/ai_pipeline/schemas.py tests/test_schemas.py
git commit -m "feat: add orchestrator schemas (Intent, Ticket, AssistResponse)"
```

---

## Task 4: `ORCHESTRATOR_SYSTEM` prompt + Pattern B düzeltmesi + buddy distance robustluğu

Üç prompt değişikliği: (a) yeni orchestrator prompt'u, (b) Pattern B çerçevelemesi, (c) `buddy_user_prompt` `distance_m` None toleransı.

**Files:**
- Modify: `src/ai_pipeline/prompts.py`
- Test: `tests/test_prompts.py` (Create)

- [ ] **Step 1: Write the failing test**

`tests/test_prompts.py`:

```python
"""Orchestrator + buddy prompt builder testleri."""

from ai_pipeline.prompts import (
    ORCHESTRATOR_SYSTEM,
    buddy_user_prompt,
    orchestrator_user_prompt,
)
from ai_pipeline.schemas import NearbyTicket


def test_orchestrator_system_lists_intents() -> None:
    for intent in ("ask", "describe_sport", "report_issue", "nearby_tickets", "switch_mode"):
        assert intent in ORCHESTRATOR_SYSTEM


def test_orchestrator_user_prompt_with_tickets() -> None:
    tickets = [NearbyTicket(issue_type="pothole", description_tr="Çukur var.", distance_m=20.0)]
    text = orchestrator_user_prompt("önümde ne var", "buddy_mode", tickets)
    assert "önümde ne var" in text
    assert "Çukur var." in text
    assert "20m" in text


def test_orchestrator_user_prompt_no_tickets() -> None:
    text = orchestrator_user_prompt("sus", "idle", [])
    assert "kayıtlı ticket yok" in text


def test_buddy_prompt_tolerates_missing_distance() -> None:
    known = [{"issue_type": "obstacle", "severity": "high", "description_tr": "Engel."}]
    text = buddy_user_prompt(None, None, known)
    assert "Engel." in text  # distance_m yokken patlamaz
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_prompts.py -v`
Expected: FAIL — `ImportError: cannot import name 'ORCHESTRATOR_SYSTEM'`

- [ ] **Step 3a: `buddy_user_prompt` `distance_m` toleransı**

`prompts.py` — `buddy_user_prompt` içindeki `known_issues` döngüsünü (mevcut `for item in known_issues:` bloğu) şununla değiştir:

```python
        for item in known_issues:
            dist = item.get("distance_m")
            dist_str = f"~{round(dist)}m" if dist is not None else "yakında"
            lines.append(
                f"- {dist_str}: {item['description_tr']} "
                f"({item['issue_type']}, {item['severity']})"
            )
```

- [ ] **Step 3b: Pattern B çerçeveleme düzeltmesi**

`prompts.py` — `FEEDBACK_SYSTEM`'in ilk cümlesini değiştir. Mevcut:

```
Sen kaldırım/yol erişilebilirliği uzmanısın. Vatandaşın çektiği \
fotoğraf(lar) bir yaya yolundaki bir noktayı gösteriyor.
```

Yeni:

```
Sen kaldırım/yol erişilebilirliği uzmanısın. Sana verilen fotoğraf(lar) bir yaya \
yolundaki bir noktayı gösteriyor — gönüllü bir vatandaşın çektiği kare ya da görme \
engelli bir kullanıcının o an baktığı sahne olabilir; ikisinde de görevin aynı.
```

- [ ] **Step 3c: `ORCHESTRATOR_SYSTEM` + `orchestrator_user_prompt` ekle**

`prompts.py` — en üstteki import bloğuna ekle:

```python
from ai_pipeline.schemas import NearbyTicket
```

Dosyanın sonuna ekle:

```python
# --- Orchestrator: niyet sınıflandırma + çevre ticket özeti ---

ORCHESTRATOR_SYSTEM = """Sen görme engelli bir kullanıcının sesli asistanının \
YÖNLENDİRİCİSİSİN. Kullanıcı sesli bir şey söyledi (uygulama STT ile metne çevirdi). \
Görevin: kullanıcının NE İSTEDİĞİNİ anlamak ve doğru niyeti (intent) seçmek. Cevabı sen \
ÜRETMEZSİN — yalnızca sınıflandırırsın; tek istisna aşağıdaki çevre özeti.

NİYETLER (intent) — tam birini seç:
- ask: Çevre, durum veya bir nesne hakkında soru. "Önümde ne var", "bu nedir", \
"geçebilir miyim", "tehlike var mı".
- describe_sport: Bir spor aletini/makinesini tanıma veya kullanımını öğrenme isteği. \
"Bu aleti anlat", "şu makineyi tarif et", "bunu nasıl kullanırım", "buradaki cihaz ne".
- report_issue: Karşılaştığı bir engeli/sorunu KAYDETME / BİLDİRME isteği. "Bunu bildir", \
"şunu kaydet", "burada sorun var kaydet", "raporla".
- nearby_tickets: Çevresinde bilinen/kayıtlı sorun olup olmadığını sorma. "Etrafımda \
sorun var mı", "yakında bildirilmiş bir şey var mı", "buralarda ne gibi sorunlar var".
- switch_mode: Mod değiştirme isteği (anlatım/soru içermez). "Spor moduna geç", "buddy \
modunu aç", "yürüyüş moduna dön". target_mode'u doldur: buddy veya sport.
- stop: Susturma. "Sus", "yeter", "tamam", "kapat", "sessiz ol".
- unknown: Yukarıdakilerin hiçbirine net oturmuyor.

KURALLAR:
- STT yanlış transkripsiyon yapmış olabilir — ses benzerliklerini düşün, screen_context \
ve çevre bilgisiyle mantıklı yorumla (örn. "çukur" yerine "şükür" gelebilir). Emin \
değilsen confidence'ı düşür ama yine de en olası niyeti seç; unknown'ı yalnızca gerçekten \
anlamsız/alakasız ifadelerde kullan.
- describe_sport ile ask farkı: bir aleti/makineyi ÖĞRENME isteği describe_sport; genel \
"bu ne" sorusu ask.
- describe_sport screen_context'ten BAĞIMSIZDIR — kullanıcı idle'dayken bile bir aleti \
öğrenmek/tanımak isterse describe_sport seç; mod sonradan değişir.
- switch_mode seçtiysen target_mode'u MUTLAKA doldur (buddy ya da sport). Hangi mod \
istendiği belli değilse switch_mode değil unknown seç. target_mode yalnızca switch_mode'da \
anlamlı; diğer niyetlerde none bırak.

nearby_tickets_speak_text:
- YALNIZCA intent report_issue VEYA nearby_tickets ise doldur. Diğer tüm niyetlerde boş \
string bırak.
- Doldururken: sana verilen "çevredeki kayıtlı ticket'lar" listesini görme engelli \
kullanıcıya Türkçe, kısa, doğal konuşma diliyle özetle. Mesafe bilgisini koru ("yaklaşık \
20 metre ileride bozuk kaldırım var"). Liste boşsa "Yakında kayıtlı başka bir sorun yok." \
de. ASLA yön emri verme — bilgilendir, kararı kullanıcı verir."""


def orchestrator_user_prompt(
    transcript: str,
    screen_context: str,
    nearby_tickets: list[NearbyTicket],
) -> str:
    lines = [
        f'Kullanıcının sesli ifadesi (STT transkripti): "{transcript}"',
        f"Bulunduğu ekran (screen_context): {screen_context}",
    ]
    if nearby_tickets:
        lines.append("Çevresindeki kayıtlı ticket'lar:")
        for ticket in nearby_tickets:
            dist = (
                f"~{round(ticket.distance_m)}m"
                if ticket.distance_m is not None
                else "yakında"
            )
            lines.append(
                f"- {dist}: {ticket.description_tr} ({ticket.issue_type}, {ticket.severity})"
            )
    else:
        lines.append("Çevresinde kayıtlı ticket yok.")
    return "\n".join(lines)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_prompts.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add src/ai_pipeline/prompts.py tests/test_prompts.py
git commit -m "feat: add orchestrator prompt; fix feedback framing + buddy distance"
```

---

## Task 5: `patterns.py` — VLM pattern fonksiyonları (DRY refactor)

Pattern A/B/C/D çağrı mantığı şu an `main.py` endpoint handler'larının içinde gömülü (sadece `analyze_buddy_frame` çıkarılmış). Hepsi `patterns.py`'ye taşınır ki orchestrator da kullanabilsin.

**Files:**
- Create: `src/ai_pipeline/patterns.py`
- Test: `tests/test_patterns.py` (Create)

- [ ] **Step 1: Write the failing test**

`tests/test_patterns.py`:

```python
"""patterns.py — VLM pattern fonksiyonları (Gemini çağrısı mock'lanır)."""

import asyncio

from ai_pipeline import gemini, patterns
from ai_pipeline.schemas import BuddyAnalysis, FeedbackResult, SportDescription, VoiceAnswer


def _mock_generate(monkeypatch, return_value) -> None:  # noqa: ANN001
    async def fake(**kwargs):  # noqa: ANN003, ANN202
        return return_value

    monkeypatch.setattr(gemini, "generate_structured", fake)


def test_analyze_buddy_frame_success(monkeypatch) -> None:  # noqa: ANN001
    _mock_generate(monkeypatch, BuddyAnalysis(speak_text="Önünde merdiven var.", priority="high"))
    result = asyncio.run(patterns.analyze_buddy_frame(b"x", "image/jpeg", None, None, []))
    assert result.speak_text == "Önünde merdiven var."


def test_analyze_buddy_frame_fallback(monkeypatch) -> None:  # noqa: ANN001
    _mock_generate(monkeypatch, None)
    result = asyncio.run(patterns.analyze_buddy_frame(b"x", "image/jpeg", None, None, []))
    assert result == BuddyAnalysis()


def test_describe_sport_success(monkeypatch) -> None:  # noqa: ANN001
    _mock_generate(monkeypatch, SportDescription(equipment_detected=True, speak_text="Bacak presi."))
    result = asyncio.run(patterns.describe_sport(b"x", "image/jpeg"))
    assert result.equipment_detected is True


def test_categorize_feedback_success(monkeypatch) -> None:  # noqa: ANN001
    _mock_generate(monkeypatch, FeedbackResult(has_damage=True))
    result = asyncio.run(patterns.categorize_feedback([(b"x", "image/jpeg")]))
    assert result.has_damage is True


def test_answer_voice_fallback(monkeypatch) -> None:  # noqa: ANN001
    _mock_generate(monkeypatch, None)
    result = asyncio.run(patterns.answer_voice("önümde ne var", "buddy_mode", [], None, None))
    assert "sorun" in result.answer_speak_text.lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_patterns.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'ai_pipeline.patterns'`

- [ ] **Step 3: Create `patterns.py`**

`src/ai_pipeline/patterns.py`:

```python
"""VLM çağrı paternleri (A/B/C/D) — endpoint'ler ve orchestrator buradan çağırır (DRY).

Her fonksiyon, VLM hatasında güvenli fallback döner (boş/zararsız sonuç); exception
yutulmaz, gemini katmanında loglanır (spec §4.1, AGENTS.md §4).
"""

from __future__ import annotations

import logging

from ai_pipeline import gemini
from ai_pipeline.config import settings
from ai_pipeline.gemini import Image
from ai_pipeline.prompts import (
    BUDDY_SYSTEM,
    FEEDBACK_SYSTEM,
    SPORT_SYSTEM,
    VOICE_SYSTEM,
    buddy_user_prompt,
    feedback_user_prompt,
    sport_user_prompt,
    voice_user_prompt,
)
from ai_pipeline.schemas import BuddyAnalysis, FeedbackResult, SportDescription, VoiceAnswer

logger = logging.getLogger("ai_pipeline.patterns")

_SUPPORTED_LLM_PROVIDERS = {"gemini", "google"}

_VOICE_FALLBACK = "Bağlantı sorunu var, biraz sonra tekrar dener misin?"


def model_for(feature: str) -> str | None:
    """Feature için LLM model ID'sini config'ten okur; desteklenmeyen provider → None.

    Şu an structured VLM client yalnızca Gemini implementasyonuna sahip; provider
    alanları future swap için config'te durur.
    """
    provider = settings.llm_provider_for(feature)
    if provider not in _SUPPORTED_LLM_PROVIDERS:
        logger.error("Desteklenmeyen LLM provider: feature=%s provider=%s", feature, provider)
        return None
    return settings.llm_model_for(feature)


async def analyze_buddy_frame(
    image_bytes: bytes,
    image_mime: str,
    lat: float | None,
    lon: float | None,
    known: list[dict],
    recent_guidance: str | None = None,
) -> BuddyAnalysis:
    """Pattern A — tek kareyi Buddy Mode ile analiz eder; hata → güvenli fallback."""
    model = model_for("pattern_a")
    if model is None:
        return BuddyAnalysis()
    result = await gemini.generate_structured(
        model=model,
        system_instruction=BUDDY_SYSTEM,
        user_prompt=buddy_user_prompt(lat, lon, known, recent_guidance),
        response_schema=BuddyAnalysis,
        images=[(image_bytes, image_mime)],
    )
    if result is None:
        logger.warning("Buddy kare analizi: VLM başarısız — güvenli fallback")
        return BuddyAnalysis()
    return result


async def describe_sport(image_bytes: bytes, image_mime: str) -> SportDescription:
    """Pattern C — spor aleti fotoğrafını analiz eder; hata → güvenli fallback."""
    model = model_for("pattern_c")
    if model is None:
        return SportDescription()
    result = await gemini.generate_structured(
        model=model,
        system_instruction=SPORT_SYSTEM,
        user_prompt=sport_user_prompt(),
        response_schema=SportDescription,
        images=[(image_bytes, image_mime)],
    )
    if result is None:
        logger.warning("sport_describe: VLM başarısız — güvenli fallback")
        return SportDescription()
    return result


async def categorize_feedback(images: list[Image]) -> FeedbackResult:
    """Pattern B — 1-3 fotoğrafı erişilebilirlik problemi olarak kategorize eder."""
    model = model_for("pattern_b")
    if model is None:
        return FeedbackResult()
    result = await gemini.generate_structured(
        model=model,
        system_instruction=FEEDBACK_SYSTEM,
        user_prompt=feedback_user_prompt(len(images)),
        response_schema=FeedbackResult,
        images=images,
    )
    if result is None:
        logger.warning("feedback_categorize: VLM başarısız — güvenli fallback")
        return FeedbackResult()
    return result


async def answer_voice(
    transcript: str,
    screen_context: str,
    images: list[Image],
    lat: float | None,
    lon: float | None,
) -> VoiceAnswer:
    """Pattern D — sesli soruyu (+ opsiyonel frame) bağlamsal cevaplar."""
    model = model_for("pattern_d")
    if model is None:
        return VoiceAnswer(answer_speak_text=_VOICE_FALLBACK)
    result = await gemini.generate_structured(
        model=model,
        system_instruction=VOICE_SYSTEM,
        user_prompt=voice_user_prompt(transcript, screen_context, bool(images), lat, lon),
        response_schema=VoiceAnswer,
        images=images,
    )
    if result is None:
        logger.warning("answer_voice: VLM başarısız — güvenli fallback")
        return VoiceAnswer(answer_speak_text=_VOICE_FALLBACK)
    return result
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_patterns.py -v`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add src/ai_pipeline/patterns.py tests/test_patterns.py
git commit -m "refactor: extract VLM patterns into patterns.py"
```

---

## Task 6: `main.py` endpoint'lerini `patterns.py`'ye bağla

Mevcut 4 endpoint'in gömülü mantığı `patterns.py`'deki fonksiyonlara iner. Davranış birebir aynı kalır.

**Files:**
- Modify: `src/ai_pipeline/main.py` (import bloğu + 4 endpoint handler + `analyze_buddy_frame` ve `_gemini_model_for` silinir)
- Test: `tests/test_health.py` (mevcut testler geçmeli) — yeni test yok, doğrulama route + import.

- [ ] **Step 1: Import bloğunu güncelle**

`main.py` — şu satırları SİL:

```python
from ai_pipeline.frames import extract_frames
from ai_pipeline.gemini import generate_structured
from ai_pipeline.geo import nearby_issues
from ai_pipeline.prompts import (
    BUDDY_SYSTEM,
    FEEDBACK_SYSTEM,
    SPORT_SYSTEM,
    VOICE_SYSTEM,
    buddy_user_prompt,
    feedback_user_prompt,
    sport_user_prompt,
    voice_user_prompt,
)
from ai_pipeline.schemas import (
    BuddyAnalysis,
    FeedbackResult,
    SportDescription,
    VoiceAnswer,
)
```

Yerine ekle:

```python
from ai_pipeline import orchestrator, patterns
from ai_pipeline.frames import extract_frames
from ai_pipeline.geo import nearby_issues
from ai_pipeline.schemas import (
    AssistResponse,
    BuddyAnalysis,
    FeedbackResult,
    SportDescription,
    VoiceAnswer,
)
```

> Not: `orchestrator` import'u Task 8'de kullanılacak; şimdi eklenmesi `orchestrator.py` Task 7'de oluşturulduktan sonra çalışır. Task 6 ile Task 7 sırası önemli — **Task 7'yi Task 6'dan önce uygulayın** ya da bu import satırını Task 8'e bırakın. Güvenli sıra: bu plandaki Task 5 → 7 → 6 → 8. (Aşağıdaki adımlar `patterns` import'unu kullanır; `orchestrator` import'unu Task 8'e bırakmak isterseniz bu satırdan `orchestrator,` kelimesini çıkarın ve Task 8 Step 1'de geri ekleyin.)

- [ ] **Step 2: `_SUPPORTED_LLM_PROVIDERS`, `_gemini_model_for` ve `analyze_buddy_frame`'i sil**

`main.py`'den şu üç bloğu tamamen SİL:
- `_SUPPORTED_LLM_PROVIDERS = {"gemini", "google"}` satırı
- `def _gemini_model_for(feature: str) -> str | None:` fonksiyonunun tamamı
- `async def analyze_buddy_frame(...)` fonksiyonunun tamamı

(Bunların işlevi artık `patterns.model_for` ve `patterns.analyze_buddy_frame`.)

- [ ] **Step 3: `/v1/buddy` endpoint'ini güncelle**

`buddy_analyze` handler'ının gövdesindeki `analyze_buddy_frame(...)` çağrısı `patterns.analyze_buddy_frame(...)` olur:

```python
    return await patterns.analyze_buddy_frame(
        image_bytes, frame.content_type or "image/jpeg", lat, lon, known, recent_guidance
    )
```

- [ ] **Step 4: `/dev/buddy-video` içindeki çağrıyı güncelle**

`buddy_analyze_video` içindeki `run()` closure'ında `analyze_buddy_frame(...)` → `patterns.analyze_buddy_frame(...)`:

```python
        async def run(timestamp: float, path: Path) -> dict:
            async with semaphore:
                analysis = await patterns.analyze_buddy_frame(
                    path.read_bytes(), "image/jpeg", lat, lon, known
                )
            return {"t_seconds": timestamp, **analysis.model_dump()}
```

- [ ] **Step 5: `/v1/voice` endpoint'ini güncelle**

`voice_ask` handler'ında STT bloğundan sonra gelen model seçimi + `generate_structured` bloğunu (`model = _gemini_model_for("pattern_d")` satırından `return result` satırına kadar) şununla değiştir:

```python
    images: list[tuple[bytes, str]] = []
    if frame is not None:
        images = [(await frame.read(), frame.content_type or "image/jpeg")]

    return await patterns.answer_voice(transcript, screen_context, images, lat, lon)
```

- [ ] **Step 6: `/v1/feedback` endpoint'ini güncelle**

`feedback_categorize` handler gövdesini şununla değiştir:

```python
    images = [(await p.read(), p.content_type or "image/jpeg") for p in photos]
    return await patterns.categorize_feedback(images)
```

- [ ] **Step 7: `/v1/sport` endpoint'ini güncelle**

`sport_describe` handler gövdesini şununla değiştir:

```python
    image_bytes = await photo.read()
    return await patterns.describe_sport(image_bytes, photo.content_type or "image/jpeg")
```

- [ ] **Step 8: Run tests + route check**

Run: `uv run pytest -q`
Expected: PASS — tüm mevcut testler (Task 1-5 dahil) geçer.

Run: `uv run python -c "from ai_pipeline.main import app; r=sorted(x.path for x in app.routes if hasattr(x,'path')); print(r); assert '/v1/buddy' in r and '/v1/sport' in r"`
Expected: route listesi basılır, assertion geçer.

- [ ] **Step 9: Commit**

```bash
git add src/ai_pipeline/main.py
git commit -m "refactor: rewire pattern endpoints through patterns.py"
```

---

## Task 7: `orchestrator.py` — `decide()` + `handle_assist()`

Orchestrator'ın kalbi: niyet sınıflandırma + dispatch. Bu task **Task 6'dan önce** veya sonra uygulanabilir; `main.py`'ye dokunmaz.

**Files:**
- Create: `src/ai_pipeline/orchestrator.py`
- Test: `tests/test_orchestrator.py` (Create)

- [ ] **Step 1: Write the failing test**

`tests/test_orchestrator.py`:

```python
"""orchestrator.handle_assist — dispatch mantığı (decide + pattern'lar mock'lanır)."""

import asyncio

from ai_pipeline import orchestrator, patterns
from ai_pipeline.schemas import (
    BuddyAnalysis,
    FeedbackIssue,
    FeedbackResult,
    OrchestratorDecision,
    SportDescription,
    VoiceAnswer,
)


def _run(**kwargs):  # noqa: ANN003, ANN202
    base = {
        "event": "voice",
        "transcript": None,
        "audio_bytes": None,
        "audio_mime": "audio/wav",
        "frame_bytes": None,
        "frame_mime": "image/jpeg",
        "screen_context": "idle",
        "lat": None,
        "lon": None,
        "recent_guidance": None,
        "nearby_tickets_json": None,
    }
    base.update(kwargs)
    return asyncio.run(orchestrator.handle_assist(**base))


def _mock_decide(monkeypatch, decision) -> None:  # noqa: ANN001
    async def fake(transcript, screen_context, nearby):  # noqa: ANN001, ANN202
        return decision

    monkeypatch.setattr(orchestrator, "decide", fake)


def test_buddy_frame_routes_to_pattern_a(monkeypatch) -> None:  # noqa: ANN001
    async def fake_buddy(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
        return BuddyAnalysis(speak_text="Önünde çukur var.", priority="high")

    monkeypatch.setattr(patterns, "analyze_buddy_frame", fake_buddy)
    resp = _run(event="buddy_frame", frame_bytes=b"x")
    assert resp.event == "buddy_frame"
    assert resp.intent == "buddy_frame"
    assert resp.speak_text == "Önünde çukur var."
    assert resp.priority == "high"
    assert resp.ui_action == "none"


def test_voice_no_input_is_unknown() -> None:
    resp = _run(event="voice")
    assert resp.intent == "unknown"
    assert "anlayamad" in resp.speak_text.lower()


def test_voice_stop_returns_empty(monkeypatch) -> None:  # noqa: ANN001
    _mock_decide(monkeypatch, OrchestratorDecision(intent="stop"))
    resp = _run(event="voice", transcript="sus")
    assert resp.intent == "stop"
    assert resp.speak_text == ""


def test_voice_ask_routes_to_pattern_d(monkeypatch) -> None:  # noqa: ANN001
    _mock_decide(monkeypatch, OrchestratorDecision(intent="ask"))

    async def fake_voice(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
        return VoiceAnswer(answer_speak_text="Önünde açık bir yol var.")

    monkeypatch.setattr(patterns, "answer_voice", fake_voice)
    resp = _run(event="voice", transcript="önümde ne var", frame_bytes=b"x")
    assert resp.intent == "ask"
    assert resp.speak_text == "Önünde açık bir yol var."


def test_voice_describe_sport_routes_to_pattern_c(monkeypatch) -> None:  # noqa: ANN001
    _mock_decide(monkeypatch, OrchestratorDecision(intent="describe_sport"))

    async def fake_sport(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
        return SportDescription(equipment_detected=True, speak_text="Bu bir bacak presi.")

    monkeypatch.setattr(patterns, "describe_sport", fake_sport)
    resp = _run(event="voice", transcript="bu aleti anlat", frame_bytes=b"x")
    assert resp.intent == "describe_sport"
    assert resp.ui_action == "switch_to_sport"
    assert resp.speak_text == "Bu bir bacak presi."


def test_voice_describe_sport_without_frame_asks_camera(monkeypatch) -> None:  # noqa: ANN001
    _mock_decide(monkeypatch, OrchestratorDecision(intent="describe_sport"))
    resp = _run(event="voice", transcript="bu aleti anlat")
    assert resp.intent == "describe_sport"
    assert "kamera" in resp.speak_text.lower()


def test_voice_report_issue_builds_ticket(monkeypatch) -> None:  # noqa: ANN001
    _mock_decide(
        monkeypatch,
        OrchestratorDecision(
            intent="report_issue",
            confidence=0.9,
            nearby_tickets_speak_text="Yakında bir engel var.",
        ),
    )

    async def fake_feedback(images):  # noqa: ANN001, ANN202
        return FeedbackResult(
            has_damage=True,
            issues=[
                FeedbackIssue(type="pothole", severity="high", description_tr="Derin çukur var.")
            ],
        )

    monkeypatch.setattr(patterns, "categorize_feedback", fake_feedback)
    resp = _run(event="voice", transcript="bunu bildir", frame_bytes=b"x", lat=40.9, lon=29.0)
    assert resp.intent == "report_issue"
    assert resp.ui_action == "open_ticket"
    assert resp.ticket is not None
    assert resp.ticket.issue_type == "pothole"
    assert resp.ticket.lat == 40.9
    assert "Derin çukur var." in resp.speak_text
    assert "Yakında bir engel var." in resp.speak_text


def test_voice_report_issue_no_damage(monkeypatch) -> None:  # noqa: ANN001
    _mock_decide(monkeypatch, OrchestratorDecision(intent="report_issue", confidence=0.9))

    async def fake_feedback(images):  # noqa: ANN001, ANN202
        return FeedbackResult(has_damage=False, issues=[])

    monkeypatch.setattr(patterns, "categorize_feedback", fake_feedback)
    resp = _run(event="voice", transcript="bunu bildir", frame_bytes=b"x")
    assert resp.ui_action == "none"
    assert resp.ticket is None


def test_voice_report_issue_low_confidence_clarifies(monkeypatch) -> None:  # noqa: ANN001
    _mock_decide(monkeypatch, OrchestratorDecision(intent="report_issue", confidence=0.2))

    async def fake_feedback(images):  # noqa: ANN001, ANN202
        raise AssertionError("düşük confidence'ta Pattern B çağrılmamalı")

    monkeypatch.setattr(patterns, "categorize_feedback", fake_feedback)
    resp = _run(event="voice", transcript="şükür", frame_bytes=b"x")
    assert resp.intent == "report_issue"
    assert resp.ui_action == "none"
    assert resp.ticket is None
    assert "emin" in resp.speak_text.lower()


def test_voice_nearby_tickets_summary(monkeypatch) -> None:  # noqa: ANN001
    _mock_decide(
        monkeypatch,
        OrchestratorDecision(
            intent="nearby_tickets", nearby_tickets_speak_text="Yakında iki sorun var."
        ),
    )
    resp = _run(event="voice", transcript="etrafımda sorun var mı")
    assert resp.intent == "nearby_tickets"
    assert resp.speak_text == "Yakında iki sorun var."


def test_voice_switch_mode(monkeypatch) -> None:  # noqa: ANN001
    _mock_decide(
        monkeypatch,
        OrchestratorDecision(intent="switch_mode", target_mode="sport", confidence=0.9),
    )
    resp = _run(event="voice", transcript="spor moduna geç")
    assert resp.intent == "switch_mode"
    assert resp.ui_action == "switch_to_sport"


def test_voice_switch_mode_missing_target_clarifies(monkeypatch) -> None:  # noqa: ANN001
    # target_mode "none" → istemeden Buddy'ye geçirilmemeli (Codex F3)
    _mock_decide(
        monkeypatch,
        OrchestratorDecision(intent="switch_mode", target_mode="none", confidence=0.95),
    )
    resp = _run(event="voice", transcript="moda geç")
    assert resp.intent == "switch_mode"
    assert resp.ui_action == "none"
    assert "mod" in resp.speak_text.lower()


def test_bad_nearby_tickets_json_does_not_crash(monkeypatch) -> None:  # noqa: ANN001
    async def fake_buddy(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
        return BuddyAnalysis()

    monkeypatch.setattr(patterns, "analyze_buddy_frame", fake_buddy)
    resp = _run(event="buddy_frame", frame_bytes=b"x", nearby_tickets_json="{bozuk json")
    assert resp.event == "buddy_frame"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_orchestrator.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'ai_pipeline.orchestrator'`

- [ ] **Step 3: Create `orchestrator.py`**

`src/ai_pipeline/orchestrator.py`:

```python
"""Orchestrator — UI ile AI patternleri arasındaki tek karar/yönlendirme katmanı.

`event=buddy_frame` deterministiktir (LLM yok → Pattern A). `event=voice` tek bir sıkı
orchestrator LLM çağrısıyla sınıflandırılır (temperature 0), sonra ilgili pattern'a
yönlendirilir. Servis stateless; çevre ticket'ları UI her istekte gönderir.
"""

from __future__ import annotations

import json
import logging

from pydantic import ValidationError

from ai_pipeline import gemini, patterns, stt
from ai_pipeline.config import settings
from ai_pipeline.gemini import Image
from ai_pipeline.prompts import ORCHESTRATOR_SYSTEM, orchestrator_user_prompt
from ai_pipeline.schemas import (
    AssistResponse,
    NearbyTicket,
    OrchestratorDecision,
    Ticket,
)

logger = logging.getLogger("ai_pipeline.orchestrator")

_NO_INPUT = "Anlayamadım, tekrar söyler misin?"
_UNKNOWN = "Tam anlayamadım, ne yapmak istediğini söyler misin?"


def parse_nearby_tickets(raw: str | None) -> list[NearbyTicket]:
    """UI'nin gönderdiği JSON dizisini NearbyTicket listesine çevirir; bozuksa boş döner."""
    if not raw or not raw.strip():
        return []
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, ValueError) as err:
        logger.warning("nearby_tickets JSON parse edilemedi: %r", err)
        return []
    if not isinstance(data, list):
        logger.warning("nearby_tickets bir dizi değil: %s", type(data).__name__)
        return []
    tickets: list[NearbyTicket] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        try:
            tickets.append(NearbyTicket.model_validate(item))
        except ValidationError as err:
            logger.warning("nearby_ticket öğesi atlandı: %r", err)
    return tickets


async def decide(
    transcript: str,
    screen_context: str,
    nearby: list[NearbyTicket],
) -> OrchestratorDecision:
    """Sesli ifadeyi sıkı orchestrator prompt'u + temperature 0 ile sınıflandırır.

    LLM başarısızsa intent=unknown döner (güvenli fallback).
    """
    model = patterns.model_for("orchestrator")
    if model is None:
        return OrchestratorDecision()
    result = await gemini.generate_structured(
        model=model,
        system_instruction=ORCHESTRATOR_SYSTEM,
        user_prompt=orchestrator_user_prompt(transcript, screen_context, nearby),
        response_schema=OrchestratorDecision,
        images=None,
        temperature=settings.orchestrator_temperature,
    )
    if result is None:
        logger.warning("orchestrator decide: LLM başarısız — unknown'a düşülüyor")
        return OrchestratorDecision()
    return result


async def handle_assist(
    *,
    event: str,
    transcript: str | None,
    audio_bytes: bytes | None,
    audio_mime: str,
    frame_bytes: bytes | None,
    frame_mime: str,
    screen_context: str,
    lat: float | None,
    lon: float | None,
    recent_guidance: str | None,
    nearby_tickets_json: str | None,
) -> AssistResponse:
    """POST /v1/assist giriş noktası — event'e göre deterministik veya sesli akışa yönlendirir."""
    nearby = parse_nearby_tickets(nearby_tickets_json)
    if event == "buddy_frame":
        return await _handle_buddy_frame(frame_bytes, frame_mime, lat, lon, recent_guidance, nearby)
    if event == "voice":
        return await _handle_voice(
            transcript, audio_bytes, audio_mime, frame_bytes, frame_mime,
            screen_context, lat, lon, nearby,
        )
    logger.error("Bilinmeyen event: %s", event)
    return AssistResponse(event=event, intent="unknown", speak_text=_NO_INPUT)


async def _handle_buddy_frame(
    frame_bytes: bytes | None,
    frame_mime: str,
    lat: float | None,
    lon: float | None,
    recent_guidance: str | None,
    nearby: list[NearbyTicket],
) -> AssistResponse:
    if frame_bytes is None:
        logger.warning("buddy_frame: frame yok")
        return AssistResponse(event="buddy_frame", intent="buddy_frame")
    known = [ticket.model_dump() for ticket in nearby]
    analysis = await patterns.analyze_buddy_frame(
        frame_bytes, frame_mime, lat, lon, known, recent_guidance
    )
    return AssistResponse(
        event="buddy_frame",
        intent="buddy_frame",
        speak_text=analysis.speak_text,
        priority=analysis.priority,
        ui_action="none",
        data=analysis.model_dump(),
    )


async def _handle_voice(
    transcript: str | None,
    audio_bytes: bytes | None,
    audio_mime: str,
    frame_bytes: bytes | None,
    frame_mime: str,
    screen_context: str,
    lat: float | None,
    lon: float | None,
    nearby: list[NearbyTicket],
) -> AssistResponse:
    text = (transcript or "").strip()
    if not text and audio_bytes is not None:
        text = (await stt.transcribe(audio_bytes, audio_mime) or "").strip()
    if not text:
        logger.warning("voice: transcript yok / STT başarısız")
        return AssistResponse(event="voice", intent="unknown", speak_text=_NO_INPUT)

    decision = await decide(text, screen_context, nearby)
    images: list[Image] = [(frame_bytes, frame_mime)] if frame_bytes is not None else []
    intent = decision.intent

    if intent == "ask":
        voice = await patterns.answer_voice(text, screen_context, images, lat, lon)
        ui_action = (
            voice.requires_action
            if voice.requires_action in ("switch_to_buddy", "switch_to_sport")
            else "none"
        )
        return AssistResponse(
            event="voice", intent=intent, speak_text=voice.answer_speak_text,
            ui_action=ui_action, data=voice.model_dump(),
        )

    if intent == "describe_sport":
        if frame_bytes is None:
            return AssistResponse(
                event="voice", intent=intent,
                speak_text="Kameranı önündeki alete doğru tutar mısın?",
            )
        sport = await patterns.describe_sport(frame_bytes, frame_mime)
        return AssistResponse(
            event="voice", intent=intent, speak_text=sport.speak_text,
            ui_action="switch_to_sport", data=sport.model_dump(),
        )

    if intent == "report_issue":
        # Geri-dönüşsüz yan etki (n8n ticket) — düşük confidence'ta netleştir (Codex F1).
        if decision.confidence < settings.orchestrator_min_confidence:
            return AssistResponse(
                event="voice", intent=intent,
                speak_text="Bir sorunu bildirmek istediğinden tam emin olamadım. "
                "İstiyorsan 'şuradaki sorunu kaydet' de.",
            )
        return await _handle_report(frame_bytes, frame_mime, lat, lon, decision)

    if intent == "nearby_tickets":
        speak = decision.nearby_tickets_speak_text.strip() or "Yakında kayıtlı bir sorun yok."
        return AssistResponse(event="voice", intent=intent, speak_text=speak)

    if intent == "switch_mode":
        # target_mode "none" veya düşük confidence → istemeden mod değiştirme (Codex F1+F3).
        if (
            decision.confidence < settings.orchestrator_min_confidence
            or decision.target_mode == "none"
        ):
            return AssistResponse(
                event="voice", intent=intent,
                speak_text="Hangi moda geçmek istediğini tam anlamadım. "
                "'Spor moduna geç' ya da 'yürüyüş moduna geç' der misin?",
            )
        if decision.target_mode == "sport":
            return AssistResponse(
                event="voice", intent=intent, speak_text="Spor moduna geçiyorum.",
                ui_action="switch_to_sport",
            )
        return AssistResponse(
            event="voice", intent=intent, speak_text="Yürüyüş moduna geçiyorum.",
            ui_action="switch_to_buddy",
        )

    if intent == "stop":
        return AssistResponse(event="voice", intent=intent, speak_text="")

    return AssistResponse(event="voice", intent="unknown", speak_text=_UNKNOWN)


async def _handle_report(
    frame_bytes: bytes | None,
    frame_mime: str,
    lat: float | None,
    lon: float | None,
    decision: OrchestratorDecision,
) -> AssistResponse:
    if frame_bytes is None:
        return AssistResponse(
            event="voice", intent="report_issue",
            speak_text="Kameran kapalı görünüyor, sorunu kaydedemedim.",
        )
    feedback = await patterns.categorize_feedback([(frame_bytes, frame_mime)])
    if not feedback.issues:
        return AssistResponse(
            event="voice", intent="report_issue",
            speak_text="Önünde kaydedilecek belirgin bir sorun göremedim.",
        )
    primary = feedback.issues[0]
    ticket = Ticket(
        issue_type=primary.type,
        severity=primary.severity,
        affected_users=primary.affected_users,
        description_tr=primary.description_tr,
        confidence=primary.confidence,
        lat=lat,
        lon=lon,
    )
    speak = f"Önündeki sorunu kaydediyorum. {primary.description_tr}".strip()
    summary = decision.nearby_tickets_speak_text.strip()
    if summary:
        speak = f"{speak} {summary}"
    return AssistResponse(
        event="voice", intent="report_issue", speak_text=speak, priority="medium",
        ui_action="open_ticket", ticket=ticket, data=feedback.model_dump(),
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_orchestrator.py -v`
Expected: PASS (13 passed)

- [ ] **Step 5: Commit**

```bash
git add src/ai_pipeline/orchestrator.py tests/test_orchestrator.py
git commit -m "feat: add orchestrator decide + assist dispatch"
```

---

## Task 8: `POST /v1/assist` endpoint'i

UI'nin tek giriş noktası. `main.py`'ye eklenir; gövdesi ince — sadece form parse + `orchestrator.handle_assist`.

**Files:**
- Modify: `src/ai_pipeline/main.py` (import + yeni endpoint)
- Test: `tests/test_assist_endpoint.py` (Create)

- [ ] **Step 1: `orchestrator` import'unu doğrula**

`main.py` import bloğunda `from ai_pipeline import orchestrator, patterns` satırının olduğundan emin ol (Task 6 Step 1'de eklendi). Yoksa ekle.

- [ ] **Step 2: Write the failing test**

`tests/test_assist_endpoint.py`:

```python
"""POST /v1/assist — endpoint entegrasyon testi (orchestrator handle_assist mock'lanır)."""

from fastapi.testclient import TestClient

from ai_pipeline import orchestrator
from ai_pipeline.main import app
from ai_pipeline.schemas import AssistResponse


def test_assist_endpoint_returns_envelope(monkeypatch) -> None:  # noqa: ANN001
    async def fake_handle(**kwargs):  # noqa: ANN003, ANN202
        assert kwargs["event"] == "voice"
        assert kwargs["transcript"] == "sus"
        return AssistResponse(event="voice", intent="stop", speak_text="")

    monkeypatch.setattr(orchestrator, "handle_assist", fake_handle)
    client = TestClient(app)
    resp = client.post("/v1/assist", data={"event": "voice", "transcript": "sus"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "stop"
    assert body["ui_action"] == "none"


def test_assist_endpoint_passes_frame(monkeypatch) -> None:  # noqa: ANN001
    async def fake_handle(**kwargs):  # noqa: ANN003, ANN202
        assert kwargs["frame_bytes"] == b"jpegdata"
        return AssistResponse(event="buddy_frame", intent="buddy_frame")

    monkeypatch.setattr(orchestrator, "handle_assist", fake_handle)
    client = TestClient(app)
    resp = client.post(
        "/v1/assist",
        data={"event": "buddy_frame"},
        files={"frame": ("f.jpg", b"jpegdata", "image/jpeg")},
    )
    assert resp.status_code == 200
    assert resp.json()["event"] == "buddy_frame"
```

- [ ] **Step 3: Run test to verify it fails**

Run: `uv run pytest tests/test_assist_endpoint.py -v`
Expected: FAIL — 404 Not Found (`/v1/assist` henüz yok)

- [ ] **Step 4: `/v1/assist` endpoint'ini ekle**

`main.py` — `/v1/buddy` endpoint'inden hemen önce (mantıksal grup: önce orchestrator) ekle:

```python
@app.post("/v1/assist", response_model=AssistResponse)
async def assist(
    event: Annotated[str, Form(description="voice | buddy_frame")],
    transcript: Annotated[str | None, Form(description="Sesli ifade (yoksa audio)")] = None,
    audio: Annotated[UploadFile | None, File(description="Ses — transcript yoksa STT")] = None,
    frame: Annotated[UploadFile | None, File(description="O anki kamera karesi")] = None,
    screen_context: Annotated[str, Form()] = "idle",
    lat: Annotated[float | None, Form()] = None,
    lon: Annotated[float | None, Form()] = None,
    recent_guidance: Annotated[str | None, Form()] = None,
    nearby_tickets: Annotated[
        str | None, Form(description="Çevredeki kayıtlı ticket'lar — JSON dizi")
    ] = None,
) -> AssistResponse:
    """Orchestrator — UI'nin AI ile tek giriş noktası (spec genişletmesi; bkz. AGENTS.md §4).

    `event=buddy_frame` deterministik (Pattern A). `event=voice` orchestrator LLM ile
    sınıflandırılıp ilgili pattern'a yönlendirilir. UI her isteğe `nearby_tickets`
    (kullanıcının çevresindeki kayıtlı ticket'lar) ekler; servis stateless.
    """
    frame_bytes = await frame.read() if frame is not None else None
    frame_mime = (frame.content_type or "image/jpeg") if frame is not None else "image/jpeg"
    audio_bytes = await audio.read() if audio is not None else None
    audio_mime = (audio.content_type or "audio/wav") if audio is not None else "audio/wav"
    return await orchestrator.handle_assist(
        event=event,
        transcript=transcript,
        audio_bytes=audio_bytes,
        audio_mime=audio_mime,
        frame_bytes=frame_bytes,
        frame_mime=frame_mime,
        screen_context=screen_context,
        lat=lat,
        lon=lon,
        recent_guidance=recent_guidance,
        nearby_tickets_json=nearby_tickets,
    )
```

- [ ] **Step 5: Run test to verify it passes**

Run: `uv run pytest tests/test_assist_endpoint.py -v`
Expected: PASS (2 passed)

- [ ] **Step 6: Commit**

```bash
git add src/ai_pipeline/main.py tests/test_assist_endpoint.py
git commit -m "feat: add POST /v1/assist orchestrator endpoint"
```

---

## Task 9: Test konsoluna Orchestrator bölümü

`test.html`'e `/v1/assist`'i elle test eden bir bölüm — sesli ifade yaz/kaydet, `event`/`intent`/`ui_action`/`ticket` görünür, `speak_text` seslendirilir, `nearby_tickets` simüle edilir.

**Files:**
- Modify: `static/test.html`
- Test: Manuel (tarayıcı).

- [ ] **Step 1: HTML bölümünü ekle**

`test.html` — ilk `<section>` (Buddy Mode) etiketinden **önce** ekle (orchestrator en üstte, ana akış olduğu için):

```html
<section>
  <h2>🎛️ Orchestrator — <code>/v1/assist</code></h2>
  <label>Sesli ifade — yaz ya da mikrofonla kaydet</label>
  <textarea id="askText" rows="2">Bu aleti anlat</textarea>
  <div class="row">
    <div><label>screen_context</label>
      <select id="askCtx">
        <option>idle</option><option>buddy_mode</option><option>sport_mode</option>
      </select>
    </div>
    <div><label>Frame (opsiyonel)</label><input type="file" id="askFrame" accept="image/*" /></div>
  </div>
  <label>nearby_tickets (JSON dizi — UI'nin gönderdiği çevre ticket'ları simülasyonu)</label>
  <textarea id="askNearby" rows="3">[{"issue_type":"pothole","severity":"high","description_tr":"Derin çukur var.","distance_m":18}]</textarea>
  <div class="actions">
    <button onclick="assist()">Gönder</button>
    <button class="sec" id="assistRec" onclick="toggleAssistRecord()">🎙 Kaydet</button>
    <button class="sec" id="assistListen" style="display:none" onclick="playTTS(lastSpeak.assist)">🔊 Dinle</button>
  </div>
  <div id="assistRecStatus" class="muted" style="margin-top:.4rem"></div>
  <div class="out" id="assistOut"></div>
</section>
```

- [ ] **Step 2: JavaScript fonksiyonlarını ekle**

`test.html` — `<script>` bloğunun sonuna (kapanış `</script>`'ten önce) ekle:

```javascript
// --- Orchestrator /v1/assist ---

let assistRecorder = null;
let assistChunks = [];
let assistBlob = null;

async function toggleAssistRecord() {
  const btn = document.getElementById("assistRec");
  const status = document.getElementById("assistRecStatus");
  if (assistRecorder && assistRecorder.state === "recording") {
    assistRecorder.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    assistChunks = [];
    assistRecorder = new MediaRecorder(stream);
    assistRecorder.ondataavailable = (e) => { if (e.data.size) assistChunks.push(e.data); };
    assistRecorder.onstop = () => {
      assistBlob = new Blob(assistChunks, { type: assistRecorder.mimeType });
      stream.getTracks().forEach((tr) => tr.stop());
      btn.textContent = "🎙 Kaydet";
      btn.className = "sec";
      status.textContent = "Ses hazır (" + Math.round(assistBlob.size / 1024) +
        " KB) — 'Gönder'e bas.";
    };
    assistRecorder.start();
    btn.textContent = "⏹ Durdur";
    btn.className = "rec";
    status.textContent = "🔴 Kaydediliyor...";
  } catch (e) {
    status.textContent = "Mikrofon erişilemedi: " + e;
  }
}

async function assist() {
  const out = document.getElementById("assistOut");
  out.textContent = "İşleniyor... (orchestrator)";
  const fd = new FormData();
  fd.append("event", "voice");
  fd.append("screen_context", document.getElementById("askCtx").value);

  if (assistBlob) {
    fd.append("audio", assistBlob, "kayit.webm");
    assistBlob = null;
    document.getElementById("assistRecStatus").textContent = "";
  } else {
    const text = document.getElementById("askText").value.trim();
    if (!text) { alert("Sesli ifade yaz ya da kaydet."); out.textContent = ""; return; }
    fd.append("transcript", text);
  }

  const frameFile = document.getElementById("askFrame").files[0];
  if (frameFile) fd.append("frame", frameFile);
  const nearby = document.getElementById("askNearby").value.trim();
  if (nearby) fd.append("nearby_tickets", nearby);

  const started = performance.now();
  try {
    const r = await fetch("/v1/assist", { method: "POST", body: fd });
    const data = await r.json();
    out.textContent = JSON.stringify(data, null, 2) +
      "\n\n— " + r.status + ", " + Math.round(performance.now() - started) + " ms";
    lastSpeak.assist = data.speak_text || "";
    document.getElementById("assistListen").style.display =
      lastSpeak.assist ? "inline-block" : "none";
    if (lastSpeak.assist) speak(lastSpeak.assist);
  } catch (e) {
    out.textContent = "HATA: " + e;
  }
}
```

- [ ] **Step 3: Manuel doğrulama**

Servisi başlat (zaten `--reload` ile çalışıyorsa atla): `uv run uvicorn ai_pipeline.main:app --reload`

Tarayıcıda `http://localhost:8000/test` aç. Orchestrator bölümünde:
1. "Bu aleti anlat" + bir spor aleti fotoğrafı, **screen_context `idle` bırakılarak** → Gönder → `intent: describe_sport`, `ui_action: switch_to_sport` (Codex F2 — idle'da bile spor anlatımına gitmeli).
2. "Bunu bildir" + bir çukur fotoğrafı → `intent: report_issue`, `ui_action: open_ticket`, `ticket` dolu (`source: user_visually_impaired`), `speak_text` kayıt onayı + "Derin çukur var." (nearby özeti).
3. "Etrafımda sorun var mı" → `intent: nearby_tickets`, `speak_text` çevre özeti.
4. "Sus" → `intent: stop`, `speak_text` boş.

- [ ] **Step 4: Commit**

```bash
git add static/test.html
git commit -m "feat: add orchestrator section to test console"
```

---

## Task 10: Dokümantasyon — `AGENTS.md`

Orchestrator katmanı `AGENTS.md`'ye işlenir: §4 (yeni satır), §5 (kontrat), §12 (versiyon).

**Files:**
- Modify: `AGENTS.md`
- Test: Yok (dokümantasyon).

- [ ] **Step 1: §4 — Orchestrator notu ekle**

`AGENTS.md` §4'teki patern tablosunun **altına**, "Kritik kurallar" bloğundan önce ekle:

```markdown
**Orchestrator (spec genişletmesi):** UI ile AI arasında tek giriş noktası `POST /v1/assist`.
İki event: `buddy_frame` (deterministik → Pattern A) ve `voice` (orchestrator LLM ile niyet
sınıflandırma → Pattern A/B/C/D'ye dispatch). Sesli ticket akışı: kullanıcı "şunu bildir"
derse Pattern B → `ticket` payload + çevre özeti tek yanıtta döner; UI bunu n8n'e iletir.
Servis stateless — UI her isteğe `nearby_tickets` ekler. Detay: `docs/superpowers/plans/`.
```

- [ ] **Step 2: §5 — kontrat tablosuna `/v1/assist` ekle**

`AGENTS.md` §5 tablosunun **en üstüne** (ilk satır olarak, `POST /v1/buddy`'den önce) ekle:

```markdown
| `POST /v1/assist` | A/B/C/D | `event`, `transcript`\|`audio`, `frame?`, `screen_context`, `lat?`, `lon?`, `recent_guidance?`, `nearby_tickets?` | `AssistResponse` JSON |
```

§5'in `recent_guidance` paragrafının altına ekle:

```markdown
**Orchestrator (`/v1/assist`) — production tek endpoint:** UI tüm AI akışları için bunu
kullanır. `event=voice` → orchestrator LLM (sıkı prompt, `temperature=0`) niyeti
sınıflandırır; `event=buddy_frame` → doğrudan Pattern A. Yanıt zarfı `AssistResponse`:
`speak_text`, `priority`, `ui_action` (`none`/`open_ticket`/`switch_to_buddy`/`switch_to_sport`),
`ticket?`, `data?`. Tek tek pattern endpoint'leri (`/v1/buddy` vb.) test/izole kalite testi
için durur; ikisi de `patterns.py`'yi çağırır (DRY).
```

- [ ] **Step 3: §12 — versiyon notu ekle**

`AGENTS.md` §12'nin sonuna ekle:

```markdown
- **v1.2 — 17.05.2026** — Orchestrator katmanı: tek endpoint `POST /v1/assist` (2 event), sesli niyet sınıflandırma + dispatch. Pattern mantığı `patterns.py`'ye çıkarıldı (DRY); `orchestrator.py` eklendi. `issue` (VLM-içi) / `ticket` (boundary) ayrımı. `generate_structured`'a `temperature`.
```

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document orchestrator layer in AGENTS.md"
```

---

## Task 11: `docs/api-contract.md` — frontend kontratını güncelle

`docs/api-contract.md` frontend ekibinin baktığı kontrat dosyası ve **tamamı eski** (bu seanski `/v1/` rename'i hiç yansımamış + `/v1/assist` yok). Güncellenir.

**Files:**
- Modify: `docs/api-contract.md`
- Test: Yok (dokümantasyon).

- [ ] **Step 1: Endpoint adlarını güncelle**

`docs/api-contract.md`'de şu birebir değişiklikleri uygula (her biri tekil eşleşir):

| Eski metin | Yeni metin |
|---|---|
| `` - `/tts` başarılıysa binary audio döner`` | `` - `/v1/speech/synthesize` başarılıysa binary audio döner`` |
| `` ## `POST /buddy/analyze` `` | `` ## `POST /v1/buddy` `` |
| `http://localhost:8000/buddy/analyze \` | `http://localhost:8000/v1/buddy \` |
| `` ## `POST /buddy/analyze-video` `` | `` ## `POST /dev/buddy-video` (dev-only, OpenAPI'de gizli) `` |
| `` ## `POST /voice/ask` `` | `` ## `POST /v1/voice` `` |
| `http://localhost:8000/voice/ask \` | `http://localhost:8000/v1/voice \` |
| `` ## `POST /stt` `` | `` ## `POST /v1/speech/transcribe` `` |
| `http://localhost:8000/stt \` | `http://localhost:8000/v1/speech/transcribe \` |
| `` ## `POST /feedback/categorize` `` | `` ## `POST /v1/feedback` `` |
| `http://localhost:8000/feedback/categorize \` | `http://localhost:8000/v1/feedback \` |
| `` ## `POST /sport/describe` `` | `` ## `POST /v1/sport` `` |
| `http://localhost:8000/sport/describe \` | `http://localhost:8000/v1/sport \` |
| `` ## `POST /tts` `` | `` ## `POST /v1/speech/synthesize` `` |
| `http://localhost:8000/tts \` | `http://localhost:8000/v1/speech/synthesize \` |

- [ ] **Step 2: `/v1/buddy` bölümüne `recent_guidance` alanını ekle**

`/v1/buddy` (eski `/buddy/analyze`) istek tablosunda `lon` satırının altına ekle:

```markdown
| `recent_guidance` | string | hayır | Realtime akışta son söylenen `speak_text`'ler (satırla ayrılmış); model tekrarı önler |
```

- [ ] **Step 3: `/v1/assist` bölümünü ekle**

`## \`GET /test\`` bölümünün **hemen ardına** (ana endpoint en üstte) ekle:

````markdown
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
````

- [ ] **Step 4: Commit**

```bash
git add docs/api-contract.md
git commit -m "docs: update api-contract for /v1 endpoints + orchestrator"
```

---

## Task 12: Final doğrulama

**Files:** Yok — bütün servis doğrulanır.

- [ ] **Step 1: Tüm test paketi**

Run: `uv run pytest -q`
Expected: PASS — tüm testler geçer (test_health, test_geo, test_gemini_config, test_config, test_schemas, test_prompts, test_patterns, test_orchestrator, test_assist_endpoint).

- [ ] **Step 2: Lint**

Run: `uv run ruff check src/ tests/`
Expected: `All checks passed!`

- [ ] **Step 3: Route doğrulama**

Run: `uv run python -c "from ai_pipeline.main import app; r=sorted(x.path for x in app.routes if hasattr(x,'path')); print(r); assert '/v1/assist' in r"`
Expected: route listesi basılır, `/v1/assist` mevcut.

- [ ] **Step 4: Canlı duman testi**

Servis `--reload` ile çalışıyorsa değişiklikleri almıştır. Çalışmıyorsa: `uv run uvicorn ai_pipeline.main:app --reload`

Run: `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/v1/assist -F "event=voice" -F "transcript=sus"`
Expected: `200`

(Gerçek Gemini çağrısı yapılır — `transcript=sus` → `intent=stop`, boş `speak_text`. Çıktıyı görmek için `-o /dev/null -w ...` yerine düz `curl -s` kullan.)

- [ ] **Step 5: Manuel — test konsolu**

`http://localhost:8000/test` → Orchestrator bölümü → Task 9 Step 3'teki 4 senaryoyu doğrula.

---

## Self-Review Notları

- **Spec kapsamı:** Orchestrator spec'te yok — bilinçli genişletme (`AGENTS.md §3` "spec'ten kabul edilen sapma" pattern'i). DB `source` enum'unda `user_visually_impaired` zaten var → görme engelli kullanıcının ticket açması spec'le tutarlı.
- **`issue`/`ticket`:** Mevcut `FeedbackIssue.type` (`IssueType`) → yeni `Ticket.issue_type` (aynı `IssueType` enum'u, DRY). DB kolon adı da `issue_type` (spec §5.3) — tutarlı.
- **Tip tutarlılığı:** `OrchestratorDecision.intent` ⊂ `Intent`; `VoiceAnswer.requires_action` değerleri (`switch_to_buddy`/`switch_to_sport`) ⊂ `UiAction` — dispatch'te doğrudan eşlenir.
- **Task sırası:** Task 7 (`orchestrator.py`) Task 6'daki `main.py` import'undan önce var olmalı. Önerilen uygulama sırası: 1 → 2 → 3 → 4 → 5 → 7 → 6 → 8 → 9 → 10 → 11 → 12.
- **Latency:** `voice` = orchestrator (flash-lite, ~0.5sn) + pattern (Pro). `buddy_frame` = yalnız pattern. "Kalite > latency" tercihiyle uyumlu.

## Codex Review — Round 1 (uygulandı)

Codex verdict: NEEDS_REVISION → 5 bulgu cross-check edildi:

- **F1 (HIGH, kabul):** `confidence` dispatch'te kullanılmıyordu → `orchestrator_min_confidence` config (Task 2); `report_issue`/`switch_mode` eşik altındaysa netleştirme döner, ticket/mod değişimi olmaz (Task 7) + testler.
- **F2 (HIGH, kısmi):** "text-only orchestrator sport bağlamını göremez" önermesi yanlış — `decide()` `screen_context` alıyor. Kabul: prompt'a "describe_sport context'ten bağımsız" satırı (Task 4) + manuel test senaryosu (Task 9). Red: sınıflandırıcıya frame verme (gereksiz).
- **F3 (MEDIUM, kabul):** `switch_mode` boş `target_mode` ile Buddy'ye geçiriyordu → yalnız `target_mode=="buddy"` ise geç, `"none"` → netleştir (Task 7) + test.
- **F4 (MEDIUM, kabul):** `Ticket.source` eksikti → `source="user_visually_impaired"` default (Task 3, spec §5.3).
- **F5 (MEDIUM, kabul):** `docs/api-contract.md` güncellenmiyordu → Task 11 eklendi (frontend kontratı `/v1/*` + `/v1/assist`).
