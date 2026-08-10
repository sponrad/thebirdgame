/**
 * Persist high score and sound preference (replaces Unity PlayerPrefs).
 */

const KEY_SOUND = 'thebirdgame_sound';
const KEY_HIGH_SCORE = 'thebirdgame_highScore';

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
    return v !== null ? Math.max(0, parseInt(v, 10)) : 0;
  } catch {
    return 0;
  }
}

export function setHighScore(score: number): void {
  try {
    localStorage.setItem(KEY_HIGH_SCORE, String(Math.max(0, score)));
  } catch {
    // ignore
  }
}
