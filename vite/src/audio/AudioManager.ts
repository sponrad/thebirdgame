import { Globals } from '../game/Globals';
import { AUDIO_FILES, type AudioCategory } from './audioKeys';

/** MP3 — required for iOS / Brave (WebKit). */
const AUDIO_EXT = '.mp3';
const BASE = '/audio/';

/** Hard cap on simultaneous BufferSources in the graph. */
const MAX_VOICES = 4;
/** New voices allowed per animation frame. */
const MAX_PLAYS_PER_FRAME = 2;

/** Min seconds between plays of the same category. */
const COOLDOWN_SEC: Record<AudioCategory, number> = {
  balloonSpawn: 0.4,
  balloonPop: 0.06,
  enemySpawn: 0.25,
  playerDead: 0.5,
  multiplierPickup: 0.05,
};

/**
 * Truncate long clips on play — balloonrub/vulture are ~1s; mixing many full
 * clips on mobile is a common hitch source. Cue only needs the attack.
 */
const MAX_DURATION_SEC: Partial<Record<AudioCategory, number>> = {
  balloonSpawn: 0.28,
  balloonPop: 0.35,
  enemySpawn: 0.3,
  playerDead: 0.8,
  multiplierPickup: 0.12,
};

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ||
    null
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return new Promise((resolve) => {
    const t = window.setTimeout(() => {
      console.warn(`Audio timeout: ${label}`);
      resolve(null);
    }, ms);
    promise
      .then((v) => {
        window.clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        window.clearTimeout(t);
        console.warn(`Audio error: ${label}`, e);
        resolve(null);
      });
  });
}

/**
 * Load once → unlock on gesture → silent-prime every buffer → cheap play().
 * Never await AudioContext.resume() during boot — it can hang forever on iOS/Brave.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private expectedCount = 0;

  private loaded = false;
  private unlocked = false;
  private primed = false;
  private primePromise: Promise<void> | null = null;

  private activeVoices = 0;
  private playsThisFrame = 0;
  private lastPlayAt = new Map<AudioCategory, number>();

  async init(): Promise<void> {
    const AC = getAudioContextCtor();
    if (!AC) {
      console.warn('Web Audio API not available');
      this.loaded = true;
      return;
    }

    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);

    const files = new Set<string>();
    for (const list of Object.values(AUDIO_FILES)) {
      for (const name of list) files.add(name);
    }
    this.expectedCount = files.size;

    await Promise.all(
      [...files].map(async (name) => {
        try {
          const res = await withTimeout(fetch(BASE + name + AUDIO_EXT), 8000, `fetch ${name}`);
          if (!res || !res.ok) return;
          const ab = await withTimeout(res.arrayBuffer(), 8000, `buffer ${name}`);
          if (!ab) return;
          // Decode on the realtime context (not offline) for WebKit.
          const buf = await withTimeout(
            this.ctx!.decodeAudioData(ab.slice(0)),
            8000,
            `decode ${name}`
          );
          if (buf) this.buffers.set(name, buf);
        } catch (e) {
          console.warn('Audio load failed:', name, e);
        }
      })
    );

    this.loaded = true;
    if (this.buffers.size === 0) {
      console.warn('No audio buffers loaded');
    } else if (this.buffers.size < this.expectedCount) {
      console.warn(`Audio partial load: ${this.buffers.size}/${this.expectedCount}`);
    }
    // Do NOT resume/prime here — resume() without a gesture hangs boot on WebKit.
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  isUnlocked(): boolean {
    return this.unlocked && this.ctx?.state === 'running';
  }

  isPrimed(): boolean {
    return this.primed;
  }

  /** True when SFX can play without first-use decode/graph hitch. */
  isReady(): boolean {
    return this.loaded && this.unlocked && this.primed;
  }

  /**
   * Call from a real user gesture (sync). Resumes context and starts silent priming.
   */
  unlock(): void {
    if (!this.ctx || !this.master || !this.loaded) return;
    if (this.unlocked && this.primed && this.ctx.state === 'running') return;

    try {
      const silent = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      const src = this.ctx.createBufferSource();
      src.buffer = silent;
      src.connect(this.master);
      src.start(0);
    } catch {
      /* ignore */
    }

    // Never block the UI on resume — fire and forget.
    void withTimeout(this.ctx.resume(), 1500, 'resume').then((_) => {
      if (this.ctx?.state === 'running') {
        this.unlocked = true;
        void this.ensurePrimed();
      }
    });
  }

  /** Resolves after unlock + silent prime, or after a short timeout so UI never sticks. */
  whenReady(): Promise<void> {
    if (this.isReady()) return Promise.resolve();
    this.unlock();
    return this.ensurePrimed();
  }

  private ensurePrimed(): Promise<void> {
    if (this.primed) return Promise.resolve();
    if (this.primePromise) return this.primePromise;

    this.primePromise = (async () => {
      const deadline = performance.now() + 1500;
      while (this.ctx && this.ctx.state !== 'running' && performance.now() < deadline) {
        await withTimeout(this.ctx.resume(), 200, 'resume-wait');
        await new Promise((r) => setTimeout(r, 32));
      }

      if (!this.ctx || this.ctx.state !== 'running' || !this.master) {
        // Don't block title forever — play() will keep trying resume.
        this.primed = true;
        this.primePromise = null;
        return;
      }
      this.unlocked = true;

      const mute = this.ctx.createGain();
      mute.gain.value = 0;
      mute.connect(this.master);

      const finishes: Promise<void>[] = [];
      for (const buf of this.buffers.values()) {
        finishes.push(
          new Promise<void>((resolve) => {
            const done = (): void => resolve();
            try {
              const src = this.ctx!.createBufferSource();
              src.buffer = buf;
              src.connect(mute);
              src.onended = done;
              const dur = Math.min(0.04, buf.duration);
              src.start(0, 0, dur);
              window.setTimeout(done, 60);
            } catch {
              done();
            }
          })
        );
      }
      await Promise.race([
        Promise.all(finishes),
        new Promise<void>((r) => setTimeout(r, 500)),
      ]);
      try {
        mute.disconnect();
      } catch {
        /* ignore */
      }
      this.primed = true;
    })();

    return this.primePromise;
  }

  /** Call once at the start of each game tick. */
  beginFrame(): void {
    this.playsThisFrame = 0;
  }

  play(category: AudioCategory): void {
    if (!Globals.sound || !this.ctx || !this.master) return;
    if (!this.loaded) return;
    if (this.ctx.state !== 'running') {
      void this.ctx.resume().then(() => {
        if (this.ctx?.state === 'running') this.unlocked = true;
      });
      return;
    }
    this.unlocked = true;
    if (this.activeVoices >= MAX_VOICES) return;
    if (this.playsThisFrame >= MAX_PLAYS_PER_FRAME) return;

    const now = performance.now() / 1000;
    const last = this.lastPlayAt.get(category) ?? -Infinity;
    if (now - last < COOLDOWN_SEC[category]) return;

    const list = AUDIO_FILES[category];
    const name = list[Math.floor(Math.random() * list.length)]!;
    const buf = this.buffers.get(name);
    if (!buf) return;

    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.master);
      this.activeVoices += 1;
      this.playsThisFrame += 1;
      this.lastPlayAt.set(category, now);

      const maxDur = MAX_DURATION_SEC[category];
      const playDur = maxDur != null ? Math.min(maxDur, buf.duration) : undefined;

      let freed = false;
      const freeVoice = (): void => {
        if (freed) return;
        freed = true;
        this.activeVoices = Math.max(0, this.activeVoices - 1);
        try {
          src.disconnect();
        } catch {
          /* ignore */
        }
      };
      src.onended = freeVoice;

      if (playDur != null) {
        src.start(0, 0, playDur);
      } else {
        src.start(0);
      }
    } catch {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }
  }

  playBalloonSpawn(): void {
    this.play('balloonSpawn');
  }
  playBalloonPop(): void {
    this.play('balloonPop');
  }
  playEnemySpawn(): void {
    this.play('enemySpawn');
  }
  playPlayerDead(): void {
    this.play('playerDead');
  }
  playMultiplierPickup(): void {
    this.play('multiplierPickup');
  }
}

export const audioManager = new AudioManager();
