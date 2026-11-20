window.MARIO = window.MARIO || {};

MARIO.Camera = (() => {
  const C = MARIO.CONFIG;
  let x = 0;

  function reset(levelWidth) { x = 0; _maxX = levelWidth - C.WIDTH; }
  let _maxX = 0;

  // Follow player with dead-zone-ish smoothing, clamped to [0, levelWidth - viewW]
  function update(player) {
    const target = player.x - C.WIDTH * 0.42;   // keep player left-of-center
    if (target > x) x += (target - x) * 0.15;   // ease forward faster than backward
    else if (target < x) x += (target - x) * 0.08;
    if (x < 0) x = 0;
    if (x > _maxX) x = _maxX;
  }

  function getX() { return Math.round(x); }

  return { reset, update, getX };
})();
