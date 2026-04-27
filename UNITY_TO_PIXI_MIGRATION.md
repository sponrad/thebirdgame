# The Bird Game: Unity → PixiJS + Vite Migration Plan

This document outlines the plan to rewrite the abandoned Unity project **"The Bird Game"** as a web game using **TypeScript**, **PixiJS**, and **Vite**. The goal is to reuse existing assets and faithfully port game logic from C# scripts.

---

## 1. Current Unity Game Summary

### 1.1 Gameplay (from C# scripts)

- **Player**: A plane that moves forward continuously and is steered with left/right (keyboard A/D or left/right, or touch: left/right half of screen). Movement is constrained to level bounds.
- **Enemies**: Birds that spawn from corners, have a short “birthing” phase, then chase the plane. They use a simple boid-style “rule2” separation and rotate to face the player. Collision with the plane = game over.
- **Balloons**: Float around with random drift; when the plane touches a balloon, it pops and damages all birds in an explosion radius. Balloon pop particles play. More balloons spawn on a timer.
- **Score**: +25 per balloon pop (or per bird hit via balloon), multiplied by current multiplier. Multiplier increases when collecting star pickups dropped by killed birds.
- **Multiplier pickups**: Dropped when a bird is killed; float for a limited time, then get attracted to the plane when close and increase the score multiplier on collect.
- **Scenes**: Title → Sky (main game) → Game Over (additive then transition). High score and sound preference stored (PlayerPrefs → localStorage).
- **Camera**: Smooth follow of the plane, clamped to level bounds.
- **Audio**: Balloon spawn, balloon pop, enemy spawn, player dead, multiplier pickup (all one-shot from a single AudioSource).

### 1.2 Unity Scenes

| Scene       | Purpose                          |
|------------|-----------------------------------|
| `Title`    | Menu, sound toggle, play button   |
| `SceneSky` | Main gameplay                    |
| `GameOver` | Score, best score, restart       |

### 1.3 Scripts to Port (exclude Google Play / editor)

| Unity script               | Responsibility |
|---------------------------|----------------|
| `Globals.cs`              | Singleton: score, multiplier, highScore, sound, inGame |
| `SkySceneControl.cs`      | Level bounds, spawn birds/balloons, UI score text, all game audio |
| `PlaneControlScript.cs`   | Plane movement, rotation (keys + touch), exhaust spawn, level clamp |
| `BirdControlScript.cs`   | Bird list, birthing → chase, rule2 separation, flap animation, hit/death, spawn multiplier |
| `BalloonControlScript.cs`| Balloon drift, bounds clamp, plane trigger → pop, damage birds in radius |
| `MultiplierControlScript.cs` | Multiplier pickup lifetime, move toward target (plane), collect on trigger |
| `MultiplierPickupScript.cs`  | When plane enters trigger, set parent’s target to plane (magnet) |
| `PlaneExhaustControl.cs` | Exhaust sprite lifetime then destroy |
| `ParticleScript.cs`      | Balloon pop particle duration then destroy |
| `MainCameraControl.cs`   | Smooth follow plane, clamp to bounds |
| `TitleControl.cs`        | Sound toggle, load/save prefs (sound, high score) |
| `GameOverControl.cs`     | Compare score to high score, save, show score/best, (optional leaderboard stub) |
| `ChangeSceneScript.cs`   | Load scene (e.g. SceneSky), reset time scale |

**Not ported (optional later):** Google Play (GPlayGIds, GPGIds, Social.ReportScore, etc.). Can be replaced later with a simple leaderboard API or removed.

---

## 2. Assets to Reuse

All paths below are relative to the **Unity project** (`Assets/`). The plan is to **copy** (or symlink) these into the new app’s `public` or `assets` folder so the Unity project stays untouched.

### 2.1 Sprites

- **Bird**: `Sprites/birdFrames/frame-1.png` … `frame-8.png` (flap animation); `vultroso-dead.png` (dead); default can use `vultroso-standard.png` or `frame-1`.
- **Plane**: `Sprites/plane.png` (main), `Sprites/plane-exhaust-dash.png` (exhaust).
- **Balloon**: `Sprites/balloon.png`.
- **Environment**: `Sprites/cloud.png`.
- **UI / pickups**: `Sprites/star.png` (multiplier), `Sprites/dotted-line.png`, `Sprites/dotted-line-short.png` (if used in UI).
- **Icons** (for PWA/manifest): `Sprites/icon-swooping-bird.png`, `Sprites/icon-swooping-bird512.png`, etc.

**Note:** Prefabs (`.prefab`) are not used directly; their configuration (components, values) is reflected in the TypeScript/PixiJS code.

### 2.2 Audio

- **Format**: Unity uses `.aiff`. Browsers support WAV/MP3/OGG. Options:
  - **Option A**: Convert `.aiff` → `.mp3` or `.ogg` (e.g. with ffmpeg or an online converter) and place in the Vite app’s `public/audio` (or `assets/audio`).
  - **Option B**: Keep paths in the plan and add a small build step to convert audio during asset copy.
- **Mapping** (from `SkySceneControl` and scripts):
  - Balloon spawn: `Audio/balloonrub01.aiff` … `balloonrub05.aiff`
  - Balloon pop: `Audio/balloonpop-01.aiff` … `balloonpop-04.aiff`
  - Enemy spawn: `Audio/vulture01.aiff`, `Audio/vulture02.aiff`
  - Player dead: e.g. `Audio/birdroar01.aiff` (or as configured in Unity)
  - Multiplier pickup: `Audio/boop1.aiff` … `Audio/boop5.aiff`

Use a single Web Audio (or Howler.js) context and play one-shots for these events.

---

## 3. Target Stack and Repo Layout

- **Stack**: TypeScript, PixiJS (v7 or v8), Vite.
- **New code location**: All new code lives under a single root directory at the **project root** to keep it clearly separate from the Unity project.

Recommended directory name: **`/vite`** (or `web`, `pixi-app`). Everything below assumes **`/vite`**.

```
thebirdgame/
├── Assets/                    # UNCHANGED – existing Unity assets
├── ProjectSettings/
├── ...
├── UNITY_TO_PIXI_MIGRATION.md # This plan
└── vite/                      # New PixiJS + Vite app
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── public/                # Static assets (or symlink/copy from Assets)
    │   ├── sprites/           # Copy/symlink from Assets/Sprites
    │   └── audio/             # Converted/copied from Assets/Audio
    ├── src/
    │   ├── main.ts            # Entry: init Pixi, load first screen
    │   ├── game/
    │   │   ├── Game.ts        # Main game loop, level bounds, spawners
    │   │   ├── Globals.ts     # score, multiplier, highScore, sound, inGame
    │   │   ├── Plane.ts
    │   │   ├── Bird.ts
    │   │   ├── Balloon.ts
    │   │   ├── MultiplierPickup.ts
    │   │   ├── Exhaust.ts
    │   │   ├── Particle.ts    # Balloon pop particle
    │   │   └── Camera.ts      # Follow + clamp
    │   ├── scenes/
    │   │   ├── TitleScene.ts
    │   │   ├── SkyScene.ts    # Play scene container
    │   │   └── GameOverScene.ts
    │   ├── ui/
    │   │   ├── ScoreText.ts
    │   │   └── SoundToggle.ts
    │   ├── audio/
    │   │   └── AudioManager.ts
    │   └── utils/
    │       └── storage.ts     # localStorage for high score, sound
    └── README.md
```

- **Asset strategy**: Either copy `Assets/Sprites` and (converted) `Assets/Audio` into `vite/public/` or add a small script that copies/symlinks and converts audio so the single source of truth remains `Assets/`.
- **No changes** to existing Unity folders; only **add** `vite/` and this plan file.

---

## 4. Script → TypeScript Mapping (High Level)

- **Globals** → `game/Globals.ts` (singleton or module-level state).
- **SkySceneControl** → `game/Game.ts` + `scenes/SkyScene.ts`: spawn timers, level bounds, score/multiplier UI updates, and delegation to `AudioManager`.
- **PlaneControlScript** → `game/Plane.ts`: input (keyboard + pointer), move forward, rotate, clamp to bounds, spawn exhaust, flip sprite by rotation.
- **BirdControlScript** → `game/Bird.ts`: birthing timer, chase + rule2, flap animation (swap textures from frame-1…8), hit() → dead sprite, physics-like knockback (optional simple tween), spawn multiplier pickup, remove from list.
- **BalloonControlScript** → `game/Balloon.ts`: drift, bounds clamp, collision with plane → pop (play sound, damage birds in radius, spawn particle, add score, destroy).
- **MultiplierControlScript** + **MultiplierPickupScript** → `game/MultiplierPickup.ts`: lifetime, trigger radius to “lock” target to plane, move toward plane, on overlap add to multiplier and play sound.
- **PlaneExhaustControl** → `game/Exhaust.ts`: sprite at plane position/rotation, remove after delay.
- **ParticleScript** (balloon pop) → `game/Particle.ts`: show sprite/particle, remove after duration.
- **MainCameraControl** → `game/Camera.ts`: smooth follow plane, clamp to level bounds (in world or view coordinates).
- **TitleControl** → `scenes/TitleScene.ts`: sound toggle (write to `Globals` + `storage`), “Play” → start game (e.g. switch to SkyScene).
- **GameOverControl** → `scenes/GameOverScene.ts`: compare score to high score, save to `storage`, display score and best; “Play again” → reset and go to SkyScene.
- **ChangeSceneScript** → scene loader in `main.ts` or a small `Router`/state that switches between Title, Sky, GameOver.

Collision: Unity uses 2D colliders and `OnTriggerEnter2D`. In PixiJS, use **bounds or distance checks** (e.g. circle for balloon explosion, AABB or circle for plane–bird, plane–balloon, plane–multiplier). No need for a full physics engine; match the Unity behavior with simple math.

---

## 5. Implementation Phases

### Phase 1: Vite + PixiJS scaffold

- Create `vite/` with Vite + TypeScript.
- Add PixiJS and types.
- `index.html` + `src/main.ts`: init Pixi app, clear stage, show a simple “The Bird Game” text or placeholder.
- Document in `vite/README.md` how to run (`npm i`, `npm run dev`) and where assets come from.

### Phase 2: Asset pipeline and globals

- Copy or symlink `Assets/Sprites` into `vite/public/sprites` (or `vite/public/assets/sprites`).
- Add audio conversion (aiff → mp3/ogg) and put files in `vite/public/audio`.
- Implement `Globals` and `storage` (localStorage for high score and sound).
- Implement `AudioManager` (load clips, play one-shot; respect `Globals.sound`).

### Phase 3: Title and Game Over scenes

- **TitleScene**: background (optional), title text, sound toggle (UI or Pixi Graphics/Text), “Play” button → start game.
- **GameOverScene**: “Score: X”, “Best: Y”, “Play again” → restart.
- Wire scene switching in `main.ts` (no URL router needed; simple state is enough).

### Phase 4: Main game scene and plane

- **SkyScene**: create container, level bounds (from config or derived from view size + buffer).
- **Plane**: load plane sprite, update loop: forward movement, left/right rotation (key + pointer), clamp to bounds, flip sprite by angle. Spawn exhaust on a timer.
- **Camera**: follow plane with smooth damping, clamp camera position to bounds so the world doesn’t scroll past edges.

### Phase 5: Balloons and collision

- **Balloon**: load sprite, random drift, clamp to bounds. Each frame check distance to plane; if overlapping, trigger pop: play sound, find birds in explosion radius and call `hit()`, add score, spawn particle, destroy balloon.
- **Particle**: simple sprite or graphic at position, remove after duration.

### Phase 6: Birds

- **Bird**: spawn at corner positions (from SkyScene/Game), birthing phase (scale up, move with rule2 only), then “alive”: rotate toward plane, move forward + rule2, clamp to bounds. Flap animation (frame-1…8 loop). On overlap with plane: game over (stop game, show GameOver scene). `hit(sourcePoint)`: switch to dead sprite, optional knockback, remove from list, add score, spawn multiplier pickup.
- **Spawner**: timer (e.g. 1.5s) that spawns 1–N birds at random corner, scaling count with multiplier (replicate Unity formula if desired).

### Phase 7: Multiplier pickups and polish

- **MultiplierPickup**: when plane is in trigger radius, set “target = plane” and move toward plane; on overlap add to `Globals.scoreMultiplier`, play sound, destroy. Otherwise destroy after lifetime.
- HUD: score and “x N” multiplier (from SkyScene or a small UI layer).
- Optional: PWA manifest and icons from `Assets/Sprites/icon-*`.

### Phase 8: Tuning and parity

- Match speeds, radii, and spawn rates to Unity (read values from scripts and put in a single `game/constants.ts` or config).
- Test all flows: Title → Play → Game Over → Play again; sound on/off; high score persist.

---

## 6. C# → TypeScript Notes

- **Time**: `Time.deltaTime` → pass `delta` (ms or seconds) from your game loop (e.g. `app.ticker` or `requestAnimationFrame`).
- **Random**: `Random.Range(a, b)` → `a + Math.random() * (b - a)` (or a small `randomRange` helper).
- **Quaternion / rotation**: Unity’s `Quaternion.AngleAxis`, `SpriteRenderer.flipX/flipY` → in PixiJS set `sprite.rotation` (radians) and optionally `sprite.scale.x = -1` / `scale.y = -1` for flip.
- **Bounds**: Unity `Bounds`, `Contains`, `ClosestPoint` → simple object `{ minX, minY, maxX, maxY }` and clamp: `Math.max(minX, Math.min(maxX, x))`.
- **Lists**: `List<BirdControlScript>` → `Bird[]` or `Set<Bird>`; remove on destroy.
- **Invoke / Coroutines**: `Invoke("Born", birthTime)` → `setTimeout` or a simple timer in the update loop; flap animation → swap texture on a timer or frame count.

---

## 7. Out of Scope (for initial port)

- Google Play sign-in, leaderboards, achievements (can add a web leaderboard later).
- Unity-specific build and deployment.
- 3D or extra visual effects beyond what the current sprites and particles provide.

---

## 8. Success Criteria

- Game runs in the browser (local dev and optional static deploy).
- Title → Play → Game Over → Play again works; score and high score persist; sound toggle works.
- Gameplay matches Unity: plane control, balloon pop vs birds, multiplier pickups, bird chase and hit behavior, camera follow.
- All reused assets live under `vite/public` (or equivalent); Unity `Assets/` remains the canonical source for art/audio, with a clear copy/convert step documented in `vite/README.md`.

Once this plan is approved, implementation can start with **Phase 1** (scaffold under `vite/`) and proceed in order through Phase 8.
