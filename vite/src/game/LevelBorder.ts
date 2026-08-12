import { Graphics } from 'pixi.js';
import {
  LEVEL_BOUNDS,
  BORDER_DASH_LENGTH,
  BORDER_GAP_LENGTH,
  BORDER_STROKE_WIDTH,
  BORDER_COLOR,
  BORDER_WARN_DISTANCE,
  BORDER_BASE_ALPHA,
  BORDER_TOUCH_RADIUS,
  BORDER_WAX_COLOR,
  BORDER_WAX_REVEAL_FRACTION,
} from './constants';

type Dash = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mx: number;
  my: number;
  /** Painted during Wax On; cleared during Wax Off. */
  waxed: boolean;
};

export type WaxPhase = 'waxOn' | 'waxOff';

export type BorderUpdateResult = {
  waxOnComplete: boolean;
  waxOffComplete: boolean;
  /** 0–1 progress for the current phase. */
  progress: number;
  /** True once enough dashes are waxed to reveal neon trails. */
  revealActive: boolean;
  phase: WaxPhase;
};

function collectDashes(x1: number, y1: number, x2: number, y2: number, out: Dash[]): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const ux = dx / len;
  const uy = dy / len;
  let d = 0;
  let drawing = true;
  while (d < len) {
    const seg = drawing ? BORDER_DASH_LENGTH : BORDER_GAP_LENGTH;
    const next = Math.min(len, d + seg);
    if (drawing) {
      const ax = x1 + ux * d;
      const ay = y1 + uy * d;
      const bx = x1 + ux * next;
      const by = y1 + uy * next;
      out.push({
        x1: ax,
        y1: ay,
        x2: bx,
        y2: by,
        mx: (ax + bx) * 0.5,
        my: (ay + by) * 0.5,
        waxed: false,
      });
    }
    d = next;
    drawing = !drawing;
  }
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 1e-8) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpColor(from: number, to: number, t: number): number {
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  return (lerpChannel(fr, tr, t) << 16) | (lerpChannel(fg, tg, t) << 8) | lerpChannel(fb, tb, t);
}

/**
 * Dashed playfield border + Geometry Wars-style Wax On / Wax Off.
 * Near-invisible by default; proximity darkens. Touched dashes paint neon green
 * (visible after 10% coverage), then erase for Wax Off.
 */
export class LevelBorder extends Graphics {
  private readonly dashes: Dash[] = [];
  private phase: WaxPhase = 'waxOn';
  private waxedCount = 0;
  private revealActive = false;

  constructor() {
    super();
    const { minX, minY, maxX, maxY } = LEVEL_BOUNDS;
    collectDashes(minX, minY, maxX, minY, this.dashes);
    collectDashes(maxX, minY, maxX, maxY, this.dashes);
    collectDashes(maxX, maxY, minX, maxY, this.dashes);
    collectDashes(minX, maxY, minX, minY, this.dashes);
    this.redraw(0, 0);
  }

  reset(): void {
    this.phase = 'waxOn';
    this.waxedCount = 0;
    this.revealActive = false;
    for (const d of this.dashes) d.waxed = false;
    this.redraw(0, 0);
  }

  getDashCount(): number {
    return this.dashes.length;
  }

  update(planeX: number, planeY: number, _dt: number): BorderUpdateResult {
    let waxOnComplete = false;
    let waxOffComplete = false;
    const touchR = BORDER_TOUCH_RADIUS;
    const total = this.dashes.length;

    for (let i = 0; i < total; i++) {
      const d = this.dashes[i]!;
      if (distToSegment(planeX, planeY, d.x1, d.y1, d.x2, d.y2) > touchR) continue;

      if (this.phase === 'waxOn') {
        if (!d.waxed) {
          d.waxed = true;
          this.waxedCount += 1;
        }
      } else if (d.waxed) {
        d.waxed = false;
        this.waxedCount -= 1;
      }
    }

    if (!this.revealActive && this.waxedCount / total >= BORDER_WAX_REVEAL_FRACTION) {
      this.revealActive = true;
    }

    if (this.phase === 'waxOn' && this.waxedCount >= total) {
      waxOnComplete = true;
      this.phase = 'waxOff';
      // Stay fully painted; next laps erase.
    } else if (this.phase === 'waxOff' && this.waxedCount <= 0) {
      waxOffComplete = true;
      this.phase = 'waxOn';
      this.revealActive = false;
    }

    this.redraw(planeX, planeY);

    const progress =
      this.phase === 'waxOn'
        ? this.waxedCount / total
        : 1 - this.waxedCount / total;

    return {
      waxOnComplete,
      waxOffComplete,
      progress,
      revealActive: this.revealActive || this.phase === 'waxOff',
      phase: this.phase,
    };
  }

  private redraw(planeX: number, planeY: number): void {
    this.clear();
    const warnR = BORDER_WARN_DISTANCE;
    const warnR2 = warnR * warnR;
    const showWax = this.revealActive || this.phase === 'waxOff';

    for (let i = 0; i < this.dashes.length; i++) {
      const d = this.dashes[i]!;

      if (d.waxed && showWax) {
        this.moveTo(d.x1, d.y1);
        this.lineTo(d.x2, d.y2);
        this.stroke({
          width: BORDER_STROKE_WIDTH * 1.45,
          color: BORDER_WAX_COLOR,
          alpha: 0.95,
        });
        continue;
      }

      const dx = planeX - d.mx;
      const dy = planeY - d.my;
      const dist2 = dx * dx + dy * dy;
      let t = 0;
      if (dist2 < warnR2) {
        const dist = Math.sqrt(dist2);
        const u = 1 - dist / warnR;
        t = u * u;
      }
      const color = t > 0.002 ? lerpColor(BORDER_COLOR, 0x000000, t) : BORDER_COLOR;
      const alpha = BORDER_BASE_ALPHA + t * (1 - BORDER_BASE_ALPHA);
      this.moveTo(d.x1, d.y1);
      this.lineTo(d.x2, d.y2);
      this.stroke({ width: BORDER_STROKE_WIDTH, color, alpha });
    }
  }
}

/** @deprecated Prefer `new LevelBorder()`. */
export function createLevelBorder(): LevelBorder {
  return new LevelBorder();
}
