import { Graphics } from 'pixi.js';
import {
  LEVEL_BOUNDS,
  BORDER_DASH_LENGTH,
  BORDER_GAP_LENGTH,
  BORDER_STROKE_WIDTH,
  BORDER_COLOR,
} from './constants';

function drawDashedSegment(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
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
      g.moveTo(x1 + ux * d, y1 + uy * d);
      g.lineTo(x1 + ux * next, y1 + uy * next);
    }
    d = next;
    drawing = !drawing;
  }
}

/** Dashed rectangle along level bounds (playing-field perimeter). */
export function createLevelBorder(): Graphics {
  const g = new Graphics();
  const { minX, minY, maxX, maxY } = LEVEL_BOUNDS;
  drawDashedSegment(g, minX, minY, maxX, minY);
  drawDashedSegment(g, maxX, minY, maxX, maxY);
  drawDashedSegment(g, maxX, maxY, minX, maxY);
  drawDashedSegment(g, minX, maxY, minX, minY);
  g.stroke({ width: BORDER_STROKE_WIDTH, color: BORDER_COLOR, alpha: 0.85 });
  return g;
}
