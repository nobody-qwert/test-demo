window.MARIO = window.MARIO || {};

MARIO.Physics = (() => {
  // Axis-aligned bounding box overlap test
  function aabb(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
  }

  // Move an entity by dx/dy and resolve collisions against a list of solid AABBs.
  // Returns flags describing which sides were hit.
  // Axis separation guarantees stable tunneling-free resolution at these speeds.
  function moveAndResolve(e, solids, dx, dy) {
    e.hitLeft = e.hitRight = e.hitTop = e.hitBottom = false;

    // --- X axis ---
    e.x += dx;
    for (const s of solids) {
      if (aabb(e, s)) {
        if (dx > 0) { e.x = s.x - e.w; e.hitRight = true; }
        else if (dx < 0) { e.x = s.x + s.w; e.hitLeft = true; }
        else {
          // resting overlap nudge out along smallest penetration
          const pushL = (e.x + e.w) - s.x;         // need to move left by this
          const pushR = s.x + s.w - e.x;           // or right by this
          if (pushL <= pushR) { e.x -= pushL; e.hitLeft = true; }
          else { e.x += pushR; e.hitRight = true; }
        }
      }
    }

    // --- Y axis ---
    e.y += dy;
    for (const s of solids) {
      if (aabb(e, s)) {
        if (dy > 0) { e.y = s.y - e.h; e.vy = 0; e.hitBottom = true; }
        else if (dy < 0) { e.y = s.y + s.h; e.vy = 0; e.hitTop = true; }
        else {
          const pushU = (e.y + e.h) - s.y;
          const pushD = s.y + s.h - e.y;
          if (pushU <= pushD) { e.y -= pushU; e.hitTop = true; }
          else { e.y += pushD; e.vy = 0; e.hitBottom = true; }
        }
      }
    }
    return e;
  }

  // Point-in-rect helper (for spawn/death checks)
  function pointIn(px, py, r) {
    return px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;
  }

  return { aabb, moveAndResolve, pointIn };
})();
