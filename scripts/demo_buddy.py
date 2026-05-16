"""Standalone demo — video → frame → Buddy VLM → TTS → birleşik ses dosyası.

Kullanım:
    uv run python scripts/demo_buddy.py <video_dosyasi> [cikti.wav]

App veya frontend olmadan AI omurgasını (Pattern A + TTS) uçtan uca gösterir —
frontend gecikirse yedek demo. Endpoint'leri TestClient ile çağırır (kod tekrarı yok).
"""

from __future__ import annotations

import io
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from fastapi.testclient import TestClient

from ai_pipeline.config import settings
from ai_pipeline.main import app


def extract_frames(video: Path, out_dir: Path) -> list[Path]:
    """ffmpeg ile videodan N saniyede bir kare çıkarır."""
    interval = settings.gemini_frame_interval_seconds
    pattern = out_dir / "frame_%03d.jpg"
    subprocess.run(
        [
            "ffmpeg",
            "-i",
            str(video),
            "-vf",
            f"fps=1/{interval}",
            "-loglevel",
            "error",
            str(pattern),
        ],
        check=True,
    )
    return sorted(out_dir.glob("frame_*.jpg"))


def concat_wavs(parts: list[bytes], out_path: Path) -> None:
    """Birden fazla WAV bayt dizisini tek WAV dosyasında birleştirir (aralarına kısa sessizlik)."""
    rate = settings.gemini_tts_sample_rate_hz
    gap = b"\x00\x00" * int(0.4 * rate)  # ~0.4 sn sessizlik
    with wave.open(str(out_path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        for i, data in enumerate(parts):
            with wave.open(io.BytesIO(data)) as src:
                out.writeframes(src.readframes(src.getnframes()))
            if i < len(parts) - 1:
                out.writeframes(gap)


def main() -> int:
    if len(sys.argv) < 2:
        print("Kullanım: demo_buddy.py <video_dosyasi> [cikti.wav]")
        return 1

    video = Path(sys.argv[1])
    if not video.exists():
        print(f"Video bulunamadı: {video}")
        return 1

    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("output/buddy_demo.wav")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    client = TestClient(app)
    with tempfile.TemporaryDirectory() as tmp:
        frames = extract_frames(video, Path(tmp))
        print(f"{len(frames)} kare çıkarıldı.\n")

        audio_parts: list[bytes] = []
        for index, frame in enumerate(frames, start=1):
            with frame.open("rb") as handle:
                resp = client.post(
                    "/buddy/analyze",
                    files={"frame": (frame.name, handle, "image/jpeg")},
                )
            data = resp.json()
            speak = data.get("speak_text", "").strip()
            print(f"[kare {index}] priority={data.get('priority')}  →  {speak or '(sessiz)'}")
            if speak:
                tts_resp = client.post("/tts", data={"text": speak})
                if tts_resp.status_code == 200:
                    audio_parts.append(tts_resp.content)

    if audio_parts:
        concat_wavs(audio_parts, out_path)
        print(f"\nSes dosyası hazır: {out_path}")
    else:
        print("\nSeslendirilecek içerik çıkmadı (tüm kareler sessiz).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
