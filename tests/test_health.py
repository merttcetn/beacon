"""P0-1 smoke testi — /health ayakta mı."""

from fastapi.testclient import TestClient

from ai_pipeline.main import app


def test_health_ok() -> None:
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
