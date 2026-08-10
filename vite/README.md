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

Open the URL shown in the terminal (usually http://localhost:5173).

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with `npm run preview` to test.
