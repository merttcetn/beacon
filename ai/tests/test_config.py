"""Orchestrator config alanları testi."""

from ai_pipeline.config import settings


def test_orchestrator_model_resolves() -> None:
    assert settings.llm_model_for("orchestrator")
    assert settings.llm_provider_for("orchestrator") == "gemini"


def test_orchestrator_temperature_default() -> None:
    assert settings.orchestrator_temperature == 0.0


def test_orchestrator_min_confidence_in_range() -> None:
    assert 0.0 < settings.orchestrator_min_confidence <= 1.0
