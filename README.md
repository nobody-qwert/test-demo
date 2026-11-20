# Super Emoji Mario 🍄

A single-level platformer built with plain HTML/CSS/JS. No build step, no assets — emojis are the sprites and WebAudio synthesizes all sound effects.

## Run
Open `index.html` directly, or serve statically:

```bash
cd mario
python3 -m http.server 8000
# then visit http://localhost:8000
```

Classic `<script>` tags load order-independently via the `window.MARIO` namespace, so double-clicking `index.html` also works in most browsers.

## Controls
| Key | Action |
|-----|--------|
| ← → / A D | Move |
| ↑ / W / Space | Jump (hold for higher jump) |
| M | Toggle mute |
| R | Restart level (resets score/lives) |

## How to play
Run right through one hand-crafted level: gaps, pipes, floating platforms, coins, patrolling 👾 walkers, and a finish flag 🚩. Stomp enemies from above; touching them from the side costs a life. Fall into pits = death. Reach the flag to win.

## Structure
See `/PLAN.md` for full design notes. JS modules under `js/`:
- `config.js` tunable constants · `input.js` keyboard state · `audio.js` synth SFX
- `physics.js` AABB overlap + axis-separated resolution
- `entities.js` Player / Walker / Coin / Flag classes
- `level.js` string tile map → solids, coins, enemies
- `camera.js` clamped side-scroll camera
- `render.js` emoji sprite drawing on canvas
- `main.js` fixed-timestep loop, states, interactions, HUD wiring

Collision model: per-axis AABB resolution (move X → resolve → move Y → resolve), coyote time, variable-height jump, and prev-frame foot-position test for stomps.
