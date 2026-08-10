/**
 * Global game state (port of Unity Globals.cs).
 * Reset at start of each play session where noted.
 */

export const Globals = {
  sound: true,
  score: 0,
  scoreMultiplier: 1,
  highScore: 0,
  sessionHighScore: 0,
  inGame: false,
};

export function resetForNewGame(): void {
  Globals.score = 0;
  Globals.scoreMultiplier = 1;
  Globals.inGame = true;
}
