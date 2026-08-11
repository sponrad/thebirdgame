import { Particle, ParticleContainer, Texture } from 'pixi.js';
import {
  BALLOON_POP_PARTICLE_DURATION,
  BALLOON_POP_CONFETTI_COUNT,
  BALLOON_POP_CONFETTI_DRAG,
  BALLOON_POP_CONFETTI_GRAVITY,
  BALLOON_POP_CONFETTI_SPIN_MAX,
  BALLOON_POP_CONFETTI_REACH_MIN,
  BALLOON_POP_CONFETTI_REACH_MAX,
} from './constants';

const CONFETTI_COLORS = [
  0xff3b30, 0xff9500, 0xffcc00, 0x34c759, 0x5ac8fa, 0x007aff, 0xaf52de, 0xff2d55, 0xffffff,
];

/** Enough for several overlapping pops without allocating mid-game. */
const POOL_SIZE = BALLOON_POP_CONFETTI_COUNT * 5;

type Bit = {
  particle: Particle;
  vx: number;
  vy: number;
  spin: number;
  life: number;
  maxLife: number;
  baseScaleX: number;
  baseScaleY: number;
};

/**
 * GPU-batched confetti via Pixi v8 ParticleContainer.
 * Particles are pooled; gameplay never constructs sprites on pop.
 */
export class ConfettiSystem {
  readonly view: ParticleContainer;
  private free: Bit[] = [];
  private live: Bit[] = [];

  constructor() {
    this.view = new ParticleContainer({
      texture: Texture.WHITE,
      dynamicProperties: {
        position: true,
        rotation: true,
        color: true, // alpha fade
        vertex: true, // scale shrink
      },
    });

    for (let i = 0; i < POOL_SIZE; i++) {
      this.free.push(this.makeBit());
    }
  }

  private makeBit(): Bit {
    const particle = new Particle({
      texture: Texture.WHITE,
      anchorX: 0.5,
      anchorY: 0.5,
      alpha: 0,
    });
    return {
      particle,
      vx: 0,
      vy: 0,
      spin: 0,
      life: 0,
      maxLife: 1,
      baseScaleX: 1,
      baseScaleY: 1,
    };
  }

  /** Spawn a burst at world position (balloon bulb). */
  burst(x: number, y: number, radius: number): void {
    const stunR = Math.max(1, radius);
    let spawned = 0;

    for (let i = 0; i < BALLOON_POP_CONFETTI_COUNT; i++) {
      const bit = this.free.pop() ?? this.makeBit();
      const p = bit.particle;

      const w = 0.22 + Math.random() * 0.45;
      const h = Math.random() < 0.35 ? w : 0.12 + Math.random() * 0.28;
      bit.baseScaleX = w;
      bit.baseScaleY = h;

      p.x = x;
      p.y = y;
      p.scaleX = w;
      p.scaleY = h;
      p.rotation = Math.random() * Math.PI * 2;
      p.tint = CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0]!;
      p.alpha = 1;

      const angle = Math.random() * Math.PI * 2;
      const reachFactor =
        BALLOON_POP_CONFETTI_REACH_MIN +
        Math.random() * (BALLOON_POP_CONFETTI_REACH_MAX - BALLOON_POP_CONFETTI_REACH_MIN);
      const speed = stunR * reachFactor * BALLOON_POP_CONFETTI_DRAG;

      bit.vx = Math.cos(angle) * speed;
      bit.vy = Math.sin(angle) * speed + (-2 - Math.random() * 5);
      bit.spin = (Math.random() * 2 - 1) * BALLOON_POP_CONFETTI_SPIN_MAX;
      bit.life = 0;
      bit.maxLife = BALLOON_POP_PARTICLE_DURATION * (0.65 + Math.random() * 0.45);

      this.view.addParticle(p);
      this.live.push(bit);
      spawned++;
    }

    if (spawned > 0) {
      // Membership / static upload after batch add.
      this.view.update();
    }
  }

  update(dt: number): void {
    if (this.live.length === 0) return;

    const damp = Math.exp(-BALLOON_POP_CONFETTI_DRAG * dt);
    const grav = BALLOON_POP_CONFETTI_GRAVITY * dt;
    let write = 0;
    let removed = false;

    for (let i = 0; i < this.live.length; i++) {
      const bit = this.live[i]!;
      bit.life += dt;

      if (bit.life >= bit.maxLife) {
        this.view.removeParticle(bit.particle);
        bit.particle.alpha = 0;
        this.free.push(bit);
        removed = true;
        continue;
      }

      bit.vx *= damp;
      bit.vy = bit.vy * damp + grav;
      bit.spin *= damp;

      const p = bit.particle;
      p.x += bit.vx * dt;
      p.y += bit.vy * dt;
      p.rotation += bit.spin * dt;

      const t = bit.life / bit.maxLife;
      p.alpha = 1 - t * t;
      const s = 1 - t * 0.35;
      p.scaleX = bit.baseScaleX * s;
      p.scaleY = bit.baseScaleY * s;

      this.live[write++] = bit;
    }

    this.live.length = write;
    if (removed) this.view.update();
  }

  clear(): void {
    for (const bit of this.live) {
      this.view.removeParticle(bit.particle);
      bit.particle.alpha = 0;
      this.free.push(bit);
    }
    this.live.length = 0;
    this.view.update();
  }

  destroy(): void {
    this.clear();
    this.free.length = 0;
    this.view.destroy();
  }
}
