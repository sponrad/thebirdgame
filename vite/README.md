# The Bird Game (PixiJS + Vite)

Web rewrite of the Unity game, using TypeScript, PixiJS, and Vite.

## Setup

```bash
cd vite
npm install
```

## Assets (Phase 2)

Copy Unity assets into `public/` and convert audio for the web:

```bash
npm run assets
```

- **Sprites**: copies `../Assets/Sprites/` → `public/sprites/`
- **Audio**: copies `../Assets/Audio/`; if **ffmpeg** is installed, converts `.aiff` → `.mp3` into `public/audio/` (MP3 for iOS Safari). If not, `.aiff` files are copied as-is (browsers don’t play .aiff; install ffmpeg and re-run for .mp3).

Run this once after clone, or whenever Unity assets change. The Unity `Assets/` folder remains the source of truth.

## Run

```bash
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173). Dev also serves the shared leaderboard at `/api/scores` (`data/scores.json`).

## Build

```bash
npm run build
```

Output is in `dist/`. For a production-like run (static files + leaderboard API):

```bash
npm start
```

Docker uses the same Node server (not nginx) so every visitor shares one leaderboard file. Persist `/data` across deploys if you want scores to survive container recreation.

### itch.io (static HTML)

```bash
make itch
```

Builds with `VITE_API_BASE=https://bird.devlabtech.com` and writes `vite/the-bird-game-itch.zip` (`index.html` at the zip root). Override the API host with `make itch ITCH_API_BASE=https://example.com`.

The API server already allows CORS from itch (`*.itch.zone` / `*.itch.io`) and localhost. Extra origins: set `CORS_ORIGINS` (comma-separated) on the server, or `CORS_ORIGINS=*` to allow any Origin.
