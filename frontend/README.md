# frontend

Beacon's iOS MVP — Expo / React Native. Blind users + civic-responsibility volunteers + B2B data buyers, all in one app.

> See [`../README.md`](../README.md) for product context. This README only covers running and structure.

## Run

```bash
npm install
cp .env.example .env   # Supabase URL + anon key, Stadia API key, n8n webhook
npm start              # scan QR with Expo Go
```

For the iOS simulator: `npm run ios`. For Android: `npm run android`.

## Layout

```
app/                    # Expo Router (file-based)
  _layout.tsx           # root: QueryClient, GestureHandler, fonts, Toaster
  index.tsx             # role-based gateway redirect
  onboarding/           # welcome → role selection → permissions
  buddy/                # blind-user flow (Walk / Sport / History)
  volunteer/            # volunteer tab bar (Map / Report / Feed / Profile)
  company/              # company tab bar (Dashboard / Tickets / Profile)
src/
  theme/                # colors, typography, spacing, radius, shadows
  components/           # Button, Screen, RoleCard, AppMap, ... (custom — no UI library)
  lib/                  # supabase, queryClient, vlm (placeholder)
  stores/               # zustand stores (userStore, etc.)
  constants/            # region (default: ODTÜ / Mahall), seed samples
  types/                # Ticket, User, etc.
  hooks/  utils/        # empty — filled as needed
assets/                 # icons, splash, fonts
```

Path aliases: `@/...` → `src/...`, `@app/...` → `app/...`.

## Map

- **react-native-maps** + **Stadia Maps** tile overlay — works in Expo Go (no prebuild).
- Default region: Ankara — **ODTÜ Teknokent / Mahall Maidan**.
- Stadia API key via `EXPO_PUBLIC_STADIA_API_KEY`, consumed by `src/components/AppMap.tsx`.

## Notes

- **Expo Go-compatible managed workflow.** Stadia tiles + react-native-maps instead of Mapbox.
- VLM endpoint goes through the `ai/` service (see repo root); `src/lib/vlm.ts` wraps the client.
- Supabase env via `.env` (`EXPO_PUBLIC_*` prefix is exposed to the client by Expo).
- Turkish-first copy, no gamification, no directional commands (spec §9 — the user decides; we describe).
