window.MARIO = window.MARIO || {};

MARIO.Input = (() => {
  const keys = Object.create(null);   // code -> bool
  let justPressedJump = false;

  const MOVE_L = ['ArrowLeft', 'KeyA'];
  const MOVE_R = ['ArrowRight', 'KeyD'];
  const JUMP   = ['ArrowUp', 'KeyW', 'Space'];

  function onKeyDown(e) {
    if (JUMP.includes(e.code)) {
      if (!keys[e.code]) justPressedJump = true;   // edge detect for jump buffer
      e.preventDefault();
    }
    keys[e.code] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  }
  function onKeyUp(e) { keys[e.code] = false; }

  function left()  { return MOVE_L.some(c => keys[c]); }
  function right() { return MOVE_R.some(c => keys[c]); }
  function jumpHeld() { return JUMP.some(c => keys[c]); }

  // Consumed once per frame by the player logic
  function consumeJumpPressed() {
    const v = justPressedJump;
    justPressedJump = false;
    return v;
  }

  // Returns true and clears on first press (for overlays/restart)
  function anyAction() {
    if (JUMP.some(c => keys[c])) { /* still need edge */ }
    return justPressedJump || jumpHeld() && _firstFrameAfterOverlay;
  }
  let _firstFrameAfterOverlay = false;
  function armActionDetect() { _firstFrameAfterOverlay = true; }

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  return { left, right, jumpHeld, consumeJumpPressed, armActionDetect, anyAction };
})();
