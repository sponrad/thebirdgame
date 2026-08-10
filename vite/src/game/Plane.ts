import { Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { LEVEL_BOUNDS, PLANE_SPEED, PLANE_ROTATION_SPEED } from './constants';

/** Nose is at top of sprite; top of plane (dorsal) is on left. No rotation offset needed. */
const SPRITE_ROTATION_OFFSET = 0;

/**
 * Plane moves forward in its facing direction; left/right input rotates.
 * Position is clamped to level bounds. Sprite flips when facing left (Unity flipX).
 */
export class Plane extends Sprite {
  private rotationSpeed = PLANE_ROTATION_SPEED;
  private speed = PLANE_SPEED;
  private keysLeft = false;
  private keysRight = false;
  private pointerLeft = false;
  private pointerRight = false;
  /** Logical heading in radians (0 = up); display rotation = heading + offset. */
  private heading = 0;

  constructor(texture: Texture) {
    super(texture);
    this.anchor.set(0.5, 0.5);

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  setInputKeys(left: boolean, right: boolean): void {
    this.keysLeft = left;
    this.keysRight = right;
  }

  setInputPointer(left: boolean, right: boolean): void {
    this.pointerLeft = left;
    this.pointerRight = right;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'a' || e.key === 'ArrowLeft') this.keysLeft = true;
    if (e.key === 'd' || e.key === 'ArrowRight') this.keysRight = true;
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.key === 'a' || e.key === 'ArrowLeft') this.keysLeft = false;
    if (e.key === 'd' || e.key === 'ArrowRight') this.keysRight = false;
  };

  update(dt: number): void {
    const turn = this.rotationSpeed * dt;
    if (this.keysLeft || this.pointerLeft) this.heading -= turn;
    if (this.keysRight || this.pointerRight) this.heading += turn;

    const dx = Math.sin(this.heading) * this.speed * dt;
    const dy = -Math.cos(this.heading) * this.speed * dt;
    this.x += dx;
    this.y += dy;

    this.x = Math.max(LEVEL_BOUNDS.minX, Math.min(LEVEL_BOUNDS.maxX, this.x));
    this.y = Math.max(LEVEL_BOUNDS.minY, Math.min(LEVEL_BOUNDS.maxY, this.y));

    this.rotation = this.heading + SPRITE_ROTATION_OFFSET;

    const deg = (this.heading * 180) / Math.PI;
    const normalized = ((deg % 360) + 360) % 360;
    const flip = normalized > 181 || normalized <= 1 ? -1 : 1;
    const base = this.scale.y;
    this.scale.x = flip * Math.abs(base);
  }

  getWorldPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  resetHeading(): void {
    this.heading = 0;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    super.destroy();
  }
}
