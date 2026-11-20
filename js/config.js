// Global namespace so classic script tags work over file:// too
window.MARIO = window.MARIO || {};

MARIO.CONFIG = (() => {
  const TILE = 32;                 // logical px per tile
  return {
    WIDTH: 800,                    // canvas logical width
    HEIGHT: 450,                   // canvas logical height
    TILE,
    GRAVITY: 0.55,                 // px/frame^2 (at 60fps step)
    MAX_FALL: 14,                  // terminal velocity
    JUMP_VEL: -12.4,               // initial jump impulse (negative = up)
    JUMP_HOLD_ACCEL: -0.18,        // extra upward while holding jump & rising
    RUN_SPEED: 3.6,                // target horizontal speed
    ACCEL: 0.45,                   // ground accel toward run speed
    AIR_ACCEL: 0.30,               // air control accel
    FRICTION: 0.82,                // velocity retention when no input on ground
    COYOTE_FRAMES: 4,              // grace frames after leaving ledge
    STEP_MS: 1000 / 60             // fixed physics timestep
  };
})();
