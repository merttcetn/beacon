"""STT (speech-to-text) — fal.ai ElevenLabs Scribe ile Türkçe transkripsiyon.

Tüm model/key/dil ayarları `config.py` üzerinden `.env`'den gelir. tts.py ile aynı
desen: ham `urllib`, `asyncio.to_thread` ile async, retry + backoff.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import urllib.error
import urllib.request
from typing import Any

from ai_pipeline.config import settings

logger = logging.getLogger("ai_pipeline.stt")


def _falai_key() -> str:
    """Hackathon ortamında kullanılan olası fal key env adlarını tek noktadan okur."""
    return (
        settings.fal_key.strip()
        or settings.fal_api_key.strip()
        or settings.falai_api_key.strip()
        or settings.falai.strip()
    )


def _extract_transcript(value: Any) -> str | None:
    """fal/Scribe response'undan transcript metnini schema varyasyonlarına toleranslı bulur."""
    if isinstance(value, dict):
        for key in ("text", "transcript", "transcription"):
            found = value.get(key)
            if isinstance(found, str) and found.strip():
                return found.strip()
        for child in value.values():
            found = _extract_transcript(child)
            if found is not None:
                return found
    if isinstance(value, list):
        for child in value:
            found = _extract_transcript(child)
            if found is not None:
                return found
    return None


def _call_falai_stt_sync(audio_bytes: bytes, mime: str) -> str:
    key = _falai_key()
    if not key:
        raise RuntimeError("fal.ai API key bulunamadı; FAL_KEY veya FALAI_API_KEY ayarla")

    # fal.ai dosya girdileri base64 data URI kabul eder — ayrı upload adımı gerekmez.
    data_uri = f"data:{mime};base64," + base64.b64encode(audio_bytes).decode("ascii")
    payload: dict[str, Any] = {"audio_url": data_uri}
    if settings.falai_stt_language.strip():
        payload["language_code"] = settings.falai_stt_language.strip()

    request = urllib.request.Request(
        f"https://fal.run/{settings.falai_stt_model}",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Key {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=settings.falai_stt_timeout_seconds) as response:
        body = json.loads(response.read().decode("utf-8"))

    transcript = _extract_transcript(body)
    if transcript is None:
        raise ValueError("fal.ai STT response içinde transcript bulunamadı")
    return transcript


async def transcribe(audio_bytes: bytes, mime: str = "audio/wav") -> str | None:
    """Ses verisini Türkçe transcript'e çevirir.

    Boş ses veya başarısızlıkta ``None`` döner — çağıran taraf kullanıcıya
    "anlayamadım" tarzı fallback verir.
    """
    if not audio_bytes:
        return None

    last_err: Exception | None = None
    for attempt in range(settings.gemini_max_retries + 1):
        try:
            return await asyncio.to_thread(_call_falai_stt_sync, audio_bytes, mime)
        except (urllib.error.URLError, TimeoutError, ValueError, RuntimeError) as err:
            last_err = err
            logger.warning("fal.ai STT çağrısı başarısız (deneme %d): %r", attempt + 1, err)
            if attempt < settings.gemini_max_retries:
                await asyncio.sleep(1.0 * (attempt + 1))

    logger.error("fal.ai STT tüm denemelerde başarısız: %r", last_err)
    return None
