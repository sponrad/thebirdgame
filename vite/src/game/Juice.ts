import { Container, Text, TextStyle } from 'pixi.js';
import { formatScore } from '../utils/format';

const FLOAT_STYLE = new TextStyle({
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: 28,
  fill: 0xffffff,
  fontWeight: 'bold',
  stroke: { color: 0x111111, width: 3, join: 'round' },
});

type FloatBit = {
  text: Text;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
};

/**
 * Arcade juice: screen shake, hit-stop, floating scores, HUD punches.
 * Heavy effects can be disabled via `heavy` (e.g. low-power mode).
 */
export class JuiceSystem {
  /** Screen-space layer for floating scores (parented outside the zoomed world). */
  readonly floatLayer: Container;
  private floats: FloatBit[] = [];
  private shakeAmp = 0;
  private shakeTime = 0;
  private shakeDur = 0;
  private hitStopLeft = 0;
  private combo = 0;
  private lastPopAt = -Infinity;
  private scorePunch = 1;
  private multPunch = 1;
  private deathSlowLeft = 0;
  private deathSlowMax = 0.55;
  private deathZoom = 1;
  private heavy = true;

  constructor() {
    this.floatLayer = new Container();
  }

  setHeavy(enabled: boolean): void {
    this.heavy = enabled;
  }

  reset(): void {
    this.shakeAmp = 0;
    this.shakeTime = 0;
    this.shakeDur = 0;
    this.hitStopLeft = 0;
    this.combo = 0;
    this.lastPopAt = -Infinity;
    this.scorePunch = 1;
    this.multPunch = 1;
    this.deathSlowLeft = 0;
    this.deathSlowMax = 0.55;
    this.deathZoom = 1;
    for (const f of this.floats) {
      this.floatLayer.removeChild(f.text);
      f.text.destroy();
    }
    this.floats.length = 0;
  }

  /** Register a balloon pop; returns combo count after this pop. */
  registerPop(now: number): number {
    if (now - this.lastPopAt < 0.85) this.combo += 1;
    else this.combo = 1;
    this.lastPopAt = now;
    return this.combo;
  }

  getCombo(): number {
    return this.combo;
  }

  shake(amplitude: number, duration = 0.22): void {
    const amp = this.heavy ? amplitude : amplitude * 0.45;
    const dur = this.heavy ? duration : duration * 0.75;
    if (amp >= this.shakeAmp) {
      this.shakeAmp = amp;
      this.shakeTime = 0;
      this.shakeDur = Math.max(this.shakeDur, dur);
    }
  }

  hitStop(seconds = 0.045): void {
    const t = this.heavy ? seconds : seconds * 0.6;
    this.hitStopLeft = Math.max(this.hitStopLeft, t);
  }

  punchScore(): void {
    this.scorePunch = 1.35;
  }

  punchMultiplier(): void {
    this.multPunch = 1.45;
  }

  /** Spawn a small screen-space +score float at the given screen pixel position. */
  floatScore(screenX: number, screenY: number, amount: number): void {
    if (!this.heavy && this.floats.length > 8) return;
    const text = new Text({
      text: `+${formatScore(amount)}`,
      style: FLOAT_STYLE,
    });
    text.anchor.set(0.5);
    text.x = screenX;
    text.y = screenY;
    text.alpha = 0.92;
    this.floatLayer.addChild(text);
    this.floats.push({
      text,
      life: 0,
      maxLife: 0.5,
      vx: (Math.random() - 0.5) * 18,
      vy: -42 - Math.random() * 18,
    });
  }

  /** Start a short slow-mo death beat. Returns false until finished. */
  beginDeathSlow(seconds = 0.55): void {
    this.deathSlowMax = Math.max(0.05, seconds);
    this.deathSlowLeft = this.deathSlowMax;
    this.deathZoom = 1;
  }

  isDeathSlowing(): boolean {
    return this.deathSlowLeft > 0;
  }

  getDeathZoom(): number {
    return this.deathZoom;
  }

  /**
   * Advance juice timers with real dt.
   * Returns simulation dt (0 during hit-stop; reduced during death slow-mo).
   */
  update(realDt: number): number {
    if (this.hitStopLeft > 0) {
      this.hitStopLeft = Math.max(0, this.hitStopLeft - realDt);
      this.updateVisuals(realDt);
      return 0;
    }

    let simDt = realDt;
    if (this.deathSlowLeft > 0) {
      this.deathSlowLeft = Math.max(0, this.deathSlowLeft - realDt);
      const t = 1 - this.deathSlowLeft / this.deathSlowMax;
      this.deathZoom = 1 + t * 0.22;
      simDt = realDt * (0.22 + 0.15 * (1 - t));
    }

    this.updateVisuals(realDt);
    return simDt;
  }

  getShakeOffset(): { x: number; y: number } {
    if (this.shakeAmp <= 0 || this.shakeDur <= 0) return { x: 0, y: 0 };
    const falloff = 1 - this.shakeTime / this.shakeDur;
    const a = this.shakeAmp * Math.max(0, falloff);
    return {
      x: (Math.random() * 2 - 1) * a,
      y: (Math.random() * 2 - 1) * a,
    };
  }

  getScorePunch(): number {
    return this.scorePunch;
  }

  getMultPunch(): number {
    return this.multPunch;
  }

  private updateVisuals(dt: number): void {
    if (this.shakeDur > 0) {
      this.shakeTime += dt;
      if (this.shakeTime >= this.shakeDur) {
        this.shakeAmp = 0;
        this.shakeDur = 0;
        this.shakeTime = 0;
      }
    }

    this.scorePunch += (1 - this.scorePunch) * Math.min(1, dt * 12);
    this.multPunch += (1 - this.multPunch) * Math.min(1, dt * 10);

    let write = 0;
    for (let i = 0; i < this.floats.length; i++) {
      const f = this.floats[i]!;
      f.life += dt;
      if (f.life >= f.maxLife) {
        this.floatLayer.removeChild(f.text);
        f.text.destroy();
        continue;
      }
      const t = f.life / f.maxLife;
      f.text.x += f.vx * dt;
      f.text.y += f.vy * dt;
      f.vy += 55 * dt;
      f.text.alpha = 0.92 * (1 - t * t);
      this.floats[write++] = f;
    }
    this.floats.length = write;
  }
}

/** Press scale feedback for Pixi button containers. */
export function addButtonPressJuice(btn: Container, pressedScale = 0.94): void {
  const base = { x: btn.scale.x || 1, y: btn.scale.y || 1 };
  btn.on('pointerdown', () => {
    btn.scale.set(base.x * pressedScale, base.y * pressedScale);
  });
  const release = (): void => {
    btn.scale.set(base.x, base.y);
  };
  btn.on('pointerup', release);
  btn.on('pointerupoutside', release);
  btn.on('pointercancel', release);
}
