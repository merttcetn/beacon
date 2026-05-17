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


def test_unknown_event_is_handled_gracefully() -> None:
    # Geçersiz event değeri — patlamadan unknown'a düşmeli.
    resp = _run(event="garbage")
    assert resp.event == "garbage"
    assert resp.intent == "unknown"
    assert resp.speak_text
