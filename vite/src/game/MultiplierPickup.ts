import { Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import {
  MULTIPLIER_PICKUP_LIFETIME,
  MULTIPLIER_SCALE,
  MULTIPLIER_SPEED,
  MULTIPLIER_COLLECT_RADIUS,
} from './constants';

/**
 * Star pickup dropped when a bird is killed.
 * Within attract radius: moves toward plane. On collect: caller bumps multiplier + plays sound.
 */
export class MultiplierPickup extends Sprite {
  private spawnTime: number;
  private collected = false;
  private magnetized = false;

  constructor(texture: Texture, x: number, y: number, spawnTime: number) {
    super(texture);
    this.anchor.set(0.5, 0.5);
    this.scale.set(MULTIPLIER_SCALE);
    this.x = x;
    this.y = y;
    this.spawnTime = spawnTime;
  }

  getWorldPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  wasCollected(): boolean {
    return this.collected;
  }

  /**
   * @returns true when this pickup should be removed (collected or lifetime expired).
   */
  update(dt: number, now: number, planeX: number, planeY: number, attractRadius: number): boolean {
    if (now - this.spawnTime >= MULTIPLIER_PICKUP_LIFETIME) return true;

    const dx = planeX - this.x;
    const dy = planeY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= MULTIPLIER_COLLECT_RADIUS) {
      this.collected = true;
      return true;
    }

    if (dist <= attractRadius) this.magnetized = true;

    if (this.magnetized && dist > 1e-4) {
      const step = Math.min(dist, MULTIPLIER_SPEED * dt);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }

    return false;
  }
}
