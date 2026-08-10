import { Container, Graphics } from 'pixi.js';
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
  0xff3b30, // red
  0xff9500, // orange
  0xffcc00, // yellow
  0x34c759, // green
  0x5ac8fa, // sky
  0x007aff, // blue
  0xaf52de, // purple
  0xff2d55, // pink
  0xffffff, // white
];

type Bit = {
  g: Graphics;
  vx: number;
  vy: number;
  spin: number;
  life: number;
  maxLife: number;
};

/**
 * Confetti bomb at balloon pop — bits burst to (at least) the stun radius,
 * shed speed fast via drag, then fall with gravity.
 */
export class BalloonPopParticle extends Container {
  private bits: Bit[] = [];
  private age = 0;

  constructor(x: number, y: number, _spawnTime: number, radius: number) {
    super();
    this.x = x;
    this.y = y;

    // With v' = -drag*v, asymptotic travel ≈ speed/drag. Size speed so reach ≥ stun edge.
    const stunR = Math.max(1, radius);

    for (let i = 0; i < BALLOON_POP_CONFETTI_COUNT; i++) {
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const g = new Graphics();
      const w = 0.22 + Math.random() * 0.45;
      const h = 0.12 + Math.random() * 0.28;
      if (Math.random() < 0.35) {
        g.circle(0, 0, w * 0.55).fill({ color });
      } else {
        g.rect(-w / 2, -h / 2, w, h).fill({ color });
      }
      g.rotation = Math.random() * Math.PI * 2;
      this.addChild(g);

      const angle = Math.random() * Math.PI * 2;
      // Random fraction of full blast reach → fill the stun zone, outer edge is the cap.
      const reachFactor =
        BALLOON_POP_CONFETTI_REACH_MIN +
        Math.random() * (BALLOON_POP_CONFETTI_REACH_MAX - BALLOON_POP_CONFETTI_REACH_MIN);
      const speed = stunR * reachFactor * BALLOON_POP_CONFETTI_DRAG;
      const upBias = -2 - Math.random() * 5;

      this.bits.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + upBias,
        spin: (Math.random() * 2 - 1) * BALLOON_POP_CONFETTI_SPIN_MAX,
        life: 0,
        maxLife: BALLOON_POP_PARTICLE_DURATION * (0.65 + Math.random() * 0.45),
      });
    }
  }

  /** Returns true when this burst should be removed. */
  update(dt: number): boolean {
    this.age += dt;
    let alive = 0;

    for (const bit of this.bits) {
      bit.life += dt;
      if (bit.life >= bit.maxLife) {
        bit.g.visible = false;
        continue;
      }
      alive++;
      // Exponential drag: violent pop, then outward speed collapses fast.
      const damp = Math.exp(-BALLOON_POP_CONFETTI_DRAG * dt);
      bit.vx *= damp;
      bit.vy *= damp;
      bit.vy += BALLOON_POP_CONFETTI_GRAVITY * dt;
      bit.g.x += bit.vx * dt;
      bit.g.y += bit.vy * dt;
      bit.g.rotation += bit.spin * dt;
      bit.spin *= damp;

      const t = bit.life / bit.maxLife;
      bit.g.alpha = 1 - t * t;
      const s = 1 - t * 0.35;
      bit.g.scale.set(s);
    }

    return alive === 0 || this.age >= BALLOON_POP_PARTICLE_DURATION * 1.35;
  }
}
