window.MARIO = window.MARIO || {};

(() => {
  const C = MARIO.CONFIG;
  const canvas = document.getElementById('game');
  const hudScore = document.getElementById('hud-score');
  const hudCoins = document.getElementById('hud-coins');
  const hudLives = document.getElementById('hud-lives');
  const hudMute  = document.getElementById('hud-mute');
  const overlay  = document.getElementById('overlay');
  const ovTitle  = document.getElementById('overlay-title');
  const ovMsg    = document.getElementById('overlay-msg');

  let level, player, walkers, coins, flag;
  let score = 0, coinCount = 0, lives = 3;
  let gameState = 'READY';           // READY | PLAYING | DYING | WIN | GAMEOVER
  let accumulator = 0, lastTime = 0;
  let deathTimer = 0;                 // frames left in DYING pause

  function buildLevel() {
    const parsed = MARIO.Level.parse();
    level = parsed;
    player = new MARIO.Entities.Player(parsed.playerStart.x, parsed.playerStart.y);
    walkers = parsed.walkers;
    coins = parsed.coins;
    flag = parsed.flag;
    MARIO.Camera.reset(level.widthPx);
  }

  function resetRun(fullResetScore = false) {
    buildLevel();
    if (fullResetScore) { score = 0; coinCount = 0; lives = 3; }
    updateHUD();
  }

  function updateHUD() {
    hudScore.textContent = String(score).padStart(5,'0');
    hudCoins.textContent = '×' + String(coinCount).padStart(2,'0');
    hudLives.textContent = '❤️'.repeat(Math.max(0, lives)) || '💀';
  }

  function showOverlay(title, msg) {
    ovTitle.textContent = title;
    ovMsg.textContent = msg;
    overlay.classList.remove('hidden');
  }
  function hideOverlay() { overlay.classList.add('hidden'); }

  /* ---------------- collision handling ---------------- */
  function handleInteractions(audio) {
    if (gameState !== 'PLAYING') return;   // ignore interactions while dying/win

    // Pit fall-off is handled right after stepPhysics (needs fellOffWorld flag)

    // Player vs enemies — stomp if player was ABOVE the enemy last frame & now falling
    for (const wk of walkers) {
      if (wk.squashed || !wk.active) continue;
      if (MARIO.Physics.aabb(player, wk)) {
        const wasAbove = player.prevFeetY <= wk.y + 8;   // feet were near/above enemy top
        const falling  = player.vy >= 0;
        if (wasAbove && falling) {
          wk.stomp(audio);
          player.vy = C.JUMP_VEL * 0.5;   // bounce
          score += 100;
          updateHUD();
        } else {
          if (player.hurt(audio)) { beginDying(); return; }
        }
      }
    }

    // Player vs coins
    for (const cn of coins) {
      if (!cn.taken && MARIO.Physics.aabb(player, cn)) {
        cn.taken = true;
        coinCount++;
        score += 50;
        audio.coin();
        updateHUD();
      }
    }

    // Player reaches flag -> win
    if (flag && !flag.reached && MARIO.Physics.aabb(player, flag)) {
      flag.reached = true;
      onWin();
    }
  }

  // Single entry point for any death (enemy hit OR pit). Deterministic frame timer.
  function beginDying() {
    if (gameState === 'DYING' || gameState === 'GAMEOVER' || gameState === 'WIN') return;
    player.beginDeath();            // pop-up animation + dead flag stops further input
    lives--;
    updateHUD();
    deathTimer = 45;                // ~0.75s at 60fps
    gameState = 'DYING';
  }

  // Advance the DYING countdown each physics step; resolve to respawn or game-over.
  function tickDeath() {
    deathTimer--;
    // keep animating the corpse falling during the pause
    player.vy = Math.min((player.vy || -10) + C.GRAVITY, C.MAX_FALL);
    player.y += player.vy;
    if (deathTimer > 0) return;

    if (lives <= 0) {
      gameState = 'GAMEOVER';
      showOverlay('GAME OVER', `Score ${score} · Press SPACE to retry`);
    } else {
      buildLevel();                 // fresh level + player at start
      player.invulnFrames = 90;
      gameState = 'PLAYING';
      hideOverlay();
    }
  }

  function onWin() {
    score += 1000;
    updateHUD();
    gameState = 'WIN';
    MARIO.Audio.win();
    showOverlay('🏆 YOU WIN!', `Score ${score} · Coins ×${coinCount} · Press SPACE to play again`);
  }

  function restartFromGameOverOrReady() {
    MARIO.Audio.unlock();
    if (gameState === 'READY') {
      gameState = 'PLAYING';
      hideOverlay();
    } else if (gameState === 'GAMEOVER' || gameState === 'WIN') {
      resetRun(true);
      gameState = 'PLAYING';
      hideOverlay();
    }
  }

  /* ---------------- fixed-step physics loop ---------------- */
  function stepPhysics() {
    const input = MARIO.Input;
    const audio = MARIO.Audio;

    // --- DYING: just count down + drop the corpse, no other simulation ---
    if (gameState === 'DYING') { tickDeath(); return; }

    player.update(level.solids, input, audio);

    // Pit fall-off? Route through the same deterministic death path.
    if (player.fellOffWorld) { beginDying(); return; }

    // enemies
    for (const wk of walkers) wk.update(level.solids, MARIO.Camera.getX(), audio);
    // remove finished squashed enemies
    for (let i = walkers.length-1; i>=0; i--) if (walkers[i].remove) walkers.splice(i,1);

    // coins animate
    for (const cn of coins) cn.update();

    MARIO.Camera.update(player);
    handleInteractions(audio);   // may set DYING internally via hurt()
  }

  let muted = false;
  function onKeyDown(e) {
    if (e.code === 'KeyM') {
      muted = !muted;
      MARIO.Audio.setMuted(muted);
      hudMute.textContent = muted ? 'SOUND OFF 🔇' : 'SOUND ON 🔊';
    }
    if (e.code === 'KeyR') {
      resetRun(true);
      gameState = 'PLAYING';
      hideOverlay();
    }
  }
  window.addEventListener('keydown', onKeyDown);

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!lastTime) lastTime = ts;
    let dt = ts - lastTime;
    lastTime = ts;
    if (dt > 250) dt = 250;             // avoid spiral after tab switch
    accumulator += dt;

    while (accumulator >= C.STEP_MS) {
      accumulator -= C.STEP_MS;
      // Simulate only while actively playing or counting down a death.
      if (gameState === 'PLAYING' || gameState === 'DYING') stepPhysics();
    }

    // render always
    MARIO.Render.render({ level, player, walkers, coins, flag });
  }

  /* ---------------- boot ---------------- */
  function init() {
    MARIO.Render.init(canvas);
    MARIO.Audio.unlock();               // attempt; real resume happens on first gesture
    resetRun(true);
    gameState = 'READY';
    showOverlay('SUPER EMOJI MARIO', 'Press SPACE to start');

    // First user gesture unlocks audio + starts
    const startHandler = () => {
      MARIO.Audio.unlock();
      if (gameState === 'READY' || gameState === 'GAMEOVER' || gameState === 'WIN') {
        restartFromGameOverOrReady();
      }
      // DYING intentionally ignores clicks — it auto-resolves after the timer.
    };
    window.addEventListener('pointerdown', startHandler, { once: false });
    // Space edge also handled inside Input; hook a direct listener for overlays
    window.addEventListener('keydown', (e) => {
      if ((e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW') &&
          (gameState==='READY'||gameState==='GAMEOVER'||gameState==='WIN')) {
        e.preventDefault();
        restartFromGameOverOrReady();
      }
    });
    // Note: DYING is NOT restartable by space — it resolves automatically.

    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
