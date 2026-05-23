# ai

AI pipeline service for Beacon — turns camera frames and voice into Turkish spoken guidance.

> See [`../README.md`](../README.md) for the full product context. This README only covers running and developing the service.

## What this service does

```
buddy_frame  ──▶  VLM (Gemini)  ──▶  speak_text  ──▶  TTS (fal.ai)  ──▶  audio
voice  ──▶  STT  ──▶  orchestrator (intent) ──▶ VLM Pattern A/B/C/D  ──▶  audio
```

A single entry point (`POST /v1/assist`) takes one of two events from the mobile app and dispatches to the right VLM pattern. The service is stateless — the app sends `nearby_tickets` and `screen_context` with every request.

| Pattern | Mode | Trigger | Latency target |
|---|---|---|---|
| A | Buddy mode — walking guidance | Auto, every ~5s | speed > detail |
| B | Feedback — hazard classification | Volunteer tap | accuracy > speed |
| C | Sport mode — equipment instructions | User tap | detail > speed |
| D | Voice Q&A | One tap, anywhere | context awareness + natural Turkish |

Full prompt schemas and contracts live in the orchestrator code under `src/ai_pipeline/`.

## Run

```bash
cp .env.example .env        # fill in GEMINI_API_KEY and FAL_KEY at minimum
./start.sh                  # deterministic launcher: env diagnostics, deps, uvicorn
```

The launcher writes everything to `runtime/start.log` and aborts with a clear cause + fix on any failure. Service listens on `http://127.0.0.1:8001` by default; override with `PORT=…` or `HOST=…`.

Simulator console for manual testing: `http://127.0.0.1:8001/static/`.

## Develop

```bash
uv sync                     # install deps + dev deps
uv run pytest               # tests
uv run ruff check .         # lint
```

Python 3.13+ required.

## Layout

```
src/ai_pipeline/   # FastAPI app, orchestrator, VLM/TTS/STT adapters, prompts
tests/             # pytest suite
docs/              # provider runbooks, contract notes
static/            # in-browser simulator for the /v1/assist endpoint
scripts/           # ops helpers
start.sh           # deterministic launcher
```

