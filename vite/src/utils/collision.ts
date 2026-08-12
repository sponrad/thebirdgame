import { Point, Sprite, Texture } from 'pixi.js';

type AlphaData = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

type OpaquePixel = {
  x: number;
  y: number;
};

const alphaCache = new WeakMap<object, AlphaData>();
const opaqueCache = new WeakMap<Texture, Map<string, OpaquePixel[]>>();
const tmpWorldPoint = new Point();
const tmpLocalPoint = new Point();

function getSourceKey(texture: Texture): object {
  return texture.source as unknown as object;
}

function getCanvasFromTextureSource(texture: Texture): HTMLCanvasElement {
  const source = texture.source;
  const resource = (source as { resource?: unknown }).resource;
  const drawable = (resource ?? source) as CanvasImageSource;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width));
  canvas.height = Math.max(1, Math.round(source.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable for collision extraction');
  ctx.drawImage(drawable, 0, 0);
  return canvas;
}

function getAlphaData(texture: Texture): AlphaData {
  const sourceKey = getSourceKey(texture);
  const cached = alphaCache.get(sourceKey);
  if (cached) return cached;

  const canvas = getCanvasFromTextureSource(texture);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable for collision extraction');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const alphaData: AlphaData = {
    width: canvas.width,
    height: canvas.height,
    pixels: imageData.data,
  };
  alphaCache.set(sourceKey, alphaData);
  return alphaData;
}

function isTextureOpaqueAtWorldPoint(sprite: Sprite, worldX: number, worldY: number, alphaThreshold: number): boolean {
  const texture = sprite.texture;
  const frame = texture.frame;
  const alphaData = getAlphaData(texture);

  sprite.worldTransform.applyInverse({ x: worldX, y: worldY }, tmpLocalPoint);
  const localX = tmpLocalPoint.x + sprite.anchor.x * frame.width;
  const localY = tmpLocalPoint.y + sprite.anchor.y * frame.height;
  const px = Math.floor(localX);
  const py = Math.floor(localY);
  if (px < 0 || py < 0 || px >= frame.width || py >= frame.height) return false;

  const sx = Math.floor(frame.x + px);
  const sy = Math.floor(frame.y + py);
  if (sx < 0 || sy < 0 || sx >= alphaData.width || sy >= alphaData.height) return false;

  const alpha = alphaData.pixels[(sy * alphaData.width + sx) * 4 + 3];
  return alpha >= alphaThreshold;
}

function getOpaquePixels(texture: Texture, alphaThreshold: number, insetPixels = 0): OpaquePixel[] {
  const inset = Math.max(0, Math.floor(insetPixels));
  const cacheKey = `${alphaThreshold}:${inset}`;
  let byKey = opaqueCache.get(texture);
  if (!byKey) {
    byKey = new Map();
    opaqueCache.set(texture, byKey);
  }
  const cached = byKey.get(cacheKey);
  if (cached) return cached;

  const frame = texture.frame;
  const alphaData = getAlphaData(texture);

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return false;
    const sx = Math.floor(frame.x + x);
    const sy = Math.floor(frame.y + y);
    if (sx < 0 || sy < 0 || sx >= alphaData.width || sy >= alphaData.height) return false;
    return alphaData.pixels[(sy * alphaData.width + sx) * 4 + 3] >= alphaThreshold;
  };

  const pixels: OpaquePixel[] = [];
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      if (!isOpaque(x, y)) continue;
      if (inset > 0) {
        let deep = true;
        for (let dy = -inset; dy <= inset && deep; dy++) {
          for (let dx = -inset; dx <= inset; dx++) {
            if (!isOpaque(x + dx, y + dy)) {
              deep = false;
              break;
            }
          }
        }
        if (!deep) continue;
      }
      pixels.push({ x, y });
    }
  }
  byKey.set(cacheKey, pixels);
  return pixels;
}

/**
 * Pixel-perfect overlap using alpha channel.
 * Runs broad-phase AABB first, then per-pixel checks from `primary` into `secondary`.
 * `insetPixels` erodes primary's opaque mask inward (forgiveness without changing secondary).
 * `pixelStride` > 1 skips opaque samples (cheaper, slightly less precise).
 */
export function pixelPerfectOverlap(
  primary: Sprite,
  secondary: Sprite,
  alphaThreshold = 10,
  primaryWorldOffsetX = 0,
  primaryWorldOffsetY = 0,
  insetPixels = 0,
  pixelStride = 1
): boolean {
  const a = primary.getBounds();
  const b = secondary.getBounds();
  const ax = a.x + primaryWorldOffsetX;
  const ay = a.y + primaryWorldOffsetY;
  const hasOverlap = ax < b.x + b.width && ax + a.width > b.x && ay < b.y + b.height && ay + a.height > b.y;
  if (!hasOverlap) return false;

  const opaquePixels = getOpaquePixels(primary.texture, alphaThreshold, insetPixels);
  const frame = primary.texture.frame;
  const stride = Math.max(1, pixelStride | 0);

  for (let i = 0; i < opaquePixels.length; i += stride) {
    const pixel = opaquePixels[i]!;
    const localX = pixel.x - primary.anchor.x * frame.width + 0.5;
    const localY = pixel.y - primary.anchor.y * frame.height + 0.5;
    primary.worldTransform.apply({ x: localX, y: localY }, tmpWorldPoint);
    const wx = tmpWorldPoint.x + primaryWorldOffsetX;
    const wy = tmpWorldPoint.y + primaryWorldOffsetY;

    if (wx < b.x || wx > b.x + b.width || wy < b.y || wy > b.y + b.height) continue;
    if (isTextureOpaqueAtWorldPoint(secondary, wx, wy, alphaThreshold)) return true;
  }

  return false;
}

/**
 * Returns world-space points for the alpha-outline of a sprite's texture frame.
 * Useful for debug overlays that should match pixel-perfect hitboxes.
 * When `insetPixels` > 0, outlines the eroded (inward) mask.
 */
export function getSpriteOutlineWorldPoints(
  sprite: Sprite,
  alphaThreshold = 10,
  stride = 2,
  insetPixels = 0
): Array<{ x: number; y: number }> {
  const texture = sprite.texture;
  const frame = texture.frame;
  const alphaData = getAlphaData(texture);
  const points: Array<{ x: number; y: number }> = [];
  const step = Math.max(1, Math.floor(stride));
  const inset = Math.max(0, Math.floor(insetPixels));
  const opaque = getOpaquePixels(texture, alphaThreshold, inset);
  const opaqueSet = new Set(opaque.map((p) => `${p.x},${p.y}`));

  const isOpaque = (x: number, y: number): boolean => opaqueSet.has(`${x},${y}`);

  // Fallback edge detect on full alpha if no inset set requested for outline of raw sprite
  const isRawOpaque = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return false;
    const sx = Math.floor(frame.x + x);
    const sy = Math.floor(frame.y + y);
    const alpha = alphaData.pixels[(sy * alphaData.width + sx) * 4 + 3];
    return alpha >= alphaThreshold;
  };

  const sample = inset > 0 ? isOpaque : isRawOpaque;

  for (let y = 0; y < frame.height; y += step) {
    for (let x = 0; x < frame.width; x += step) {
      if (!sample(x, y)) continue;
      const edge =
        !sample(x - 1, y) ||
        !sample(x + 1, y) ||
        !sample(x, y - 1) ||
        !sample(x, y + 1);
      if (!edge) continue;

      const localX = x - sprite.anchor.x * frame.width + 0.5;
      const localY = y - sprite.anchor.y * frame.height + 0.5;
      sprite.worldTransform.apply({ x: localX, y: localY }, tmpWorldPoint);
      points.push({ x: tmpWorldPoint.x, y: tmpWorldPoint.y });
    }
  }

  return points;
}

/**
 * Tests whether any opaque pixel of `primary` overlaps a world-space ellipse.
 * Keeps the primary sprite shape accurate while using a simplified target collider.
 */
export function spriteOpaquePixelsOverlapEllipse(
  primary: Sprite,
  ellipseWorldX: number,
  ellipseWorldY: number,
  radiusX: number,
  radiusY: number,
  alphaThreshold = 10,
  primaryWorldOffsetX = 0,
  primaryWorldOffsetY = 0,
  pixelStride = 1
): boolean {
  if (radiusX <= 0 || radiusY <= 0) return false;

  const a = primary.getBounds();
  const ax = a.x + primaryWorldOffsetX;
  const ay = a.y + primaryWorldOffsetY;
  const ex = ellipseWorldX - radiusX;
  const ey = ellipseWorldY - radiusY;
  const ew = radiusX * 2;
  const eh = radiusY * 2;
  const hasOverlap = ax < ex + ew && ax + a.width > ex && ay < ey + eh && ay + a.height > ey;
  if (!hasOverlap) return false;

  const opaquePixels = getOpaquePixels(primary.texture, alphaThreshold);
  const frame = primary.texture.frame;
  const invRx2 = 1 / (radiusX * radiusX);
  const invRy2 = 1 / (radiusY * radiusY);
  const stride = Math.max(1, pixelStride | 0);

  for (let i = 0; i < opaquePixels.length; i += stride) {
    const pixel = opaquePixels[i]!;
    const localX = pixel.x - primary.anchor.x * frame.width + 0.5;
    const localY = pixel.y - primary.anchor.y * frame.height + 0.5;
    primary.worldTransform.apply({ x: localX, y: localY }, tmpWorldPoint);
    const dx = tmpWorldPoint.x + primaryWorldOffsetX - ellipseWorldX;
    const dy = tmpWorldPoint.y + primaryWorldOffsetY - ellipseWorldY;
    const norm = dx * dx * invRx2 + dy * dy * invRy2;
    if (norm <= 1) return true;
  }

  return false;
}
