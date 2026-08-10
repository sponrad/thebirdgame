import { Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { EXHAUST_LIFETIME, EXHAUST_SCALE } from './constants';

export class Exhaust extends Sprite {
  private spawnTime: number;

  constructor(texture: Texture, x: number, y: number, rotation: number, spawnTime: number) {
    super(texture);
    this.anchor.set(0.5, 0.5);
    this.scale.set(EXHAUST_SCALE);
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.spawnTime = spawnTime;
  }

  /** Returns true if this exhaust should be removed. */
  update(now: number): boolean {
    return now - this.spawnTime >= EXHAUST_LIFETIME;
  }
}
