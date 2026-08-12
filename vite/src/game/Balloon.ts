import { Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { LEVEL_BOUNDS, BALLOON_SPEED, BALLOON_SCALE } from './constants';

/** Smaller drift per frame so movement is gentler (Unity used ±1 but that accumulates fast). */
const BALLOON_DRIFT_STRENGTH = 0.2;
const POP_SQUASH_TIME = 0.07;

/**
 * Balloon drifts with random direction changes and stays inside level bounds.
 * Position is in world space for collision with plane.
 */
export class Balloon extends Sprite {
  private dirX: number;
  private dirY: number;
  private bobPhase: number;
  private baseScale = BALLOON_SCALE;
  private popping = false;
  private popAccum = 0;

  constructor(texture: Texture, x: number, y: number) {
    super(texture);
    this.anchor.set(0.5, 0.5);
    this.x = x;
    this.y = y;
    this.dirX = 0;
    this.dirY = 1;
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  /** Begin squash-before-pop. Returns true once ready to destroy / explode. */
  beginPop(): boolean {
    if (!this.popping) {
      this.popping = true;
      this.popAccum = 0;
    }
    return this.popAccum >= POP_SQUASH_TIME;
  }

  isPopping(): boolean {
    return this.popping;
  }

  update(dt: number): void {
    if (this.popping) {
      this.popAccum += dt;
      const t = Math.min(1, this.popAccum / POP_SQUASH_TIME);
      // Squash: widen + flatten, then slight overshoot.
      const sx = this.baseScale * (1 + 0.35 * t);
      const sy = this.baseScale * (1 - 0.45 * t);
      this.scale.set(sx, sy);
      return;
    }

    this.dirX += (Math.random() * 2 - 1) * BALLOON_DRIFT_STRENGTH;
    this.dirY += (Math.random() * 2 - 1) * BALLOON_DRIFT_STRENGTH;
    const len = Math.hypot(this.dirX, this.dirY) || 1;
    const maxLen = 2;
    if (len > maxLen) {
      this.dirX = (this.dirX / len) * maxLen;
      this.dirY = (this.dirY / len) * maxLen;
    }
    this.x += this.dirX * BALLOON_SPEED * dt;
    this.y += this.dirY * BALLOON_SPEED * dt;

    this.bobPhase += dt * 2.4;
    const bob = 1 + Math.sin(this.bobPhase) * 0.045;
    this.scale.set(this.baseScale * bob, this.baseScale * (2 - bob));

    const cx = Math.max(LEVEL_BOUNDS.minX, Math.min(LEVEL_BOUNDS.maxX, this.x));
    const cy = Math.max(LEVEL_BOUNDS.minY, Math.min(LEVEL_BOUNDS.maxY, this.y));
    if (cx !== this.x || cy !== this.y) {
      this.x = cx;
      this.y = cy;
      this.dirX = 0;
      this.dirY = 0;
    }
  }

  getWorldPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
