import {
  Container,
  Graphics,
  Point,
  Text,
  TextStyle,
  Assets,
  type Application,
  type Texture,
} from 'pixi.js';
import { Globals } from '../game/Globals';
import { Plane } from '../game/Plane';
import { Exhaust } from '../game/Exhaust';
import { Balloon } from '../game/Balloon';
import { BalloonPopParticle } from '../game/BalloonPopParticle';
import { audioManager } from '../audio/AudioManager';
import {
  LEVEL_BOUNDS,
  EXHAUST_SPAWN_INTERVAL,
  BALLOON_COLLECT_RADIUS,
  BALLOON_SPAWN_MIN,
  BALLOON_SPAWN_MAX,
  BALLOON_BULB_OFFSET,
  BALLOON_EXPLOSION_RADIUS_FACTOR,
  BALLOON_HITBOX_CENTER_Y_FACTOR,
  BALLOON_HITBOX_RADIUS_X_FACTOR,
  BALLOON_HITBOX_RADIUS_Y_FACTOR,
  BIRD_SPAWN_INTERVAL,
  BIRD_SPAWN_CORNER_BUFFER,
  BIRD_DEAD_DESPAWN_MARGIN,
  PLANE_SCALE,
  BALLOON_SCALE,
  MULTIPLIER_ATTRACT_EXPLOSION_FACTOR,
  CAMERA_DAMP_TIME,
  CAMERA_VIEW_HALF_HEIGHT,
  VIEW_PADDING_PX,
  PLANE_BIRD_COLLISION_INSET,
} from '../game/constants';
import { Bird } from '../game/Bird';
import { MultiplierPickup } from '../game/MultiplierPickup';
import { createLevelBorder } from '../game/LevelBorder';
import { CloudBackground } from '../game/Cloud';
import {
  getSpriteOutlineWorldPoints,
  pixelPerfectOverlap,
  spriteOpaquePixelsOverlapEllipse,
} from '../utils/collision';

const HUD_STYLE = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 22,
  fill: 0x1a1a1a,
});

export class SkyScene extends Container {
  private app: Application;
  private onGameOver: () => void;
  private worldContainer!: Container;
  private cloudLayer!: Container;
  private exhaustLayer!: Container;
  private balloonLayer!: Container;
  private birdLayer!: Container;
  private multiplierLayer!: Container;
  private particleLayer!: Container;
  private plane!: Plane;
  private clouds: CloudBackground[] = [];
  private exhausts: Exhaust[] = [];
  private exhaustAccum = 0;
  private balloons: Balloon[] = [];
  private balloonSpawnAccum = 0;
  private nextBalloonSpawnDelay = BALLOON_SPAWN_MIN;
  private birds: Bird[] = [];
  private birdSpawnAccum = 0;
  private multipliers: MultiplierPickup[] = [];
  private particles: BalloonPopParticle[] = [];
  private balloonTexture!: Texture;
  private birdFlapTextures: Texture[] = [];
  private birdDeadTexture!: Texture;
  private starTexture!: Texture;
  private scoreText!: Text;
  private multiplierText!: Text;
  private planeTexture!: Texture;
  private exhaustTexture!: Texture;
  private tickerBound = () => this.tick();
  private pointerDown = false;
  private prevPlaneX = 0;
  private prevPlaneY = 0;
  private camX = 0;
  private camY = 0;
  private camVelX = 0;
  private camVelY = 0;
  private static COLLISION_ALPHA_THRESHOLD = 12;
  private static SWEEP_SAMPLES = 5;
  private debugOverlay!: Graphics;
  private debugCollisionEnabled = false;
  private debugBirdCollisionChecks: Array<{ bird: Bird; hit: boolean }> = [];
  private debugBalloonSweepPoints: Array<{ x: number; y: number; hit: boolean }> = [];

  private static SPAWN_CORNERS = [
    { x: LEVEL_BOUNDS.minX + BIRD_SPAWN_CORNER_BUFFER, y: LEVEL_BOUNDS.minY + BIRD_SPAWN_CORNER_BUFFER },
    { x: LEVEL_BOUNDS.minX + BIRD_SPAWN_CORNER_BUFFER, y: LEVEL_BOUNDS.maxY - BIRD_SPAWN_CORNER_BUFFER },
    { x: LEVEL_BOUNDS.maxX - BIRD_SPAWN_CORNER_BUFFER, y: LEVEL_BOUNDS.minY + BIRD_SPAWN_CORNER_BUFFER },
    { x: LEVEL_BOUNDS.maxX - BIRD_SPAWN_CORNER_BUFFER, y: LEVEL_BOUNDS.maxY - BIRD_SPAWN_CORNER_BUFFER },
  ];

  private constructor(app: Application, onGameOver: () => void) {
    super();
    this.app = app;
    this.onGameOver = onGameOver;
  }

  static async create(app: Application, onGameOver: () => void): Promise<SkyScene> {
    const scene = new SkyScene(app, onGameOver);
    await scene.loadAssets();
    scene.build();
    return scene;
  }

  private async loadAssets(): Promise<void> {
    this.planeTexture = await Assets.load('/sprites/plane-side.png');
    this.exhaustTexture = await Assets.load('/sprites/plane-exhaust-dash.png');
    this.balloonTexture = await Assets.load('/sprites/balloon.png');
    this.birdFlapTextures = [
      await Assets.load('/sprites/vultroso-standard.png'),
      await Assets.load('/sprites/vultroso-midflap.png'),
      await Assets.load('/sprites/vultroso-flap.png'),
      await Assets.load('/sprites/vultroso-midflap.png'),
    ];
    this.birdDeadTexture = await Assets.load('/sprites/vultroso-dead.png');
    this.starTexture = await Assets.load('/sprites/star.png');
  }

  private build(): void {
    this.worldContainer = new Container();
    this.addChild(this.worldContainer);

    this.cloudLayer = new Container();
    this.worldContainer.addChild(this.cloudLayer);
    const sky = new CloudBackground();
    this.cloudLayer.addChild(sky);
    this.clouds = [sky];

    this.worldContainer.addChild(createLevelBorder());

    this.exhaustLayer = new Container();
    this.worldContainer.addChild(this.exhaustLayer);

    this.balloonLayer = new Container();
    this.worldContainer.addChild(this.balloonLayer);

    this.plane = new Plane(this.planeTexture);
    this.plane.scale.set(PLANE_SCALE);
    this.plane.x = 0;
    this.plane.y = 0;
    this.worldContainer.addChild(this.plane);

    this.birdLayer = new Container();
    this.worldContainer.addChild(this.birdLayer);

    this.multiplierLayer = new Container();
    this.worldContainer.addChild(this.multiplierLayer);

    this.particleLayer = new Container();
    this.worldContainer.addChild(this.particleLayer);

    this.debugOverlay = new Graphics();
    this.addChild(this.debugOverlay);

    this.scoreText = new Text({ text: '0', style: HUD_STYLE });
    this.scoreText.x = 16;
    this.scoreText.y = 16;
    this.addChild(this.scoreText);

    this.multiplierText = new Text({ text: 'x 1', style: HUD_STYLE });
    this.multiplierText.x = 16;
    this.multiplierText.y = 44;
    this.addChild(this.multiplierText);
  }

  start(): void {
    this.plane.x = 0;
    this.plane.y = 0;
    this.plane.resetHeading();
    this.camX = 0;
    this.camY = 0;
    this.camVelX = 0;
    this.camVelY = 0;
    this.exhaustAccum = 0;
    this.balloonSpawnAccum = 0;
    this.birdSpawnAccum = 0;
    this.nextBalloonSpawnDelay = BALLOON_SPAWN_MIN + Math.random() * (BALLOON_SPAWN_MAX - BALLOON_SPAWN_MIN);
    for (const b of this.balloons) {
      this.balloonLayer.removeChild(b);
      b.destroy();
    }
    this.balloons.length = 0;
    for (const bird of this.birds) {
      this.birdLayer.removeChild(bird);
      bird.destroy();
    }
    this.birds.length = 0;
    for (const m of this.multipliers) {
      this.multiplierLayer.removeChild(m);
      m.destroy();
    }
    this.multipliers.length = 0;
    for (const p of this.particles) {
      this.particleLayer.removeChild(p);
      p.destroy();
    }
    this.particles.length = 0;
    for (const e of this.exhausts) {
      this.exhaustLayer.removeChild(e);
      e.destroy();
    }
    this.exhausts.length = 0;
    this.updateWorldView();
    this.app.ticker.add(this.tickerBound);

    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', this.onPointerDown, this);
    this.app.stage.on('pointerup', this.onPointerUp, this);
    this.app.stage.on('pointerupoutside', this.onPointerUp, this);
    this.app.stage.on('pointermove', this.onPointerMove, this);
    window.addEventListener('keydown', this.onDebugToggleKeyDown);
  }

  /** Stop simulation/input but keep the last frame visible for game-over overlay. */
  freeze(): void {
    this.stop();
  }

  stop(): void {
    this.app.ticker.remove(this.tickerBound);
    this.app.stage.off('pointerdown', this.onPointerDown, this);
    this.app.stage.off('pointerup', this.onPointerUp, this);
    this.app.stage.off('pointerupoutside', this.onPointerUp, this);
    this.app.stage.off('pointermove', this.onPointerMove, this);
    this.plane.setInputPointer(false, false);
    window.removeEventListener('keydown', this.onDebugToggleKeyDown);
    this.debugOverlay.clear();
  }

  private onDebugToggleKeyDown = (e: KeyboardEvent): void => {
    if (!import.meta.env.DEV) return;
    if (e.key !== '0') return;
    this.debugCollisionEnabled = !this.debugCollisionEnabled;
    if (!this.debugCollisionEnabled) this.debugOverlay.clear();
  };

  private toScreenPoint(worldX: number, worldY: number): Point {
    return this.worldContainer.worldTransform.apply({ x: worldX, y: worldY }, new Point());
  }

  private drawSpriteHitboxOutline(
    g: Graphics,
    sprite: Plane | Bird | Balloon,
    color: number,
    stride = 2,
    insetPixels = 0
  ): void {
    const points = getSpriteOutlineWorldPoints(
      sprite,
      SkyScene.COLLISION_ALPHA_THRESHOLD,
      stride,
      insetPixels
    );
    for (const p of points) {
      g.circle(p.x, p.y, 1.1);
      g.fill({ color, alpha: 0.95 });
    }
  }

  private drawCollisionDebug(): void {
    this.debugOverlay.clear();
    if (!this.debugCollisionEnabled) return;

    this.drawSpriteHitboxOutline(this.debugOverlay, this.plane, 0x33ff66, 1, PLANE_BIRD_COLLISION_INSET);
    for (const entry of this.debugBirdCollisionChecks) {
      this.drawSpriteHitboxOutline(this.debugOverlay, entry.bird, entry.hit ? 0xff3b30 : 0xffaa33, 2);
    }
    for (const balloon of this.balloons) {
      const hb = this.getBalloonHitbox(balloon);
      this.debugOverlay.ellipse(hb.cx, hb.cy, hb.rx, hb.ry);
      this.debugOverlay.stroke({ color: 0x33ccff, pixelLine: true, width: 1.5, alpha: 0.95 });
    }
    for (const sample of this.debugBalloonSweepPoints) {
      const p = this.toScreenPoint(sample.x, sample.y);
      this.debugOverlay.circle(p.x, p.y, sample.hit ? 4 : 2.5);
      this.debugOverlay.fill({ color: sample.hit ? 0x00ff66 : 0xff0066, alpha: 0.9 });
    }
  }

  private onPointerDown = (e: { global: { x: number } }): void => {
    this.pointerDown = true;
    const mid = this.app.screen.width / 2;
    this.plane.setInputPointer(e.global.x < mid, e.global.x >= mid);
  };

  private onPointerUp = (): void => {
    this.pointerDown = false;
    this.plane.setInputPointer(false, false);
  };

  private onPointerMove = (e: { global: { x: number } }): void => {
    if (!this.pointerDown) return;
    const mid = this.app.screen.width / 2;
    this.plane.setInputPointer(e.global.x < mid, e.global.x >= mid);
  };

  /** Distance from segment (x1,y1)->(x2,y2) to point (px,py). Avoids tunneling when plane is fast. */
  private segmentToPointDistance(x1: number, y1: number, x2: number, y2: number, px: number, py: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = len2 <= 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  private onBirdDeath(bird: Bird): void {
    const pos = bird.getWorldPosition();
    const now = performance.now() / 1000;
    const pickup = new MultiplierPickup(this.starTexture, pos.x, pos.y, now);
    this.multiplierLayer.addChild(pickup);
    this.multipliers.push(pickup);
  }

  private spawnBirds(): void {
    const mult = Globals.scoreMultiplier;
    const spawnCount = Math.max(
      1,
      Math.floor((mult - 1) / (4 * Math.log(Math.max(mult, 1.1))))
    );
    const numBirds = Math.max(1, 1 + Math.floor(Math.random() * Math.max(0, spawnCount * 2 - 1)));
    const corner = SkyScene.SPAWN_CORNERS[Math.floor(Math.random() * SkyScene.SPAWN_CORNERS.length)];
    for (let i = 0; i < numBirds; i++) {
      const x = corner.x + (Math.random() * 2 - 1) * 0.5;
      const y = corner.y + (Math.random() * 2 - 1) * 0.5;
      const bird = new Bird(
        this.birdFlapTextures,
        this.birdDeadTexture,
        x,
        y,
        () => this.plane.getWorldPosition(),
        () => this.birds.filter((b) => b.isAlive()),
        (b) => this.onBirdDeath(b)
      );
      this.birdLayer.addChild(bird);
      this.birds.push(bird);
    }
    audioManager.playEnemySpawn();
  }

  /** Zoomed camera: follow plane with damp; clamp so padded edges don't pan past the level. */
  private updateWorldView(dt = 0): void {
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const pad = VIEW_PADDING_PX;
    const usableW = Math.max(1, sw - pad * 2);
    const usableH = Math.max(1, sh - pad * 2);
    const scale = usableH / (CAMERA_VIEW_HALF_HEIGHT * 2);
    this.worldContainer.scale.set(scale);

    const viewHalfW = usableW / (2 * scale);
    const viewHalfH = CAMERA_VIEW_HALF_HEIGHT;

    let minCamX = LEVEL_BOUNDS.minX + viewHalfW;
    let maxCamX = LEVEL_BOUNDS.maxX - viewHalfW;
    let minCamY = LEVEL_BOUNDS.minY + viewHalfH;
    let maxCamY = LEVEL_BOUNDS.maxY - viewHalfH;
    if (minCamX > maxCamX) {
      minCamX = maxCamX = (LEVEL_BOUNDS.minX + LEVEL_BOUNDS.maxX) * 0.5;
    }
    if (minCamY > maxCamY) {
      minCamY = maxCamY = (LEVEL_BOUNDS.minY + LEVEL_BOUNDS.maxY) * 0.5;
    }

    const targetX = Math.max(minCamX, Math.min(maxCamX, this.plane.x));
    const targetY = Math.max(minCamY, Math.min(maxCamY, this.plane.y));

    if (dt > 0 && Globals.inGame) {
      const damp = this.smoothDamp2D(this.camX, this.camY, targetX, targetY, dt);
      this.camX = damp.x;
      this.camY = damp.y;
    } else {
      this.camX = targetX;
      this.camY = targetY;
      this.camVelX = 0;
      this.camVelY = 0;
    }

    this.worldContainer.x = sw / 2 - this.camX * scale;
    this.worldContainer.y = sh / 2 - this.camY * scale;
  }

  /** Unity-like SmoothDamp for camera follow. */
  private smoothDamp2D(
    currentX: number,
    currentY: number,
    targetX: number,
    targetY: number,
    dt: number
  ): { x: number; y: number } {
    const smoothTime = Math.max(0.0001, CAMERA_DAMP_TIME);
    const omega = 2 / smoothTime;
    const x = omega * dt;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

    const changeX = currentX - targetX;
    const changeY = currentY - targetY;
    const tempX = (this.camVelX + omega * changeX) * dt;
    const tempY = (this.camVelY + omega * changeY) * dt;
    this.camVelX = (this.camVelX - omega * tempX) * exp;
    this.camVelY = (this.camVelY - omega * tempY) * exp;
    return {
      x: currentX - changeX + (changeX + tempX) * exp,
      y: currentY - changeY + (changeY + tempY) * exp,
    };
  }

  private tick(): void {
    const dt = this.app.ticker.deltaMS / 1000;
    if (!Globals.inGame) return;

    audioManager.beginFrame();

    this.prevPlaneX = this.plane.x;
    this.prevPlaneY = this.plane.y;
    this.plane.update(dt);
    this.updateWorldView(dt);
    this.debugBirdCollisionChecks.length = 0;
    this.debugBalloonSweepPoints.length = 0;

    for (const cloud of this.clouds) {
      cloud.update(dt);
    }

    this.exhaustAccum += dt;
    while (this.exhaustAccum >= EXHAUST_SPAWN_INTERVAL) {
      this.exhaustAccum -= EXHAUST_SPAWN_INTERVAL;
      const now = performance.now() / 1000;
      const exhaust = new Exhaust(
        this.exhaustTexture,
        this.plane.x,
        this.plane.y,
        this.plane.rotation,
        now
      );
      this.exhaustLayer.addChild(exhaust);
      this.exhausts.push(exhaust);
    }

    const now = performance.now() / 1000;
    for (let i = this.exhausts.length - 1; i >= 0; i--) {
      if (this.exhausts[i].update(now)) {
        this.exhaustLayer.removeChild(this.exhausts[i]);
        this.exhausts[i].destroy();
        this.exhausts.splice(i, 1);
      }
    }

    for (const balloon of this.balloons) {
      balloon.update(dt);
    }

    for (const bird of this.birds) {
      bird.update(dt);
    }
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i];
      if (!bird.isDead()) continue;
      if (bird.y <= LEVEL_BOUNDS.maxY + BIRD_DEAD_DESPAWN_MARGIN) continue;
      this.birdLayer.removeChild(bird);
      bird.destroy();
      this.birds.splice(i, 1);
    }

    const px = this.plane.x;
    const py = this.plane.y;
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i];
      if (!bird.isAlive()) continue;
      const isHit = pixelPerfectOverlap(
        this.plane,
        bird,
        SkyScene.COLLISION_ALPHA_THRESHOLD,
        0,
        0,
        PLANE_BIRD_COLLISION_INSET
      );
      this.debugBirdCollisionChecks.push({ bird, hit: isHit });
      if (isHit) {
        Globals.inGame = false;
        audioManager.playPlayerDead();
        this.onGameOver();
        return;
      }
    }

    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      const bx = b.getWorldPosition().x;
      const by = b.getWorldPosition().y;
      const dist = this.segmentToPointDistance(this.prevPlaneX, this.prevPlaneY, px, py, bx, by);
      let hitBalloon = false;
      if (dist < BALLOON_COLLECT_RADIUS) {
        const hb = this.getBalloonHitbox(b);
        for (let s = 0; s < SkyScene.SWEEP_SAMPLES; s++) {
          const t = s / (SkyScene.SWEEP_SAMPLES - 1);
          const sampleX = this.prevPlaneX + (px - this.prevPlaneX) * t;
          const sampleY = this.prevPlaneY + (py - this.prevPlaneY) * t;
          const offsetX = sampleX - px;
          const offsetY = sampleY - py;
          const sampleHit = spriteOpaquePixelsOverlapEllipse(
            this.plane,
            hb.cx,
            hb.cy,
            hb.rx,
            hb.ry,
            SkyScene.COLLISION_ALPHA_THRESHOLD,
            offsetX,
            offsetY
          );
          this.debugBalloonSweepPoints.push({ x: sampleX, y: sampleY, hit: sampleHit });
          if (sampleHit) {
            hitBalloon = true;
            break;
          }
        }
      }
      if (hitBalloon) {
        Globals.score += 25 * Globals.scoreMultiplier;
        const explosionRadius = this.getBalloonExplosionRadius(b);
        const blastX = bx;
        const blastY = by - BALLOON_BULB_OFFSET;
        let anyBirdHit = false;
        for (const bird of this.birds) {
          if (bird.isDead()) continue;
          const pos = bird.getWorldPosition();
          const d = Math.hypot(pos.x - blastX, pos.y - blastY);
          if (d < explosionRadius) {
            bird.hit({ x: blastX, y: blastY });
            anyBirdHit = true;
          }
        }
        if (anyBirdHit) setTimeout(() => audioManager.playEnemySpawn(), 250);
        const particle = new BalloonPopParticle(blastX, blastY, now, explosionRadius);
        this.particleLayer.addChild(particle);
        this.particles.push(particle);
        this.balloonLayer.removeChild(b);
        b.destroy();
        this.balloons.splice(i, 1);
        audioManager.playBalloonPop();
      }
    }

    this.birdSpawnAccum += dt;
    if (this.birdSpawnAccum >= BIRD_SPAWN_INTERVAL) {
      this.birdSpawnAccum = 0;
      this.spawnBirds();
    }

    for (let i = this.multipliers.length - 1; i >= 0; i--) {
      const pickup = this.multipliers[i];
      if (pickup.update(dt, now, px, py, this.getMultiplierAttractRadius())) {
        if (pickup.wasCollected()) {
          Globals.scoreMultiplier += 1;
          audioManager.playMultiplierPickup();
        }
        this.multiplierLayer.removeChild(pickup);
        pickup.destroy();
        this.multipliers.splice(i, 1);
      }
    }

    this.balloonSpawnAccum += dt;
    if (this.balloonSpawnAccum >= this.nextBalloonSpawnDelay) {
      this.balloonSpawnAccum = 0;
      this.nextBalloonSpawnDelay = BALLOON_SPAWN_MIN + Math.random() * (BALLOON_SPAWN_MAX - BALLOON_SPAWN_MIN);
      audioManager.playBalloonSpawn();
      const x = LEVEL_BOUNDS.minX + Math.random() * (LEVEL_BOUNDS.maxX - LEVEL_BOUNDS.minX);
      const y = LEVEL_BOUNDS.minY + Math.random() * (LEVEL_BOUNDS.maxY - LEVEL_BOUNDS.minY);
      const balloon = new Balloon(this.balloonTexture, x, y);
      balloon.scale.set(BALLOON_SCALE);
      this.balloonLayer.addChild(balloon);
      this.balloons.push(balloon);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].update(dt)) {
        this.particleLayer.removeChild(this.particles[i]);
        this.particles[i].destroy();
        this.particles.splice(i, 1);
      }
    }

    this.drawCollisionDebug();

    this.scoreText.text = String(Globals.score);
    this.multiplierText.text = `x ${Globals.scoreMultiplier}`;
  }

  private getBalloonHitbox(balloon: Balloon): { cx: number; cy: number; rx: number; ry: number } {
    const bounds = balloon.getBounds();
    return {
      cx: bounds.x + bounds.width * 0.5,
      cy: bounds.y + bounds.height * BALLOON_HITBOX_CENTER_Y_FACTOR,
      rx: bounds.width * BALLOON_HITBOX_RADIUS_X_FACTOR,
      ry: bounds.height * BALLOON_HITBOX_RADIUS_Y_FACTOR,
    };
  }

  /** Stun blast radius in world units: balloon bulb radius × explosion factor. */
  private getBalloonExplosionRadius(balloon: Balloon): number {
    const rx = balloon.texture.width * Math.abs(balloon.scale.x) * BALLOON_HITBOX_RADIUS_X_FACTOR;
    const ry = balloon.texture.height * Math.abs(balloon.scale.y) * BALLOON_HITBOX_RADIUS_Y_FACTOR;
    return Math.max(rx, ry) * BALLOON_EXPLOSION_RADIUS_FACTOR;
  }

  /** Star magnet range: a bit smaller than a typical balloon explosion. */
  private getMultiplierAttractRadius(): number {
    const rx = this.balloonTexture.width * BALLOON_SCALE * BALLOON_HITBOX_RADIUS_X_FACTOR;
    const ry = this.balloonTexture.height * BALLOON_SCALE * BALLOON_HITBOX_RADIUS_Y_FACTOR;
    return Math.max(rx, ry) * BALLOON_EXPLOSION_RADIUS_FACTOR * MULTIPLIER_ATTRACT_EXPLOSION_FACTOR;
  }

  updateLayout(): void {
    this.updateWorldView();
  }
}
