"""TTS provider dispatch — fal.ai primary, Gemini fallback/alternatif.

Provider seçimi ve tüm model/key/voice ayarları `config.py` üzerinden `.env`'den gelir.
"""

from __future__ import annotations

import asyncio
import json
import logging
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

from ai_pipeline.config import settings
from ai_pipeline.gemini import synthesize_tts as synthesize_gemini_tts

logger = logging.getLogger("ai_pipeline.tts")


@dataclass(frozen=True)
class SynthesizedAudio:
    data: bytes
    media_type: str


def _falai_key() -> str:
    """Hackathon ortamında kullanılan olası fal key env adlarını tek noktadan okur."""
    return (
        settings.fal_key.strip()
        or settings.fal_api_key.strip()
        or settings.falai_api_key.strip()
        or settings.falai.strip()
    )


def _falai_media_type() -> str:
    match settings.falai_tts_audio_format.lower():
        case "mp3":
            return "audio/mpeg"
        case "wav":
            return "audio/wav"
        case "flac":
            return "audio/flac"
        case "pcm":
            return "audio/L16"
        case _:
            return "application/octet-stream"


def _find_url(value: Any) -> str | None:
    """fal response'unda üretilen audio URL'ini schema varyasyonlarına toleranslı bulur."""
    if isinstance(value, dict):
        url = value.get("url")
        if isinstance(url, str) and url.startswith(("http://", "https://")):
            return url
        for child in value.values():
            found = _find_url(child)
            if found is not None:
                return found
    if isinstance(value, list):
        for child in value:
            found = _find_url(child)
            if found is not None:
                return found
    return None


def _call_falai_sync(text: str) -> SynthesizedAudio:
    key = _falai_key()
    if not key:
        raise RuntimeError("fal.ai API key bulunamadı; FAL_KEY veya FALAI_API_KEY ayarla")

    payload: dict[str, Any] = {
        "text": text,
        "output_format": settings.falai_tts_output_format,
        "voice_setting": {
            "voice_id": settings.falai_tts_voice_id,
            "speed": settings.falai_tts_speed,
            "vol": settings.falai_tts_volume,
            "pitch": settings.falai_tts_pitch,
            "emotion": settings.falai_tts_emotion,
        },
        "audio_setting": {
            # fal.ai şeması integer bekliyor — str() YOK (422 sebebi buydu).
            "sample_rate": settings.falai_tts_sample_rate_hz,
            "bitrate": settings.falai_tts_bitrate,
            "format": settings.falai_tts_audio_format,
            "channel": settings.falai_tts_channel,
        },
    }
    if settings.falai_tts_language_boost:
        payload["language_boost"] = settings.falai_tts_language_boost

    api_url = f"https://fal.run/{settings.falai_tts_model}"
    request = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Key {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=settings.falai_tts_timeout_seconds) as response:
        body = json.loads(response.read().decode("utf-8"))

    audio_url = _find_url(body)
    if audio_url is None:
        raise ValueError("fal.ai TTS response içinde audio url bulunamadı")

    with urllib.request.urlopen(audio_url, timeout=settings.falai_tts_timeout_seconds) as response:
        media_type = response.headers.get_content_type() or _falai_media_type()
        return SynthesizedAudio(data=response.read(), media_type=media_type)


async def synthesize_falai_tts(text: str) -> SynthesizedAudio | None:
    if not text.strip():
        return None

    last_err: Exception | None = None
    for attempt in range(settings.gemini_max_retries + 1):
        try:
            return await asyncio.to_thread(_call_falai_sync, text)
        except (urllib.error.URLError, TimeoutError, ValueError, RuntimeError) as err:
            last_err = err
            logger.warning("fal.ai TTS çağrısı başarısız (deneme %d): %r", attempt + 1, err)
            if attempt < settings.gemini_max_retries:
                await asyncio.sleep(1.0 * (attempt + 1))

    logger.error("fal.ai TTS tüm denemelerde başarısız: %r", last_err)
    return None


async def synthesize_tts(text: str) -> SynthesizedAudio | None:
    provider = settings.tts_provider.strip().lower()
    if provider in {"fal", "falai", "fal.ai"}:
        return await synthesize_falai_tts(text)
    if provider in {"gemini", "google"}:
        audio = await synthesize_gemini_tts(text)
        if audio is None:
            return None
        return SynthesizedAudio(data=audio, media_type="audio/wav")

    logger.error("Desteklenmeyen TTS provider: %s", settings.tts_provider)
    return None
