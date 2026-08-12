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
  private collectAnim = 0;

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
    if (this.collected) {
      this.collectAnim += dt;
      const t = Math.min(1, this.collectAnim / 0.14);
      this.x += (planeX - this.x) * Math.min(1, dt * 18);
      this.y += (planeY - this.y) * Math.min(1, dt * 18);
      this.rotation += 18 * dt;
      this.scale.set(MULTIPLIER_SCALE * (1.35 - t * 1.35));
      this.alpha = 1 - t;
      return t >= 1;
    }

    if (now - this.spawnTime >= MULTIPLIER_PICKUP_LIFETIME) return true;

    this.rotation += 3.2 * dt;

    const dx = planeX - this.x;
    const dy = planeY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= MULTIPLIER_COLLECT_RADIUS) {
      this.collected = true;
      this.collectAnim = 0;
      return false;
    }

    if (dist <= attractRadius) this.magnetized = true;

    if (this.magnetized && dist > 1e-4) {
      const step = Math.min(dist, MULTIPLIER_SPEED * dt);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      const pull = 1 - Math.min(1, dist / Math.max(1e-4, attractRadius));
      this.scale.set(MULTIPLIER_SCALE * (1 + pull * 0.55));
    } else {
      const pulse = 1 + Math.sin(now * 6) * 0.08;
      this.scale.set(MULTIPLIER_SCALE * pulse);
    }

    return false;
  }
}
