/**
 * Local prefs: sound, personal best, last leaderboard name.
 * Shared high scores live on the server (see leaderboardApi.ts).
 */

const KEY_SOUND = 'thebirdgame_sound';
const KEY_HIGH_SCORE = 'thebirdgame_highScore';
const KEY_LAST_NAME = 'thebirdgame_lastName';

export const MAX_SCORES = 10;
export const MAX_NAME_LEN = 12;
export const DEFAULT_NAME = 'Pilot';

export type ScoreEntry = {
  score: number;
  name: string;
  at: number;
};

export function getSound(): boolean {
  try {
    const v = localStorage.getItem(KEY_SOUND);
    return v === null || v === '1';
  } catch {
    return true;
  }
}

export function setSound(on: boolean): void {
  try {
    localStorage.setItem(KEY_SOUND, on ? '1' : '0');
  } catch {
    // ignore
  }
}

export function getHighScore(): number {
  try {
    const v = localStorage.getItem(KEY_HIGH_SCORE);
    return v !== null ? Math.max(0, parseInt(v, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

export function setHighScore(score: number): void {
  try {
    localStorage.setItem(KEY_HIGH_SCORE, String(Math.max(0, Math.floor(score))));
  } catch {
    // ignore
  }
}

export function getLastName(): string {
  try {
    const v = localStorage.getItem(KEY_LAST_NAME);
    if (v) return sanitizeName(v);
  } catch {
    // ignore
  }
  return '';
}

export function setLastName(name: string): void {
  try {
    localStorage.setItem(KEY_LAST_NAME, sanitizeName(name));
  } catch {
    // ignore
  }
}

export function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LEN);
  return cleaned || DEFAULT_NAME;
}
