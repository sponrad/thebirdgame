import { Globals } from '../game/Globals';
import { AUDIO_FILES, type AudioCategory } from './audioKeys';

const AUDIO_EXT = '.ogg';
const BASE = '/audio/';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();

  async init(): Promise<void> {
    this.ctx = new AudioContext();
    const files = new Set<string>();
    for (const list of Object.values(AUDIO_FILES)) {
      for (const name of list) files.add(name);
    }
    for (const name of files) {
      try {
        const url = BASE + name + AUDIO_EXT;
        const res = await fetch(url);
        if (!res.ok) continue;
        const ab = await res.arrayBuffer();
        const buf = await this.ctx.decodeAudioData(ab);
        this.buffers.set(name, buf);
      } catch (e) {
        console.warn('Audio load failed:', name, e);
      }
    }
  }

  play(category: AudioCategory): void {
    if (!Globals.sound || !this.ctx) return;
    const list = AUDIO_FILES[category];
    const name = list[Math.floor(Math.random() * list.length)];
    const buf = this.buffers.get(name);
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    src.start(0);
  }

  playBalloonSpawn(): void { this.play('balloonSpawn'); }
  playBalloonPop(): void { this.play('balloonPop'); }
  playEnemySpawn(): void { this.play('enemySpawn'); }
  playPlayerDead(): void { this.play('playerDead'); }
  playMultiplierPickup(): void { this.play('multiplierPickup'); }
}

export const audioManager = new AudioManager();
