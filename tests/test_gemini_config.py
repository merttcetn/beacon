"""generate_structured temperature parametresi testi (gerçek API çağırmaz)."""

import asyncio

from ai_pipeline import gemini
from ai_pipeline.schemas import BuddyAnalysis


class _FakeModels:
    def __init__(self) -> None:
        self.last_config = None

    async def generate_content(self, *, model, contents, config):  # noqa: ANN001
        self.last_config = config

        class _Resp:
            parsed = None
            text = "{}"

        return _Resp()


class _FakeClient:
    def __init__(self) -> None:
        self.models_obj = _FakeModels()

        class _Aio:
            pass

        self.aio = _Aio()
        self.aio.models = self.models_obj


def test_temperature_passed_to_config(monkeypatch) -> None:  # noqa: ANN001
    fake = _FakeClient()
    monkeypatch.setattr(gemini, "get_client", lambda: fake)
    asyncio.run(
        gemini.generate_structured(
            model="m",
            system_instruction="s",
            user_prompt="u",
            response_schema=BuddyAnalysis,
            temperature=0.0,
        )
    )
    assert fake.models_obj.last_config.temperature == 0.0


def test_temperature_defaults_to_none(monkeypatch) -> None:  # noqa: ANN001
    fake = _FakeClient()
    monkeypatch.setattr(gemini, "get_client", lambda: fake)
    asyncio.run(
        gemini.generate_structured(
            model="m",
            system_instruction="s",
            user_prompt="u",
            response_schema=BuddyAnalysis,
        )
    )
    assert fake.models_obj.last_config.temperature is None
