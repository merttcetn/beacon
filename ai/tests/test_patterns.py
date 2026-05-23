"""patterns.py — VLM pattern fonksiyonları (Gemini çağrısı mock'lanır)."""

import asyncio

from ai_pipeline import gemini, patterns
from ai_pipeline.schemas import BuddyAnalysis, FeedbackResult, SportDescription


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
    _mock_generate(
        monkeypatch, SportDescription(equipment_detected=True, speak_text="Bacak presi.")
    )
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
