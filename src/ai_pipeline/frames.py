"""Video → frame extraction (ffmpeg) — Buddy Mode batch video işleme için."""

from __future__ import annotations

import subprocess
from pathlib import Path


def extract_frames(
    video_path: Path,
    out_dir: Path,
    interval_seconds: int,
    max_frames: int,
    scale_width: int = 1024,
) -> list[tuple[float, Path]]:
    """Videodan `interval_seconds` aralıkla, en fazla `max_frames` kare çıkarır.

    Kareler `scale_width` px genişliğe küçültülür (VLM token + latency tasarrufu;
    Gemini görseli 768px tile'lara bölüp ücretlendirir).

    Dönüş: (timestamp_saniye, dosya_yolu) ikilileri — zaman sırasında.
    """
    pattern = out_dir / "frame_%04d.jpg"
    video_filter = f"fps=1/{interval_seconds},scale={scale_width}:-2"
    subprocess.run(
        [
            "ffmpeg",
            "-i",
            str(video_path),
            "-vf",
            video_filter,
            "-frames:v",
            str(max_frames),
            "-qscale:v",
            "3",
            "-loglevel",
            "error",
            "-y",
            str(pattern),
        ],
        check=True,
    )
    frames = sorted(out_dir.glob("frame_*.jpg"))
    return [(float(index * interval_seconds), path) for index, path in enumerate(frames)]
