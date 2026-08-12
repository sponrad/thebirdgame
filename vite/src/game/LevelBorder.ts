import { Graphics } from 'pixi.js';
import {
  LEVEL_BOUNDS,
  BORDER_DASH_LENGTH,
  BORDER_GAP_LENGTH,
  BORDER_STROKE_WIDTH,
  BORDER_COLOR,
  BORDER_WARN_DISTANCE,
  BORDER_BASE_ALPHA,
} from './constants';

type Dash = { x1: number; y1: number; x2: number; y2: number; mx: number; my: number };

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
      out.push({ x1: ax, y1: ay, x2: bx, y2: by, mx: (ax + bx) * 0.5, my: (ay + by) * 0.5 });
    }
    d = next;
    drawing = !drawing;
  }
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
 * Dashed rectangle along level bounds.
 * Nearly invisible by default; dashes near the plane fade in and darken to black.
 */
export class LevelBorder extends Graphics {
  private readonly dashes: Dash[] = [];

  constructor() {
    super();
    const { minX, minY, maxX, maxY } = LEVEL_BOUNDS;
    collectDashes(minX, minY, maxX, minY, this.dashes);
    collectDashes(maxX, minY, maxX, maxY, this.dashes);
    collectDashes(maxX, maxY, minX, maxY, this.dashes);
    collectDashes(minX, maxY, minX, minY, this.dashes);
    this.redraw(0, 0);
  }

  update(planeX: number, planeY: number, _dt: number): void {
    this.redraw(planeX, planeY);
  }

  private redraw(planeX: number, planeY: number): void {
    this.clear();
    const warnR = BORDER_WARN_DISTANCE;
    const warnR2 = warnR * warnR;

    for (let i = 0; i < this.dashes.length; i++) {
      const d = this.dashes[i]!;
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
