"""Gemini API client — VLM (structured JSON) ve TTS (ses) çağrıları.

Tüm model ID'leri ve timeout/retry değerleri `config.py` üzerinden `.env`'den gelir.
"""

from __future__ import annotations

import asyncio
import io
import logging
import wave

from google import genai
from google.genai import types
from pydantic import BaseModel

from ai_pipeline.config import settings

logger = logging.getLogger("ai_pipeline.gemini")

# (bytes, mime_type) ikilisi — Gemini'ye gönderilecek tek bir görsel.
Image = tuple[bytes, str]


def get_client() -> genai.Client:
    """Gemini client — her çağrıda taze oluşturulur.

    Cache'lemiyoruz: async transport ilk kullanıldığı event loop'a bağlanıyor; loop
    kapanınca 'Event loop is closed' hatası veriyor. QPS düşük, taze client maliyeti
    ihmal edilebilir.
    """
    return genai.Client(api_key=settings.gemini_api_key)


async def generate_structured(
    *,
    model: str,
    system_instruction: str,
    user_prompt: str,
    response_schema: type[BaseModel],
    images: list[Image] | None = None,
    temperature: float | None = None,
    timeout: float | None = None,
    max_retries: int | None = None,
) -> BaseModel | None:
    """Gemini'ye (sistem + prompt + 0..N görsel) gönderir, structured JSON döner.

    Başarısızlıkta (timeout, API hatası, parse hatası) ``None`` döner — çağıran taraf
    güvenli fallback üretir. Geniş hata yakalama bilinçlidir: VLM hatası yürüyüş
    rehberliğini çökertmemeli (spec §4.1, AGENTS.md §4). Denemeler arası backoff
    rate-limit (429) durumunda bir sonraki denemeye nefes aldırır.

    ``timeout`` / ``max_retries`` verilmezse global ``gemini_*`` ayarları kullanılır;
    latency-hassas çağrılar (orchestrator) kısa timeout + az retry ile fail-fast olur.
    """
    effective_timeout = timeout if timeout is not None else settings.gemini_timeout_seconds
    effective_retries = max_retries if max_retries is not None else settings.gemini_max_retries
    client = get_client()

    contents: list[object] = [user_prompt]
    for image_bytes, image_mime in images or []:
        contents.append(types.Part.from_bytes(data=image_bytes, mime_type=image_mime))

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        response_schema=response_schema,
        temperature=temperature,
    )

    last_err: Exception | None = None
    for attempt in range(effective_retries + 1):
        try:
            resp = await asyncio.wait_for(
                client.aio.models.generate_content(model=model, contents=contents, config=config),
                timeout=effective_timeout,
            )
            parsed = getattr(resp, "parsed", None)
            if isinstance(parsed, response_schema):
                return parsed
            return response_schema.model_validate_json(resp.text)
        except Exception as err:  # bilinçli geniş yakalama — bkz. docstring
            last_err = err
            logger.warning("Gemini çağrısı başarısız (deneme %d): %r", attempt + 1, err)
            if attempt < effective_retries:
                await asyncio.sleep(1.0 * (attempt + 1))

    logger.error("Gemini çağrısı tüm denemelerde başarısız: %r", last_err)
    return None


def _pcm_to_wav(pcm: bytes) -> bytes:
    """Ham PCM (16-bit, mono) baytlarını çalınabilir WAV baytlarına sarar."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(settings.gemini_tts_sample_rate_hz)
        wav.writeframes(pcm)
    return buffer.getvalue()


async def synthesize_tts(text: str) -> bytes | None:
    """Türkçe metni Gemini TTS ile WAV ses verisine çevirir.

    Boş metin veya başarısızlıkta ``None`` döner — çağıran taraf metni göstererek ya da
    kendi (Expo Speech) TTS'iyle okuyarak fallback yapar (plan §P1-7).
    """
    if not text.strip():
        return None

    client = get_client()
    config = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=settings.gemini_tts_voice_name
                )
            )
        ),
    )

    last_err: Exception | None = None
    for attempt in range(settings.gemini_max_retries + 1):
        try:
            resp = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=settings.gemini_tts_model, contents=text, config=config
                ),
                timeout=settings.gemini_tts_timeout_seconds,
            )
            pcm = resp.candidates[0].content.parts[0].inline_data.data
            if not pcm:
                raise ValueError("TTS boş ses verisi döndü")
            return _pcm_to_wav(pcm)
        except Exception as err:  # bilinçli geniş yakalama
            last_err = err
            logger.warning("TTS çağrısı başarısız (deneme %d): %r", attempt + 1, err)
            if attempt < settings.gemini_max_retries:
                await asyncio.sleep(1.0 * (attempt + 1))

    logger.error("TTS tüm denemelerde başarısız: %r", last_err)
    return None
