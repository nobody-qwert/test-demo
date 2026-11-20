window.MARIO = window.MARIO || {};

MARIO.Render = (() => {
  const C = MARIO.CONFIG;
  let ctx = null;
  let skyGrad = null;

  function init(c) {
    ctx = c.getContext('2d');
    // Opaque sky gradient painted every frame -> no transparency/fog from clearRect.
    skyGrad = ctx.createLinearGradient(0, 0, 0, C.HEIGHT);
    skyGrad.addColorStop(0, '#5aa9ff');
    skyGrad.addColorStop(0.7, '#a6ddff');
    skyGrad.addColorStop(1, '#eafcff');
  }

  function drawEmoji(ch, cx, cy, size, flipX = false, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (flipX) {
      ctx.translate(cx, cy);
      ctx.scale(-1, 1);
      ctx.translate(-cx, -cy);
    }
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, cx, cy);
    ctx.restore();
  }

  /* ---------- background (parallax sky, hills, clouds) ---------- */
  function drawBackground(camX) {
    const W = C.WIDTH, H = C.HEIGHT;
    // Paint an OPAQUE sky first so nothing behind the canvas bleeds through.
    ctx.globalAlpha = 1;
    ctx.fillStyle = skyGrad || '#7ec8ff';
    ctx.fillRect(0, 0, W, H);

    // distant hills (opaque-ish but still fully opaque color)
    ctx.fillStyle = '#7cc47c';
    for (let i = -1; i < 6; i++) {
      const hx = ((i * 260 - camX * 0.3) % (W + 260) + (W + 260)) % (W + 260) - 130;
      ctx.beginPath();
      ctx.arc(hx, H, 190, Math.PI, 0);
      ctx.fill();
    }

    // clouds
    for (let i = 0; i < 7; i++) {
      const cx0 = ((i * 200 - camX * 0.15) % (W + 160) + (W + 160)) % (W + 160) - 80;
      drawEmoji('☁️', cx0, 40 + (i % 3) * 26, 34 + (i % 2) * 8, false, 0.9);
    }
  }

  /* ---------- tiles ---------- */
  function drawTiles(solids, camX) {
    for (const s of solids) {
      const sx = s.x - camX;
      if (sx > C.WIDTH || sx + s.w < 0) continue;   // cull offscreen
      switch (s.type) {
        case 'ground':
          drawGroundTile(sx, s.y);
          break;
        case 'brick':
          drawBrickTile(sx, s.y);
          break;
        case 'platform':
          drawPlatformTile(sx, s.y);
          break;
        case 'pipe':
          drawPipeBlock(sx, s.y, !!s.cap);
          break;
        // flagpole no longer lives in solids -> drawn separately via drawFlagPole()
      }
    }
  }

  // Crisp solid ground tile (brown earth with grass hint on top)
  function drawGroundTile(sx, sy) {
    const T = C.TILE;
    ctx.fillStyle = '#b07a45';                 // dirt
    ctx.fillRect(sx, sy, T, T);
    ctx.fillStyle = '#9c6636';                 // darker speckle band
    ctx.fillRect(sx, sy + T - 6, T, 6);
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + .5, sy + .5, T - 1, T - 1);
  }

  // Brick: solid red-brown with mortar lines
  function drawBrickTile(sx, sy) {
    const T = C.TILE;
    ctx.fillStyle = '#c0562e';
    ctx.fillRect(sx, sy, T, T);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy + T/2); ctx.lineTo(sx + T, sy + T/2);   // horizontal mortar
    ctx.moveTo(sx + T/2, sy);   ctx.lineTo(sx + T/2, sy + T/2); // upper vert
    ctx.moveTo(sx + T/4, sy+T/2); ctx.lineTo(sx + T/4, sy + T);
    ctx.moveTo(sx + 3*T/4, sy+T/2); ctx.lineTo(sx + 3*T/4, sy + T);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1; ctx.strokeRect(sx+.5, sy+.5, T-1, T-1);
  }

  // One-way platform: slim wooden plank
  function drawPlatformTile(sx, sy) {
    const T = C.TILE;
    ctx.fillStyle = '#a06a2a';
    ctx.fillRect(sx, sy + 4, T, T/2);            // thin slab near top of its cell
    ctx.fillStyle = '#c08a3e';
    ctx.fillRect(sx, sy + 4, T, 4);
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 1; ctx.strokeRect(sx+.5, sy+4.5, T-1, T/2-1);
  }

  // Solid green Mario pipe. cap=true draws the flared lip on this tile only.
  function drawPipeBlock(sx, sy, isCap) {
    const T = C.TILE;
    const bodyL = sx + 3, bodyW = T - 6;         // inset body so it's clearly a column
    // main body fill (full height of tile, solid)
    ctx.fillStyle = '#2ea043';
    ctx.fillRect(bodyL, sy, bodyW, T);
    // highlight left, shade right for roundness
    ctx.fillStyle = '#67d97f';
    ctx.fillRect(bodyL + 3, sy, 4, T);
    ctx.fillStyle = '#1c7a2b';
    ctx.fillRect(bodyL + bodyW - 6, sy, 4, T);
    // outline
    ctx.strokeStyle = '#155c20';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bodyL + .5, sy + .5, bodyW - 1, T - 1);

    if (isCap) {
      // wider flared cap sitting slightly overhang the body
      const capL = sx + 1, capW = T - 2;
      ctx.fillStyle = '#2ea043';
      ctx.fillRect(capL, sy, capW, T*0.45);
      ctx.fillStyle = '#67d97f';
      ctx.fillRect(capL + 3, sy, 5, T*0.45);
      ctx.fillStyle = '#1c7a2b';
      ctx.fillRect(capL + capW - 8, sy, 5, T*0.45);
      ctx.strokeStyle = '#155c20';
      ctx.strokeRect(capL + .5, sy + .5, capW - 1, T*0.45 - 1);
    }
  }

  // Thin metallic flagpole segment (walk-through). Drawn as a centered bar.
  function drawFlagPole(pole, camX) {
    const cx = pole.x - camX + pole.w / 2;
    if (cx > C.WIDTH + 20 || cx < -20) return;
    ctx.save();
    // pole shaft ~6px wide, full tile tall
    ctx.fillStyle = '#cfd6dd';
    ctx.fillRect(cx - 3, pole.y, 6, pole.h);
    ctx.fillStyle = '#8b949e';                 // shading edge
    ctx.fillRect(cx + 1, pole.y, 2, pole.h);
    ctx.restore();
  }

  /* ---------- player (a full-body man) ---------- */
  function drawPlayer(p, camX) {
    if (p.dead && p.y > C.HEIGHT + 40) return;
    const sx = p.x - camX + p.w/2;
    const sy = p.y + p.h/2;
    const moving = !p.dead && Math.abs(p.vx) > 0.2;
    let glyph;
    if (p.dead)            glyph = '🏃‍♂️';          // reuse runner for tumble
    else if (moving)       glyph = '🏃‍♂️';           // full-body running man
    else                   glyph = '🚶‍♂️';           // standing/walking man (full body)
    const bob = (moving && p.onGround) ? Math.abs(Math.sin(p.animT)) * -2 : 0;
    // NOTE: 🏃‍♂️ / 🚶‍♂️ face LEFT natively (Apple Color Emoji).
    // So to make him face RIGHT we must mirror; face LEFT needs no mirror.
    const flipForRightFacing = p.facing > 0;
    drawGlyphBig(glyph, sx, sy + bob, flipForRightFacing, p.invulnFrames > 0 ? 0.55 : 1);
  }

  // Big, crisp glyph with a soft dark drop-shadow so a small man reads clearly on sky.
  function drawGlyphBig(ch, cx, cy, flipX=false, alpha=1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (flipX){ ctx.translate(cx,cy); ctx.scale(-1,1); ctx.translate(-cx,-cy); }
    ctx.font = `34px "Apple Color Emoji","Segoe UI Emoji",serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.globalAlpha = alpha * 0.25;            // shadow pass
    ctx.fillText(ch, cx+1.5, cy+2.5);
    ctx.globalAlpha = alpha;
    ctx.fillText(ch, cx, cy);
    ctx.restore();
  }

  /* ---------- walkers ---------- */
  function drawWalker(wk, camX) {
    const sx = wk.x - camX + wk.w/2;
    if (sx > C.WIDTH+30 || sx < -30) return;
    const sy = wk.y + wk.h/2;
    if (wk.squashed) {
      drawEmoji('🦶', sx, sy+6, 18, false, Math.min(1, wk.squashTimer/15));
    } else {
      const step = Math.sin(wk.animT)*1.5;
      drawEmoji('👾', sx, sy+step, 24, wk.dir>0, 1);
    }
  }

  /* ---------- coins ---------- */
  function drawCoin(c, camX) {
    if (c.taken) return;
    const sx = c.x - camX + c.w/2;
    if (sx > C.WIDTH+20 || sx < -20) return;
    const spin = Math.abs(Math.cos(c.spinT));         // squash to fake rotation
    ctx.save();
    ctx.translate(sx, c.y + c.h/2);
    ctx.scale(0.4 + 0.6*spin, 1);
    ctx.font = `22px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🪙', 0, 0);
    ctx.restore();
  }

  /* ---------- flag ---------- */
  function drawFlag(f, camX) {
    if (!f) return;
    const sx = f.x - camX + C.TILE/2;
    if (sx > C.WIDTH+60 || sx < -60) return;
    drawEmoji('🚩', sx, f.y - 6, 40);
  }

  function render(state) {
    const camX = MARIO.Camera.getX();
    drawBackground(camX);
    drawTiles(state.level.solids, camX);
    if (state.level.flagPoles) for (const pl of state.level.flagPoles) drawFlagPole(pl, camX);
    for (const w of state.walkers) drawWalker(w, camX);
    for (const c of state.coins) drawCoin(c, camX);
    drawFlag(state.flag, camX);
    drawPlayer(state.player, camX);
  }

  return { init, render };
})();
