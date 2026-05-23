# Beacon

> **The outdoors, now everyone's.**
>
> Beacon is an AI buddy that lets blind and low-vision people exercise outdoors on their own. The phone camera sees the world, the model interprets it, and you hear it through your earphones — in your language.

iOS · Turkish-first · Free for individuals, always.

Live site: [walkwithbeacon.vercel.app](https://walkwithbeacon.vercel.app/)

Built in 24 hours at the ODTÜ hackathon. This repo bundles the AI pipeline service and the Expo mobile app into a single workspace, with full commit history from both source projects preserved.

---

## What it is

Beacon brings three groups onto one platform:

1. **Blind and low-vision users** get real-time Turkish voice guidance while walking outdoors, plus equipment recognition for outdoor gym machines. Frames stream from the phone camera through a VLM; the response is spoken back through the earphones. **No directional commands — only context. The decision always stays with the user.**
2. **Volunteers** report obstacles they hit as "snags" with one photo and a tap. A VLM auto-classifies them and pins them on the map.
3. **Institutions** — municipalities, university campuses, retail chains — see accessibility gaps in their own footprint as a heat map, claim verified snags, and close them once fixed.

The core loop: a snag is reported → verified by the community → resolved by the responsible institution. From obstacle to map in about 30 seconds.

## Three modes

One app, three contexts. Every mode is summoned from the same voice interface — the user never needs to look at the screen.

| Mode | Trigger | What happens |
|---|---|---|
| **Buddy** | Passive listening, one tap to start | Every ~5s a frame goes through VLM Pattern A → short spoken summary of pedestrians, obstacles, crossings + known snags ahead. Complete, never overwhelming. |
| **Equipment Recognition** | Voice command: *"Describe this machine"* | One photo → VLM Pattern C → step-by-step grip placement, starting position, safety warnings. |
| **Voice Q&A** | One tap, natural language | *"What's in front of me?"* · *"Is this safe?"* · *"Report this."* — STT → orchestrator classifies intent → Pattern A/B/C/D dispatch, including the volunteer report flow. |

## Snag pipeline

```
1. Detect    A single user frames the obstacle; the VLM proposes
             a category + severity, the user confirms or corrects.

2. Verify    At 1/3 detections it's a single sighting; when three
             different users mark the same point, it flips to verified.

3. Resolve   The responsible institution claims verified snags from
             the heat map and closes them once fixed.
```

## Architecture

```
┌──────────────────────┐       HTTPS        ┌───────────────────────────┐
│  Expo mobile app     │ ─────────────────▶ │  AI pipeline (FastAPI)    │
│  camera · mic · TTS  │ ◀───────────────── │  Frames → VLM → speech    │
│  playback · UI       │   JSON + audio     │  Voice → STT → VLM        │
└──────────┬───────────┘                    └─────────────┬─────────────┘
           │                                              │
           │ snag reports                                 │ Gemini · fal.ai
           ▼                                              ▼
   ┌──────────────┐                              ┌─────────────────┐
   │ n8n webhook  │                              │  VLM / TTS / STT │
   │ (Supabase)   │                              │     providers    │
   └──────────────┘                              └─────────────────┘
```

A single orchestrator endpoint `POST /v1/assist` is the only contract between the app and the AI service. Two event types — `buddy_frame` (deterministic, Pattern A) and `voice` (LLM-classified intent → dispatched to Pattern A/B/C/D) — keep the surface tiny.

## Repo layout

```
beacon/
├── ai/         # FastAPI service — VLM (Gemini), TTS (fal.ai), STT pipelines
├── frontend/   # Expo / React Native iOS app — three role-based flows
└── README.md   # you are here
```

Each subdirectory has its own README with run instructions.

## Getting started

### Prerequisites

- Node.js 20+ and `npm`
- Python 3.13+ and [`uv`](https://docs.astral.sh/uv/)
- Xcode + iOS Simulator (or Expo Go on a physical device)
- API keys: Gemini, fal.ai, Supabase, Stadia Maps

### AI service

```bash
cd ai
cp .env.example .env        # fill in GEMINI_API_KEY and FAL_KEY
./start.sh                  # deterministic launcher with pre-flight checks
```

The service comes up on `http://127.0.0.1:8001`. Visit `/static/` for the simulator console used during development.

### Mobile app

```bash
cd frontend
npm install
cp .env.example .env        # fill in Supabase + Stadia keys
npm start                   # scan the QR code with Expo Go
```

For the iOS simulator: `npm run ios`. For Android: `npm run android` (untested — iOS only for the MVP).

## Tech stack

**AI service** — Python 3.13 · FastAPI · Pydantic · Google `google-genai` (Gemini) · fal.ai (Minimax TTS, Whisper STT) · `uv` for env management

**Mobile app** — Expo 54 · React Native 0.81 · expo-router · expo-camera · expo-audio · react-native-maps + Stadia tiles · `@gorhom/bottom-sheet` · `@tanstack/react-query` · Zustand · React Hook Form + Zod · Supabase JS client

**Infra** — Supabase (Postgres + PostGIS + Storage) · n8n (volunteer ticket workflow) · Mapillary + OSM seed data

## Ethics

> Beacon doesn't issue directions. It only describes the environment.
>
> The decision always stays with the user.

No camera images are stored. No voice recordings are kept — only the STT transcript text. KVKK compliant.

## Roadmap

- **Now** — iOS MVP, Turkish-first
- **Summer 2026** — First-wave TestFlight invites to pilot users in and around METU Technopark
- **Later** — Android, multi-language, on-device VLM

## Contributors

Built at the ODTÜ hackathon by:

- **[Mert Cetin](https://www.linkedin.com/in/mertcetin20/)** — frontend, product
- **[Toprak Necat Gök](https://www.linkedin.com/in/topraknecatgok/)** — AI pipeline
- **[Tunahan Büyükgebiz](https://www.linkedin.com/in/tunahan-buyukgebiz/)** — frontend, n8n integration

## License

[MIT](./LICENSE) © 2026 Mert Cetin, Toprak Necat Gök, Tunahan Büyükgebiz

---

© 2026 Beacon Labs
