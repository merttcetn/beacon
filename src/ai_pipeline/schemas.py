"""Pattern I/O Pydantic modelleri — Gemini structured output şemaları (spec §6)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Priority = Literal["low", "medium", "high", "critical"]
Severity = Literal["low", "medium", "high"]
ScreenContext = Literal["buddy_mode", "sport_mode", "idle"]
RequiresAction = Literal["none", "switch_to_buddy", "switch_to_sport"]
AffectedUser = Literal["wheelchair", "visually_impaired", "stroller", "elderly"]
IssueType = Literal[
    "pothole",
    "missing_ramp",
    "missing_tactile_paving",
    "obstacle",
    "uneven_surface",
    "water_pooling",
    "narrow_passage",
    "damaged_equipment",
    "other",
]


class BuddyAnalysis(BaseModel):
    """Pattern A — Buddy Mode VLM çıktısı (spec §6.1)."""

    immediate_warnings: list[str] = Field(
        default_factory=list,
        description="5 metre içindeki kritik tehlikeler, her biri tek cümle.",
    )
    upcoming_known_issues: list[str] = Field(
        default_factory=list,
        description="Bilinen yakın problemler, sade dille.",
    )
    speak_text: str = Field(
        default="",
        description="TTS'e gidecek Türkçe metin, 2-3 cümle. Kritik bir şey yoksa boş string.",
    )
    priority: Priority = "low"


class VoiceAnswer(BaseModel):
    """Pattern D — Voice Q&A VLM çıktısı (spec §6.4)."""

    interpreted_question: str = Field(
        default="",
        description="Modelin soruyu nasıl anladığı (debug amaçlı, kısa).",
    )
    answer_speak_text: str = Field(
        default="",
        description="TTS'e gidecek Türkçe sözlü cevap, 1-3 cümle.",
    )
    requires_camera: bool = False
    requires_action: RequiresAction = "none"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class FeedbackIssue(BaseModel):
    """Feedback'te tespit edilen tek bir erişilebilirlik problemi (spec §6.2)."""

    type: IssueType = "other"
    severity: Severity = "medium"
    affected_users: list[AffectedUser] = Field(default_factory=list)
    description_tr: str = Field(default="", description="Tek cümle Türkçe açıklama.")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class FeedbackResult(BaseModel):
    """Pattern B — Feedback Modu VLM çıktısı (spec §6.2)."""

    has_damage: bool = False
    issues: list[FeedbackIssue] = Field(default_factory=list)
    overall_accessibility_score: int = Field(default=10, ge=1, le=10)


class SportDescription(BaseModel):
    """Pattern C — Spor Modu VLM çıktısı (spec §6.3)."""

    equipment_detected: bool = False
    equipment_name_tr: str = ""
    muscle_groups: list[str] = Field(default_factory=list)
    usage_steps_tr: list[str] = Field(default_factory=list)
    safety_warnings_tr: list[str] = Field(default_factory=list)
    speak_text: str = Field(
        default="",
        description="TTS'e gidecek doğal, akıcı Türkçe paragraf, 4-6 cümle.",
    )


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
