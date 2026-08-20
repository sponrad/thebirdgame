import { Container, Texture, TilingSprite } from 'pixi.js';
import { LEVEL_BOUNDS, CLOUD_LAYER_ALPHA } from './constants';

/** Hash → [0,1) */
function hash2(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function wrapInt(i: number, period: number): number {
  return ((i % period) + period) % period;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Value noise that tiles every `period` units (period must be a positive integer). */
function valueNoise(x: number, y: number, seed: number, period: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);
  const x0w = wrapInt(x0, period);
  const y0w = wrapInt(y0, period);
  const x1w = wrapInt(x0 + 1, period);
  const y1w = wrapInt(y0 + 1, period);
  const v00 = hash2(x0w, y0w, seed);
  const v10 = hash2(x1w, y0w, seed);
  const v01 = hash2(x0w, y1w, seed);
  const v11 = hash2(x1w, y1w, seed);
  const a = v00 + (v10 - v00) * fx;
  const b = v01 + (v11 - v01) * fx;
  return a + (b - a) * fy;
}

/** Seamless FBM — integer frequencies keep the same tile period. */
function fbm(x: number, y: number, seed: number, octaves: number, period: number): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 1013, period);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** Billowy lobes (abs-noise hills) — reads as fluffy cauliflower puffs. */
function billow(x: number, y: number, seed: number, octaves: number, period: number): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = valueNoise(x * freq, y * freq, seed + i * 1013, period) * 2 - 1;
    sum += amp * (1 - Math.abs(n));
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function smoothMax(a: number, b: number, k: number): number {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return a * (1 - h) + b * h + k * h * (1 - h);
}

/**
 * Fluffy painted clouds: mass + billow puffs, soft edges, brighter cores.
 */
function generatePaintedCloudTexture(
  width: number,
  height: number,
  seed: number,
  options: { scale: number; threshold: number; softness: number }
): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;

  const img = ctx.createImageData(width, height);
  const data = img.data;
  const { threshold, softness } = options;
  const period = Math.max(2, Math.round(options.scale));
  const alphaBuf = new Float32Array(width * height);
  const densBuf = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x / width) * period;
      const ny = (y / height) * period;

      const warp = fbm(nx, ny, seed + 17, 2, period);
      const wx = nx + (warp - 0.5) * 0.45;
      const wy = ny + (warp - 0.5) * 0.3;

      // Low-frequency islands → a handful of clumps, with open blue between.
      const mass = fbm(wx * 0.7, wy * 0.7, seed, 2, period);
      const island = Math.pow(Math.max(0, (mass - 0.38) / 0.62), 1.35);
      if (island <= 0.08) {
        alphaBuf[y * width + x] = 0;
        densBuf[y * width + x] = 0;
        continue;
      }

      // Fluffy billows only inside those islands.
      const puffs = billow(wx * 2.0, wy * 1.8, seed + 44, 3, period);
      const puffs2 = billow(wx * 2.8 + 1.3, wy * 2.4 - 0.5, seed + 77, 2, period);
      const lobe = smoothMax(puffs, puffs2 * 0.85, 0.12);
      const density = island * (0.2 + 0.8 * lobe);

      const t = (density - threshold) / Math.max(0.001, softness);
      const edged = smoothstep(Math.max(0, Math.min(1, t)));
      const fluffy = smoothstep(edged) * (0.35 + 0.65 * smoothstep(lobe));
      const idx = y * width + x;
      alphaBuf[idx] = Math.min(1, fluffy * 1.25);
      densBuf[idx] = density;
    }
  }

  const blurred = blurAlphaSeamless(alphaBuf, width, height, 4);
  const densBlur = blurAlphaSeamless(densBuf, width, height, 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = blurred[y * width + x];
      const d = densBlur[y * width + x];
      // Brighter core, slightly cooler rim → soft volume.
      const core = smoothstep(Math.max(0, Math.min(1, (d - 0.35) / 0.45)));
      const r = Math.round(235 + core * 20);
      const g = Math.round(240 + core * 15);
      const b = Math.round(248 + core * 7);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = Math.round(Math.min(1, a * 1.2) * 245);
    }
  }

  ctx.putImageData(img, 0, 0);
  return Texture.from(canvas);
}

/** Toroidal box blur so fluff doesn't reintroduce tile seams. */
function blurAlphaSeamless(
  src: Float32Array,
  width: number,
  height: number,
  radius: number
): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const diam = radius * 2 + 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = wrapInt(x + k, width);
        sum += src[y * width + xx];
      }
      tmp[y * width + x] = sum / diam;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = wrapInt(y + k, height);
        sum += tmp[yy * width + x];
      }
      out[y * width + x] = sum / diam;
    }
  }

  return out;
}

/**
 * Drifting painted-noise cloud backdrop covering the playfield.
 */
export class CloudBackground extends Container {
  private far: TilingSprite;
  private near: TilingSprite;
  private coverW: number;
  private coverH: number;

  constructor() {
    super();

    const levelW = LEVEL_BOUNDS.maxX - LEVEL_BOUNDS.minX;
    const levelH = LEVEL_BOUNDS.maxY - LEVEL_BOUNDS.minY;
    // Extra margin so edges stay covered while scrolling / camera pans.
    this.coverW = levelW * 1.5;
    this.coverH = levelH * 1.5;

    const farTex = generatePaintedCloudTexture(768, 432, 42, {
      scale: 4,
      threshold: 0.12,
      softness: 0.28,
    });
    farTex.source.addressMode = 'repeat';

    const nearTex = generatePaintedCloudTexture(768, 432, 99, {
      scale: 5,
      threshold: 0.16,
      softness: 0.24,
    });
    nearTex.source.addressMode = 'repeat';

    this.far = new TilingSprite({
      texture: farTex,
      width: this.coverW,
      height: this.coverH,
    });
    this.far.anchor.set(0.5);
    this.far.tileScale.set(this.coverW / (farTex.width * 1.4), this.coverH / (farTex.height * 1.4));
    this.far.alpha = CLOUD_LAYER_ALPHA * 0.55;

    this.near = new TilingSprite({
      texture: nearTex,
      width: this.coverW,
      height: this.coverH,
    });
    this.near.anchor.set(0.5);
    this.near.tileScale.set(this.coverW / (nearTex.width * 1.7), this.coverH / (nearTex.height * 1.7));
    this.near.alpha = CLOUD_LAYER_ALPHA * 0.9;

    this.addChild(this.far);
    this.addChild(this.near);
    this.x = (LEVEL_BOUNDS.minX + LEVEL_BOUNDS.maxX) * 0.5;
    this.y = (LEVEL_BOUNDS.minY + LEVEL_BOUNDS.maxY) * 0.5;
  }

  /** Clouds stay fixed so the see-through border doesn't need continuous redraw. */
  update(_dt: number): void {}
}
