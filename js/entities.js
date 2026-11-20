window.MARIO = window.MARIO || {};

MARIO.Entities = (() => {
  const C = MARIO.CONFIG;

  /* ----------------------------- Player ----------------------------- */
  class Player {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.px = x; this.py = y;           // previous-frame pos for stomp detection
      this.w = 22; this.h = 30;          // slightly smaller than a tile
      this.vx = 0; this.vy = 0;
      this.onGround = false;
      this.facing = 1;                    // 1 right, -1 left
      this.coyote = 0;                    // frames since last grounded
      this.jumpHeld = false;
      this.invulnFrames = 0;              // brief i-frames after respawn
      this.dead = false;
      this.animT = 0;                     // for leg/run animation
    }

    update(solids, input, audio) {
      if (this.dead) return;                       // main.js drives death/camera
      this.fellOffWorld = false;
      const P = MARIO.Physics;

      // ---- horizontal intent & acceleration ----
      let ax = 0;
      if (input.left())  { ax -= 1; this.facing = -1; }
      if (input.right()) { ax += 1; this.facing = 1; }

      if (ax !== 0) {
        const accel = this.onGround ? C.ACCEL : C.AIR_ACCEL;
        this.vx += ax * accel;
        // clamp to run speed
        if (this.vx > C.RUN_SPEED) this.vx = C.RUN_SPEED;
        if (this.vx < -C.RUN_SPEED) this.vx = -C.RUN_SPEED;
      } else if (this.onGround) {
        this.vx *= C.FRICTION;
        if (Math.abs(this.vx) < 0.05) this.vx = 0;
      }

      // ---- jumping (variable height + coyote time) ----
      const wantJump = input.consumeJumpPressed();
      if (wantJump && (this.onGround || this.coyote > 0)) {
        this.vy = C.JUMP_VEL;
        this.onGround = false;
        this.coyote = 0;
        this.jumpHeld = true;
        audio.jump();
      }
      // hold-to-rise while ascending
      if (this.jumpHeld && input.jumpHeld() && this.vy < 0) {
        this.vy += C.JUMP_HOLD_ACCEL;
      }
      if (!input.jumpHeld()) this.jumpHeld = false;   // release cuts jump short naturally via gravity

      // ---- gravity ----
      this.vy += C.GRAVITY;
      if (this.vy > C.MAX_FALL) this.vy = C.MAX_FALL;

      // ---- integrate & resolve vs solids ----
      P.moveAndResolve(this, solids, this.vx, this.vy);

      if (this.hitLeft || this.hitRight) this.vx = 0;

      // Robust ground detection via a FOOT SENSOR:
      // probe ~3px below the feet across the body width. This catches resting,
      // ledge edges, and thin platforms reliably -> no hover/jitter/floating.
      const sensorH = 4, sensorGap = 2;
      const sL = { x: this.x + 3,            y: this.y + this.h + sensorGap, w: this.w / 2 - 3, h: sensorH };
      const sR = { x: this.x + this.w / 2 + 1, y: this.y + this.h + sensorGap, w: this.w / 2 - 2, h: sensorH };
      let grounded = false;
      for (const s of solids) {
        if (!grounded && (P.aabb(sL, s) || P.aabb(sR, s))) grounded = true;
      }
      // also accept an actual downward collision this step
      this.onGround = grounded || !!this.hitBottom;
      if (this.onGround) this.coyote = C.COYOTE_FRAMES;
      else if (this.coyote > 0) this.coyote--;

      // run animation clock
      if (Math.abs(this.vx) > 0.2 && this.onGround) this.animT += Math.abs(this.vx) * 0.08;

      if (this.invulnFrames > 0) this.invulnFrames--;

      // store pre-move position next frame baseline (set at end)
      this.px = this.x; this.py = this.y;

      // Fell off the bottom of the world (into a pit) -> flag for main.js.
      // main.js owns lives/state; we don't self-dead so it can transition properly.
      if (this.y > C.HEIGHT + 40) this.fellOffWorld = true;
    }

    // called by main.js to start the death pop-up animation
    beginDeath() { this.dead = true; this.vy = -10; }
    get prevFeetY() { return this.py + this.h; }

    hurt(audio) {
      if (this.invulnFrames > 0 || this.dead) return false;
      this.beginDeath();                   // pop-up handled via vy below
      this.vy = -11;                        // pop up then fall out of view
      audio.death();
      return true;
    }
  }

  /* ----------------------------- Enemy (walker/goomba) ----------------------------- */
  class Walker {
    constructor(x, y, dir = -1) {
      this.x = x; this.y = y;
      this.w = 24; this.h = 22;
      this.dir = dir;                      // facing direction
      this.speed = 1.1;
      this.squashed = false;
      this.squashTimer = 0;                // frames to show squish before removing
      this.active = false;                 // only simulate once near camera
      this.animT = 0;
    }

    update(solids, camX, audio) {
      if (this.squashed) {
        this.squashTimer--;
        return;
      }
      // activate when within view range
      if (!this.active) {
        if (this.x < camX + 900 && this.x > camX - 200) this.active = true;
        else return;
      }

      this.animT += 0.15;
      const dx = this.speed * this.dir;
      const dy = 0;                        // walk on floor; gravity handled by snap below
      const P = MARIO.Physics;

      // apply simple gravity so they stay on ledges
      this.vy = (this.vy || 0) + C.GRAVITY;
      if (this.vy > C.MAX_FALL) this.vy = C.MAX_FALL;

      P.moveAndResolve(this, solids, dx, this.vy);

      // wall / cliff turning: flip at walls or if about to walk off a ledge
      if (this.hitLeft || this.hitRight) {
        this.dir *= -1;
      } else if (this.hitBottom) {
        // grounded — check for ledge ahead
        const probeX = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
        const probe = { x: probeX, y: this.y + this.h + 2, w: 2, h: 4 };
        let support = false;
        for (const s of solids) {
          if (MARIO.Physics.aabb(probe, s)) { support = true; break; }
        }
        if (!support) this.dir *= -1;
      }

      // keep vy reset each frame when resting to avoid accumulation jitter
      if (this.hitBottom) this.vy = 0;
    }

    stomp(audio) {
      if (this.squashed) return;
      this.squashed = true;
      this.squashTimer = 30;
      this.vy = 0;
      audio.stomp();
    }

    get remove() { return this.squashed && this.squashTimer <= 0; }
  }

  /* ----------------------------- Coin ----------------------------- */
  class Coin {
    constructor(tx, ty) {
      this.tx = tx; this.ty = ty;          // tile coords
      this.x = tx * C.TILE + 6;
      this.y = ty * C.TILE + 4;
      this.w = 20; this.h = 24;
      this.taken = false;
      this.spinT = Math.random() * Math.PI * 2;
    }
    update() { if (!this.taken) this.spinT += 0.18; }
  }

  /* ----------------------------- Flag (win trigger) ----------------------------- */
  class Flag {
    constructor(tx, ty) {
      this.tx = tx; this.ty = ty;
      this.x = tx * C.TILE;
      this.y = ty * C.TILE;
      this.w = C.TILE; this.h = C.TILE * 3; // tall pole region
      this.reached = false;
    }
  }

  return { Player, Walker, Coin, Flag };
})();
