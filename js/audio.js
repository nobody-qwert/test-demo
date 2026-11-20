window.MARIO = window.MARIO || {};

MARIO.Audio = (() => {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Generic tone helper
  function tone({ freq = 440, endFreq = null, dur = 0.12, type = 'square', vol = 0.9, when = 0 }) {
    const c = ensureCtx();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Noise burst (stomp / thud)
  function noise({ dur = 0.15, vol = 0.7, when = 0, lowpass = 800 }) {
    const c = ensureCtx();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = lowpass;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  return {
    unlock: ensureCtx,          // call on first user gesture
    setMuted(m) { muted = m; }, isMuted: () => muted,
    jump()   { tone({ freq: 320, endFreq: 660, dur: 0.14, type: 'square', vol: 0.7 }); },
    coin()   { tone({ freq: 988, dur: 0.06, type: 'square', vol: 0.6 });
               setTimeout(() => tone({ freq: 1319, dur: 0.12, type: 'square', vol: 0.6 }), 60); },
    stomp()  { noise({ dur: 0.14, vol: 0.8, lowpass: 500 });
               tone({ freq: 160, endFreq: 70, dur: 0.12, type: 'triangle', vol: 0.7 }); },
    death()  { tone({ freq: 400, endFreq: 90, dur: 0.5, type: 'sawtooth', vol: 0.6 }); },
    win()    { [523, 659, 784, 1047].forEach((f, i) =>
                   tone({ freq: f, dur: 0.16, type: 'square', vol: 0.6, when: i * 0.12 })); },
    bump()   { tone({ freq: 120, endFreq: 80, dur: 0.08, type: 'triangle', vol: 0.6 }); }
  };
})();
