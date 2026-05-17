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
