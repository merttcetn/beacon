"""ai servisi — FastAPI uygulaması."""

from __future__ import annotations

import asyncio
import logging
import tempfile
import time
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from ai_pipeline import patterns
from ai_pipeline.config import settings
from ai_pipeline.frames import extract_frames
from ai_pipeline.geo import nearby_issues
from ai_pipeline.schemas import (
    BuddyAnalysis,
    FeedbackResult,
    SportDescription,
    VoiceAnswer,
)
from ai_pipeline.stt import transcribe
from ai_pipeline.tts import synthesize_tts

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("ai_pipeline")

_TEST_PAGE = Path(__file__).resolve().parent.parent.parent / "static" / "test.html"

app = FastAPI(title="ai — Sesli Rehberlik AI Servisi", version="0.1.0")

# Hackathon: mobil app tünel üzerinden erişir — CORS açık tutulur.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    """Servis ayakta mı + .env yüklendi mi (key değeri ifşa edilmez)."""
    return {
        "status": "ok",
        "gemini_key_loaded": "yes" if settings.gemini_api_key else "no",
        "tts_provider": settings.tts_provider,
        "pattern_a_llm_provider": settings.llm_provider_for("pattern_a"),
        "pattern_d_llm_provider": settings.llm_provider_for("pattern_d"),
    }


@app.get("/test", include_in_schema=False)
async def test_page() -> FileResponse:
    """Tarayıcıdan elle test için basit konsol sayfası (dev aracı)."""
    return FileResponse(_TEST_PAGE)


@app.post("/v1/buddy", response_model=BuddyAnalysis)
async def buddy_analyze(
    frame: Annotated[UploadFile, File(description="Kullanıcının önündeki kare")],
    lat: Annotated[float | None, Form()] = None,
    lon: Annotated[float | None, Form()] = None,
    recent_guidance: Annotated[
        str | None,
        Form(description="Realtime akışta son söylenen speak_text'ler — tekrar önleme"),
    ] = None,
) -> BuddyAnalysis:
    """Pattern A — Buddy Mode: frame (+ konum + bağlam) → Gemini → Türkçe rehberlik JSON'u.

    Konum verilirse yakın bilinen problemler (seed JSON + Haversine) prompt'a eklenir.
    Realtime akışta app, son birkaç `speak_text`'i `recent_guidance` olarak geri yollar;
    model aynı uyarıyı tekrarlamaz (server stateless kalır). VLM başarısız olursa güvenli
    fallback (boş speak_text, priority=low) döner (spec §4.1).
    """
    image_bytes = await frame.read()
    known: list[dict] = []
    if lat is not None and lon is not None:
        known = nearby_issues(lat, lon, settings.known_issues_radius_m)
    return await patterns.analyze_buddy_frame(
        image_bytes, frame.content_type or "image/jpeg", lat, lon, known, recent_guidance
    )


@app.post("/dev/buddy-video", include_in_schema=False)
async def buddy_analyze_video(
    video: Annotated[UploadFile, File(description="İşlenecek yürüyüş videosu")],
    lat: Annotated[float | None, Form()] = None,
    lon: Annotated[float | None, Form()] = None,
) -> dict:
    """Dev/test aracı — batch video: video → N kare → her kare Pattern A → zaman çizelgesi.

    Production akışı değil: gerçek kullanımda framing app tarafında yapılır ve her kare
    `/v1/buddy`'ye gönderilir. Kareler paralel işlendiğinden bağlam (recent_guidance)
    aktarılmaz; bu endpoint yalnızca toplu kalite/latency testi içindir.
    """
    started = time.perf_counter()
    known: list[dict] = []
    if lat is not None and lon is not None:
        known = nearby_issues(lat, lon, settings.known_issues_radius_m)

    video_bytes = await video.read()
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        src = tmp_dir / "input_video"
        src.write_bytes(video_bytes)

        frames = await asyncio.to_thread(
            extract_frames,
            src,
            tmp_dir,
            settings.gemini_frame_interval_seconds,
            settings.video_max_frames,
        )

        semaphore = asyncio.Semaphore(settings.video_concurrency)

        async def run(timestamp: float, path: Path) -> dict:
            async with semaphore:
                analysis = await patterns.analyze_buddy_frame(
                    path.read_bytes(), "image/jpeg", lat, lon, known
                )
            return {"t_seconds": timestamp, **analysis.model_dump()}

        frame_results = await asyncio.gather(*(run(ts, path) for ts, path in frames))

    return {
        "frame_count": len(frame_results),
        "frame_interval_seconds": settings.gemini_frame_interval_seconds,
        "processing_ms": round((time.perf_counter() - started) * 1000),
        "frames": frame_results,
    }


@app.post("/v1/voice", response_model=VoiceAnswer)
async def voice_ask(
    transcript: Annotated[str | None, Form(description="STT çıktısı (yoksa audio gönder)")] = None,
    audio: Annotated[
        UploadFile | None, File(description="Ses — transcript yoksa server STT eder")
    ] = None,
    screen_context: Annotated[str, Form()] = "idle",
    frame: Annotated[UploadFile | None, File()] = None,
    lat: Annotated[float | None, Form()] = None,
    lon: Annotated[float | None, Form()] = None,
) -> VoiceAnswer:
    """Pattern D — Voice Q&A: transcript veya ses (+ opsiyonel frame) → bağlamsal cevap.

    `transcript` verilirse doğrudan kullanılır (app kendi STT'sini yapmışsa). Yoksa `audio`
    fal.ai Scribe ile server tarafında transkript edilir. VLM başarısızsa "bağlantı sorunu"
    mesajı döner (spec §4.2).
    """
    if not (transcript and transcript.strip()) and audio is not None:
        transcript = await transcribe(await audio.read(), audio.content_type or "audio/wav")
    if not (transcript and transcript.strip()):
        logger.warning("voice_ask: transcript yok / STT başarısız")
        return VoiceAnswer(answer_speak_text="Anlayamadım, tekrar söyler misin?")

    images: list[tuple[bytes, str]] = []
    if frame is not None:
        images = [(await frame.read(), frame.content_type or "image/jpeg")]

    return await patterns.answer_voice(transcript, screen_context, images, lat, lon)


@app.post("/v1/speech/transcribe")
async def stt(
    audio: Annotated[UploadFile, File(description="Transkript edilecek ses dosyası")],
) -> dict:
    """Server-side STT — ses → Türkçe transcript (fal.ai ElevenLabs Scribe V2)."""
    transcript = await transcribe(await audio.read(), audio.content_type or "audio/wav")
    if transcript is None:
        logger.warning("stt: transkripsiyon başarısız")
        return {"transcript": "", "ok": False}
    return {"transcript": transcript, "ok": True}


@app.post("/v1/feedback", response_model=FeedbackResult)
async def feedback_categorize(
    photos: Annotated[list[UploadFile], File(description="1-3 problem fotoğrafı")],
) -> FeedbackResult:
    """Pattern B — Feedback: 1-3 foto → erişilebilirlik problemi kategorize JSON'u."""
    images = [(await p.read(), p.content_type or "image/jpeg") for p in photos]
    return await patterns.categorize_feedback(images)


@app.post("/v1/sport", response_model=SportDescription)
async def sport_describe(
    photo: Annotated[UploadFile, File(description="Spor aleti fotoğrafı")],
) -> SportDescription:
    """Pattern C — Spor: 1 foto → spor aletinin Türkçe kullanım anlatımı JSON'u."""
    image_bytes = await photo.read()
    return await patterns.describe_sport(image_bytes, photo.content_type or "image/jpeg")


@app.post("/v1/speech/synthesize")
async def tts(
    text: Annotated[str, Form(description="Seslendirilecek Türkçe metin")],
) -> Response:
    """Server-side TTS — metin → ses.

    Başarısızsa 503 + metin döner; app metni gösterir ya da kendi (Expo Speech)
    TTS'iyle okur (plan §P1-7).
    """
    audio = await synthesize_tts(text)
    if audio is None:
        return JSONResponse(
            status_code=503,
            content={"error": "tts_unavailable", "text": text},
        )
    return Response(content=audio.data, media_type=audio.media_type)
