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
        timeout=settings.orchestrator_timeout_seconds,
        max_retries=settings.orchestrator_max_retries,
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
            transcript,
            audio_bytes,
            audio_mime,
            frame_bytes,
            frame_mime,
            screen_context,
            lat,
            lon,
            nearby,
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
    # known_issues kaynağı: orchestrator yolunda UI'nin gönderdiği `nearby_tickets`;
    # `/v1/buddy` endpoint'inde ise geo.nearby_issues() seed JSON'u. Aynı model alanı,
    # iki farklı kaynak — buddy_user_prompt ikisini de tolere eder.
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
        # VoiceAnswer.requires_action ("none"/"switch_to_buddy"/"switch_to_sport")
        # değerleri zaten UiAction alt kümesi — doğrudan eşlenir.
        ui_action = voice.requires_action
        return AssistResponse(
            event="voice",
            intent=intent,
            speak_text=voice.answer_speak_text,
            ui_action=ui_action,
            data=voice.model_dump(),
        )

    if intent == "describe_sport":
        if frame_bytes is None:
            return AssistResponse(
                event="voice",
                intent=intent,
                speak_text="Kameranı önündeki alete doğru tutar mısın?",
            )
        sport = await patterns.describe_sport(frame_bytes, frame_mime)
        return AssistResponse(
            event="voice",
            intent=intent,
            speak_text=sport.speak_text,
            ui_action="switch_to_sport",
            data=sport.model_dump(),
        )

    if intent == "report_issue":
        # Geri-dönüşsüz yan etki (n8n ticket) — düşük confidence'ta netleştir (Codex F1).
        if decision.confidence < settings.orchestrator_min_confidence:
            return AssistResponse(
                event="voice",
                intent=intent,
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
                event="voice",
                intent=intent,
                speak_text="Hangi moda geçmek istediğini tam anlamadım. "
                "'Spor moduna geç' ya da 'yürüyüş moduna geç' der misin?",
            )
        if decision.target_mode == "sport":
            return AssistResponse(
                event="voice",
                intent=intent,
                speak_text="Spor moduna geçiyorum.",
                ui_action="switch_to_sport",
            )
        return AssistResponse(
            event="voice",
            intent=intent,
            speak_text="Yürüyüş moduna geçiyorum.",
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
            event="voice",
            intent="report_issue",
            speak_text="Kameran kapalı görünüyor, sorunu kaydedemedim.",
        )
    feedback = await patterns.categorize_feedback([(frame_bytes, frame_mime)])
    if not feedback.issues:
        return AssistResponse(
            event="voice",
            intent="report_issue",
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
        event="voice",
        intent="report_issue",
        speak_text=speak,
        priority="medium",
        ui_action="open_ticket",
        ticket=ticket,
        data=feedback.model_dump(),
    )
