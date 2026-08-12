/**
 * Game tuning (from Unity scripts). All units in world space.
 */

/** Rectangular playfield (~16:9). Camera shows only a portion and follows the plane. */
export const LEVEL_BOUNDS = {
  minX: -50,
  minY: -28,
  maxX: 50,
  maxY: 28,
};

/** Long axis width / ~5s flight time. */
export const PLANE_SPEED = 19;
/** Rotation speed in radians per second (Unity: 400 deg/s) */
export const PLANE_ROTATION_SPEED = (350 * Math.PI) / 180;
export const PLANE_SCALE = 0.024;

export const EXHAUST_SPAWN_INTERVAL = 0.25;
export const EXHAUST_LIFETIME = 1.5;
export const EXHAUST_SCALE = 0.025;

/** Camera: Unity-style follow with damp.
 *  Zoom is locked to horizontal arena coverage so every device sees the same
 *  fraction of the playfield width (no resolution/aspect FOV advantage). */
export const CAMERA_DAMP_TIME = 0.15;
/** Visible world width as a fraction of level width (2/3 ⇒ pan the remaining 1/3). */
export const CAMERA_VIEW_WIDTH_FRACTION = 4 / 5;
/** @deprecated Horizontal FOV is now CAMERA_VIEW_WIDTH_FRACTION */
export const CAMERA_VIEW_HALF_EXTENT = 20;
/** @deprecated Mobile no longer uses a separate zoom multiplier */
export const CAMERA_MOBILE_ZOOM = 0.45;
/** @deprecated Use CAMERA_VIEW_WIDTH_FRACTION */
export const CAMERA_VIEW_HALF_HEIGHT = CAMERA_VIEW_HALF_EXTENT;
/** Keep level border / view inset from the window edges when camera is clamped. */
export const VIEW_PADDING_PX = 29;

/** Near-miss radius (world) for whoosh / danger flash. */
export const NEAR_MISS_RADIUS = 4.5;
/** Max plane bank lean while turning (radians). */
export const PLANE_BANK_ANGLE = 0.18;

/** Balloon (Unity BalloonControlScript) */
export const BALLOON_SPEED = 3;
/** Explosion stun radius = this × balloon bulb radius (hitbox). */
export const BALLOON_EXPLOSION_RADIUS_FACTOR = 4;
/** Plane collider covered most of the plane; balloon is a circle. Use large radius so balloons pop when plane body overlaps. */
export const BALLOON_COLLECT_RADIUS = 10;
export const BALLOON_SPAWN_MIN = 2;
export const BALLOON_SPAWN_MAX = 4;
export const BALLOON_SCALE = 0.0288;
/** Local hitbox relative to sprite bounds — tuned to the red bulb (string hangs below). */
export const BALLOON_HITBOX_CENTER_Y_FACTOR = 0.19;
export const BALLOON_HITBOX_RADIUS_X_FACTOR = 0.47;
export const BALLOON_HITBOX_RADIUS_Y_FACTOR = 0.2;

/** Balloon pop confetti burst */
export const BALLOON_POP_PARTICLE_DURATION = 1.15;
export const BALLOON_POP_CONFETTI_COUNT = 64;
/** Strong drag so the initial pop dies out fast; speed is derived to reach stun radius. */
export const BALLOON_POP_CONFETTI_DRAG = 7;
export const BALLOON_POP_CONFETTI_GRAVITY = 32;
export const BALLOON_POP_CONFETTI_SPIN_MAX = 18;
/** Extra reach as fraction of stun radius (1 = outer edge of blast zone). */
export const BALLOON_POP_CONFETTI_REACH_MIN = 0.25;
export const BALLOON_POP_CONFETTI_REACH_MAX = 1.0;
/** Offset upward (world units) from sprite center to bulb center. */
export const BALLOON_BULB_OFFSET = 4.0;

/** Bird (Unity BirdControlScript) */
export const BIRD_SPEED = 8;
/** Bird turns much slower than player so it must "catch up" while chasing. */
export const BIRD_ROTATION_SPEED = (90 * Math.PI) / 180;
/** Rule2 separation: consider birds within this radius */
export const BIRD_ENEMY_DISTANCE_RADIUS = 1.5;
export const BIRD_BIRTH_TIME = 1.5;
/** Flap: time per frame (Unity 0.1s), then delay before next flap cycle (1–2s) */
export const BIRD_FLAP_FRAME_DURATION = 0.1;
export const BIRD_FLAP_CYCLE_DELAY_MIN = 1;
export const BIRD_FLAP_CYCLE_DELAY_MAX = 2;
/** Vultroso sprites are much larger; keep enemy size close to plane/balloon scale. */
export const BIRD_SCALE_BIRTH = 0.004;
export const BIRD_SCALE_ALIVE = 0.011;
/** Stunned bird physics: knockback from blast, spin, then fall out of sky. */
export const BIRD_DEAD_GRAVITY = 22;
export const BIRD_DEAD_KNOCKBACK_SPEED = 10;
/** Per-bird knockback speed multiplier range (scatter intensity). */
export const BIRD_DEAD_KNOCKBACK_VARIANCE_MIN = 0.65;
export const BIRD_DEAD_KNOCKBACK_VARIANCE_MAX = 1.35;
/** Random angle jitter added to radial blast direction (radians). */
export const BIRD_DEAD_KNOCKBACK_ANGLE_JITTER = (55 * Math.PI) / 180;
/** Angular velocity range in rad/s — faster spin for a punchier blast. */
export const BIRD_DEAD_SPIN_MIN = (220 * Math.PI) / 180;
export const BIRD_DEAD_SPIN_MAX = (720 * Math.PI) / 180;
export const BIRD_DEAD_TINT = 0xcccccc;
export const BIRD_DEAD_ALPHA = 0.8;
export const BIRD_DEAD_DESPAWN_MARGIN = 12;
/** Plane–bird overlap: game over. Use radius for circle check. */
export const BIRD_PLANE_HIT_RADIUS = 8;
/** Erode plane opaque mask inward (texture px) for friendlier plane↔bird hits. Balloon checks unchanged.
 *  Higher = more lenient (smaller plane hitbox). */
export const PLANE_BIRD_COLLISION_INSET = 19;

/** Bird spawn (SkySceneControl): corners with buffer, interval 1.5s */
export const BIRD_SPAWN_INTERVAL = 1.5;
export const BIRD_SPAWN_CORNER_BUFFER = 5;

/** Multiplier pickup (Unity MultiplierControlScript): lifetime then destroy */
export const MULTIPLIER_PICKUP_LIFETIME = 5;
/** Star sprite is small in pixels but huge vs scaled plane/balloon; keep pickup near plane size. */
export const MULTIPLIER_SCALE = 0.03;
/** Magnet/attract range = typical balloon explosion radius × this (a bit under blast size). */
export const MULTIPLIER_ATTRACT_EXPLOSION_FACTOR = 0.25;
/** Speed toward plane once magnetized — snappy so they zip in once locked. */
export const MULTIPLIER_SPEED = 55;
/** Collect when star center is within this distance of the plane. */
export const MULTIPLIER_COLLECT_RADIUS = 1.5;

/** Dashed level perimeter (Unity left/right/top/bottom walls). */
export const BORDER_DASH_LENGTH = 1.4;
export const BORDER_GAP_LENGTH = 0.9;
export const BORDER_STROKE_WIDTH = 0.28;
export const BORDER_COLOR = 0xeef7fc;
/** Nearly invisible far from the plane; ramps to solid when close. */
export const BORDER_BASE_ALPHA = 0.08;
/** World distance from plane where border dashes start darkening toward black. */
export const BORDER_WARN_DISTANCE = 50;
/** How close the plane must be to a dash to wax it on/off. */
export const BORDER_TOUCH_RADIUS = 2.8;
/** Neon green for waxed dashes. */
export const BORDER_WAX_COLOR = 0x39ff14;
/** Don't show painted dashes until this fraction of the perimeter is waxed. */
export const BORDER_WAX_REVEAL_FRACTION = 0.25;
/** Score for completing a full Wax On / Wax Off (× multiplier). */
export const WAX_ON_SCORE = 10000;
export const WAX_OFF_SCORE = 30000;

/** Painted noise cloud backdrop */
export const CLOUD_SCROLL_SPEED_X = 0.35;
export const CLOUD_SCROLL_SPEED_Y = 0.1;
export const CLOUD_LAYER_ALPHA = 0.85;
