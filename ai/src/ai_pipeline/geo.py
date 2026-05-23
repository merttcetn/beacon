"""known_issues seed yükleme + Haversine mesafe filtresi (Supabase/PostGIS yerine).

Saf Python — Gemini gerektirmez, tek başına test edilebilir.
"""

from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

_SEED_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "istanbul_known_issues.json"


@lru_cache(maxsize=1)
def load_known_issues() -> list[dict]:
    """Statik seed JSON'u yükler (bir kez, cache'li)."""
    if not _SEED_PATH.exists():
        return []
    with _SEED_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """İki koordinat arası mesafe (metre)."""
    radius = 6_371_000.0  # dünya yarıçapı (metre)
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def nearby_issues(lat: float, lon: float, radius_m: float = 150.0) -> list[dict]:
    """`radius_m` metre içindeki bilinen problemler, yakından uzağa sıralı.

    Her sonuç, orijinal seed kaydına `distance_m` (yuvarlanmış metre) eklenmiş halidir.
    """
    found: list[dict] = []
    for issue in load_known_issues():
        dist = haversine_m(lat, lon, issue["lat"], issue["lon"])
        if dist <= radius_m:
            found.append({**issue, "distance_m": round(dist)})
    found.sort(key=lambda item: item["distance_m"])
    return found
