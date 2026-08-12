import { Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { Globals } from './Globals';
import {
  LEVEL_BOUNDS,
  BIRD_SPEED,
  BIRD_ROTATION_SPEED,
  BIRD_ENEMY_DISTANCE_RADIUS,
  BIRD_BIRTH_TIME,
  BIRD_FLAP_FRAME_DURATION,
  BIRD_FLAP_CYCLE_DELAY_MIN,
  BIRD_FLAP_CYCLE_DELAY_MAX,
  BIRD_SCALE_BIRTH,
  BIRD_SCALE_ALIVE,
  BIRD_DEAD_GRAVITY,
  BIRD_DEAD_KNOCKBACK_SPEED,
  BIRD_DEAD_KNOCKBACK_VARIANCE_MIN,
  BIRD_DEAD_KNOCKBACK_VARIANCE_MAX,
  BIRD_DEAD_KNOCKBACK_ANGLE_JITTER,
  BIRD_DEAD_SPIN_MIN,
  BIRD_DEAD_SPIN_MAX,
  BIRD_DEAD_TINT,
  BIRD_DEAD_ALPHA,
} from './constants';

/** Normalize angle to [-π, π] */
function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export type GetPlanePosition = () => { x: number; y: number };
export type GetOtherBirds = () => Bird[];
export type OnBirdDeath = (bird: Bird) => void;

/**
 * Bird: birthing phase (scale up, rule2 only), then alive (chase plane + rule2, flap).
 * hit() → dead sprite, remove from list, add score, spawn multiplier (via callback).
 */
export class Bird extends Sprite {
  private static nextSepId = 1;
  private readonly sepId: number;
  private flapTextures: Texture[];
  private deadTexture: Texture;
  private getPlanePosition: GetPlanePosition;
  private getOtherBirds: GetOtherBirds;
  private onDeath: OnBirdDeath;

  private birthing = true;
  private birthAccum = 0;
  private alive = false;
  private dead = false;

  private flapAccum = 0;
  private flapFrameIndex = 0;
  private inFlapCycle = false;
  private flapCycleDelayAccum = 0;
  private deadVelocityX = 0;
  private deadVelocityY = 0;
  private deadSpinSpeed = 0;
  /** After birth: settle from overshoot scale down to alive. */
  private scaleSettle = 0;

  constructor(
    flapTextures: Texture[],
    deadTexture: Texture,
    x: number,
    y: number,
    getPlanePosition: GetPlanePosition,
    getOtherBirds: GetOtherBirds,
    onDeath: OnBirdDeath
  ) {
    super(flapTextures[0]);
    this.sepId = Bird.nextSepId++;
    this.flapTextures = flapTextures;
    this.deadTexture = deadTexture;
    this.anchor.set(0.5, 0.5);
    this.x = x;
    this.y = y;
    this.getPlanePosition = getPlanePosition;
    this.getOtherBirds = getOtherBirds;
    this.onDeath = onDeath;
    this.scale.set(BIRD_SCALE_BIRTH);
  }

  isAlive(): boolean {
    return this.alive && !this.dead;
  }

  isDead(): boolean {
    return this.dead;
  }

  getWorldPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** Rule2: separation from nearby birds (Unity BirdControlScript.rule2). */
  private rule2(): { x: number; y: number } {
    let cx = 0;
    let cy = 0;
    const others = this.getOtherBirds();
    const r2 = BIRD_ENEMY_DISTANCE_RADIUS * BIRD_ENEMY_DISTANCE_RADIUS;
    // Alternate parity by id so we keep O(n/2) checks without Math.random each frame.
    const start = (this.sepId & 1) as 0 | 1;
    for (let j = start; j < others.length; j += 2) {
      const e = others[j]!;
      if (e === this || !e.isAlive()) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= r2 && distSq > 0) {
        const inv = 1 / Math.sqrt(distSq);
        cx -= dx * inv;
        cy -= dy * inv;
      }
    }
    return { x: cx * 0.5, y: cy * 0.5 };
  }

  /** Called after BIRD_BIRTH_TIME to become alive (enable chase, set scale). */
  private born(): void {
    this.birthing = false;
    this.alive = true;
    this.scale.set(BIRD_SCALE_ALIVE * 1.28);
    this.scaleSettle = 0.22;
    this.startFlapCycle();
  }

  private startFlapCycle(): void {
    this.inFlapCycle = true;
    this.flapAccum = 0;
    this.flapFrameIndex = 0;
  }

  private startFlapDelay(): void {
    this.inFlapCycle = false;
    this.flapCycleDelayAccum =
      BIRD_FLAP_CYCLE_DELAY_MIN +
      Math.random() * (BIRD_FLAP_CYCLE_DELAY_MAX - BIRD_FLAP_CYCLE_DELAY_MIN);
  }

  /** Hit by balloon explosion: stop flapping, gray out, knock back, spin, fall. */
  hit(sourcePoint?: { x: number; y: number }): void {
    if (this.dead) return;
    this.dead = true;
    this.alive = false;
    this.birthing = false;
    this.inFlapCycle = false;
    this.texture = this.deadTexture;
    this.tint = BIRD_DEAD_TINT;
    this.alpha = BIRD_DEAD_ALPHA;

    const origin = sourcePoint ?? { x: this.x, y: this.y };
    const awayX = this.x - origin.x;
    const awayY = this.y - origin.y;
    const dist = Math.hypot(awayX, awayY);
    const baseAngle =
      dist > 1e-4 ? Math.atan2(awayY, awayX) : Math.random() * Math.PI * 2;
    const angle =
      baseAngle + (Math.random() * 2 - 1) * BIRD_DEAD_KNOCKBACK_ANGLE_JITTER;
    const speedMul =
      BIRD_DEAD_KNOCKBACK_VARIANCE_MIN +
      Math.random() * (BIRD_DEAD_KNOCKBACK_VARIANCE_MAX - BIRD_DEAD_KNOCKBACK_VARIANCE_MIN);
    const speed = BIRD_DEAD_KNOCKBACK_SPEED * speedMul;
    this.deadVelocityX = Math.cos(angle) * speed;
    this.deadVelocityY = Math.sin(angle) * speed;

    const spinMag =
      BIRD_DEAD_SPIN_MIN + Math.random() * (BIRD_DEAD_SPIN_MAX - BIRD_DEAD_SPIN_MIN);
    this.deadSpinSpeed = (Math.random() < 0.5 ? -1 : 1) * spinMag;

    Globals.score += 25 * Globals.scoreMultiplier;
    this.onDeath(this);
  }

  update(dt: number): void {
    if (this.dead) {
      this.deadVelocityY += BIRD_DEAD_GRAVITY * dt;
      this.x += this.deadVelocityX * dt;
      this.y += this.deadVelocityY * dt;
      this.rotation += this.deadSpinSpeed * dt;
      return;
    }

    if (this.birthing) {
      this.birthAccum += dt;
      const t = Math.min(1, this.birthAccum / BIRD_BIRTH_TIME);
      // Ease-out-back style overshoot into birth end.
      const over = t * t * (2.6 * t - 1.6);
      const scale =
        BIRD_SCALE_BIRTH +
        Math.min(1.28, Math.max(0, over)) * (BIRD_SCALE_ALIVE - BIRD_SCALE_BIRTH);
      this.scale.set(scale);
      const v2 = this.rule2();
      this.x += v2.x * BIRD_SPEED * dt;
      this.y += v2.y * BIRD_SPEED * dt;
      if (this.birthAccum >= BIRD_BIRTH_TIME) this.born();
      return;
    }

    if (!this.alive) return;

    const plane = this.getPlanePosition();
    const dx = plane.x - this.x;
    const dy = plane.y - this.y;
    const targetAngle = Math.atan2(dy, dx);
    const currentAngle = this.rotation;
    const diff = normalizeAngle(targetAngle - currentAngle);
    const maxTurn = BIRD_ROTATION_SPEED * dt;
    this.rotation = currentAngle + clamp(diff, -maxTurn, maxTurn);

    const v2 = this.rule2();
    const forwardX = Math.cos(this.rotation);
    const forwardY = Math.sin(this.rotation);
    this.x += (forwardX + v2.x) * BIRD_SPEED * dt;
    this.y += (forwardY + v2.y) * BIRD_SPEED * dt;

    this.x = Math.max(LEVEL_BOUNDS.minX, Math.min(LEVEL_BOUNDS.maxX, this.x));
    this.y = Math.max(LEVEL_BOUNDS.minY, Math.min(LEVEL_BOUNDS.maxY, this.y));

    let liveScale = BIRD_SCALE_ALIVE;
    if (this.scaleSettle > 0) {
      this.scaleSettle = Math.max(0, this.scaleSettle - dt);
      const t = this.scaleSettle / 0.22;
      liveScale = BIRD_SCALE_ALIVE * (1 + 0.28 * t);
    }
    // Facing left (cos < 0) → flip sprite vertically vs Unity mid-flight.
    this.scale.y = Math.cos(this.rotation) < 0 ? -liveScale : liveScale;
    this.scale.x = liveScale;

    if (this.inFlapCycle) {
      this.flapAccum += dt;
      if (this.flapAccum >= BIRD_FLAP_FRAME_DURATION) {
        this.flapAccum = 0;
        this.flapFrameIndex++;
        if (this.flapFrameIndex >= this.flapTextures.length) {
          this.texture = this.flapTextures[0];
          this.startFlapDelay();
        } else {
          this.texture = this.flapTextures[this.flapFrameIndex];
        }
      }
    } else {
      this.flapCycleDelayAccum -= dt;
      if (this.flapCycleDelayAccum <= 0) this.startFlapCycle();
    }
  }
}
