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
