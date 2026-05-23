"""POST /v1/assist — endpoint entegrasyon testi (orchestrator handle_assist mock'lanır)."""

from fastapi.testclient import TestClient

from ai_pipeline import orchestrator
from ai_pipeline.main import app
from ai_pipeline.schemas import AssistResponse


def test_assist_endpoint_returns_envelope(monkeypatch) -> None:  # noqa: ANN001
    async def fake_handle(**kwargs):  # noqa: ANN003, ANN202
        assert kwargs["event"] == "voice"
        assert kwargs["transcript"] == "sus"
        return AssistResponse(event="voice", intent="stop", speak_text="")

    monkeypatch.setattr(orchestrator, "handle_assist", fake_handle)
    client = TestClient(app)
    resp = client.post("/v1/assist", data={"event": "voice", "transcript": "sus"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "stop"
    assert body["ui_action"] == "none"


def test_assist_endpoint_passes_frame(monkeypatch) -> None:  # noqa: ANN001
    async def fake_handle(**kwargs):  # noqa: ANN003, ANN202
        assert kwargs["frame_bytes"] == b"jpegdata"
        return AssistResponse(event="buddy_frame", intent="buddy_frame")

    monkeypatch.setattr(orchestrator, "handle_assist", fake_handle)
    client = TestClient(app)
    resp = client.post(
        "/v1/assist",
        data={"event": "buddy_frame"},
        files={"frame": ("f.jpg", b"jpegdata", "image/jpeg")},
    )
    assert resp.status_code == 200
    assert resp.json()["event"] == "buddy_frame"
