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
