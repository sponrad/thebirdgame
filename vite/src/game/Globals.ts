/**
 * Global game state (port of Unity Globals.cs).
 * Reset at start of each play session where noted.
 */

import type { AchievementId } from './achievements';

export const Globals = {
  sound: true,
  music: true,
  lowPowerMode: false,
  antialias: true,
  score: 0,
  scoreMultiplier: 1,
  highScore: 0,
  sessionHighScore: 0,
  inGame: false,
  achievements: {
    waxOn: false,
    waxOff: false,
    noEntry: false,
  },
};

export function resetForNewGame(): void {
  Globals.score = 0;
  Globals.scoreMultiplier = 1;
  Globals.inGame = true;
  Globals.achievements.waxOn = false;
  Globals.achievements.waxOff = false;
  Globals.achievements.noEntry = false;
}

export function earnedAchievements(): AchievementId[] {
  const out: AchievementId[] = [];
  if (Globals.achievements.waxOn) out.push('waxOn');
  if (Globals.achievements.waxOff) out.push('waxOff');
  if (Globals.achievements.noEntry) out.push('noEntry');
  return out;
}
