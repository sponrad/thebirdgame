/**
 * Logical audio keys and their source files (without extension).
 * Files live in public/audio as .mp3 (from Assets/Audio .aiff, converted by copy-assets script).
 */

export const BALLOON_SPAWN_FILES = ['balloonrub01', 'balloonrub02', 'balloonrub03', 'balloonrub04', 'balloonrub05'];
export const BALLOON_POP_FILES = ['balloonpop-01', 'balloonpop-02', 'balloonpop-03', 'balloonpop-04'];
export const ENEMY_SPAWN_FILES = ['vulture01', 'vulture02'];
export const PLAYER_DEAD_FILES = ['birdroar01'];
export const MULTIPLIER_PICKUP_FILES = ['boop1', 'boop2', 'boop3', 'boop4', 'boop5'];

/** Looping menu / in-game background track (public/audio). */
export const MUSIC_FILE = 'SkywardAscent';

export type AudioCategory =
  | 'balloonSpawn'
  | 'balloonPop'
  | 'enemySpawn'
  | 'playerDead'
  | 'multiplierPickup';

export const AUDIO_FILES: Record<AudioCategory, readonly string[]> = {
  balloonSpawn: BALLOON_SPAWN_FILES,
  balloonPop: BALLOON_POP_FILES,
  enemySpawn: ENEMY_SPAWN_FILES,
  playerDead: PLAYER_DEAD_FILES,
  multiplierPickup: MULTIPLIER_PICKUP_FILES,
};
