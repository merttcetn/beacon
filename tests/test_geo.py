"""P1-6 — geo modülü testleri (Gemini gerektirmez)."""

from ai_pipeline.geo import haversine_m, load_known_issues, nearby_issues


def test_haversine_one_degree_latitude() -> None:
    # 1 derece enlem ≈ 111 km
    dist = haversine_m(40.0, 29.0, 41.0, 29.0)
    assert 109_000 < dist < 113_000


def test_haversine_same_point_is_zero() -> None:
    assert haversine_m(40.99, 29.02, 40.99, 29.02) < 1.0


def test_seed_loads() -> None:
    issues = load_known_issues()
    assert len(issues) >= 10
    assert all({"lat", "lon", "description_tr", "issue_type"} <= set(i) for i in issues)


def test_nearby_returns_sorted_cluster() -> None:
    near = nearby_issues(40.9905, 29.0270, radius_m=250.0)
    assert len(near) >= 5  # Kadıköy seed kümesi
    dists = [i["distance_m"] for i in near]
    assert dists == sorted(dists)


def test_nearby_far_point_empty() -> None:
    # Ankara — İstanbul seed'inden uzak
    assert nearby_issues(39.93, 32.85, radius_m=150.0) == []
