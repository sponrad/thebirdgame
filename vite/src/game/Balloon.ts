import { Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { LEVEL_BOUNDS, BALLOON_SPEED } from './constants';

/** Smaller drift per frame so movement is gentler (Unity used ±1 but that accumulates fast). */
const BALLOON_DRIFT_STRENGTH = 0.2;

/**
 * Balloon drifts with random direction changes and stays inside level bounds.
 * Position is in world space for collision with plane.
 */
export class Balloon extends Sprite {
  private dirX: number;
  private dirY: number;

  constructor(texture: Texture, x: number, y: number) {
    super(texture);
    this.anchor.set(0.5, 0.5);
    this.x = x;
    this.y = y;
    this.dirX = 0;
    this.dirY = 1;
  }

  update(dt: number): void {
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
