/**
 * Game tuning (from Unity scripts). All units in world space.
 */

export const LEVEL_BOUNDS = {
  minX: -50,
  minY: -38,
  maxX: 50,
  maxY: 38,
};

export const PLANE_SPEED = 20;
/** Rotation speed in radians per second (Unity: 400 deg/s) */
export const PLANE_ROTATION_SPEED = (400 * Math.PI) / 180;
export const PLANE_SCALE = 0.03;

export const EXHAUST_SPAWN_INTERVAL = 0.25;
export const EXHAUST_LIFETIME = 1.5;
export const EXHAUST_SCALE = 0.04;

/** Camera smooth follow (Unity dampTime) */
export const CAMERA_DAMP_TIME = 0.15;

/** Balloon (Unity BalloonControlScript) */
export const BALLOON_SPEED = 3;
/** Explosion stun radius = this × balloon bulb radius (hitbox). */
export const BALLOON_EXPLOSION_RADIUS_FACTOR = 5;
/** Plane collider covered most of the plane; balloon is a circle. Use large radius so balloons pop when plane body overlaps. */
export const BALLOON_COLLECT_RADIUS = 10;
export const BALLOON_SPAWN_MIN = 2;
export const BALLOON_SPAWN_MAX = 4;
export const BALLOON_SCALE = 0.04;
/** Local hitbox relative to sprite bounds (matches SkyScene balloon hitbox). */
export const BALLOON_HITBOX_RADIUS_X_FACTOR = 0.32;
export const BALLOON_HITBOX_RADIUS_Y_FACTOR = 0.23;

/** Balloon pop particle display duration (Unity ParticleScript 5s; use shorter for simple graphic) */
export const BALLOON_POP_PARTICLE_DURATION = 0.6;
/** Offset upward (world units) from balloon center so particle appears at the bulb; sprite includes string below. */
export const BALLOON_BULB_OFFSET = 3.5;

/** Bird (Unity BirdControlScript) */
export const BIRD_SPEED = 8;
/** Bird turns much slower than player so it must "catch up" while chasing. */
export const BIRD_ROTATION_SPEED = (45 * Math.PI) / 180;
/** Rule2 separation: consider birds within this radius */
export const BIRD_ENEMY_DISTANCE_RADIUS = 1.5;
export const BIRD_BIRTH_TIME = 1.5;
/** Flap: time per frame (Unity 0.1s), then delay before next flap cycle (1–2s) */
export const BIRD_FLAP_FRAME_DURATION = 0.1;
export const BIRD_FLAP_CYCLE_DELAY_MIN = 1;
export const BIRD_FLAP_CYCLE_DELAY_MAX = 2;
/** Vultroso sprites are much larger; keep enemy size close to plane/balloon scale. */
export const BIRD_SCALE_BIRTH = 0.005;
export const BIRD_SCALE_ALIVE = 0.014;
/** Stunned bird physics: knockback from blast, spin, then fall out of sky. */
export const BIRD_DEAD_GRAVITY = 20;
export const BIRD_DEAD_KNOCKBACK_SPEED = 5;
/** Angular velocity range in rad/s (~100–400 deg/s, matching Unity). */
export const BIRD_DEAD_SPIN_MIN = (100 * Math.PI) / 180;
export const BIRD_DEAD_SPIN_MAX = (400 * Math.PI) / 180;
export const BIRD_DEAD_TINT = 0xcccccc;
export const BIRD_DEAD_ALPHA = 0.8;
export const BIRD_DEAD_DESPAWN_MARGIN = 12;
/** Plane–bird overlap: game over. Use radius for circle check. */
export const BIRD_PLANE_HIT_RADIUS = 8;

/** Bird spawn (SkySceneControl): corners with buffer, interval 1.5s */
export const BIRD_SPAWN_INTERVAL = 1.5;
export const BIRD_SPAWN_CORNER_BUFFER = 5;

/** Multiplier pickup (Unity MultiplierControlScript): lifetime then destroy */
export const MULTIPLIER_PICKUP_LIFETIME = 5;
