// Sound: quiet cues made live with the Web Audio API (no sound files, works offline). Two families keep it consistent:
// touches get short, dry clicks; events get soft notes from one warm major scale with a small room around them.
//   a step box, Back or Next ...... a crisp click, like a phone keyboard (Back a shade lower, Next a shade brighter)
//   a choice, chip or switch ....... a softer, lower click
//   dragging a slider .............. light detent ticks, higher as the value rises, like a picker wheel
//   a page opens (tab) ............. one wooden marimba note, higher for each tab to the right (Home lowest)
//   a step card lands .............. a soft low pop
//   the blend verdict changes ...... B30 a bright rising chord, B20 two calm notes, B15 a low soft pair (OBJ4, Decision now)
//   a new look ..................... a short shimmer
//   Slide to start (Home) .......... kalimba notes climbing with the knob, then three bells as the journey starts
//   each journey chapter ........... a small bell; while the camera moves, a kalimba note every so often (rising forward,
//                                    falling back, silent at rest)
// No swooshes and no drone: nothing plays while nothing moves. Browsers allow sound only after a first tap, so it wakes on the
// first tap anywhere unless the visitor has turned it off (the round mute button at the bottom right of every page, or the
// Sound switch in the Appearance menu); the choice is kept on this device.
// API: SOUND.enable()  SOUND.toggle()  SOUND.tap(kind)  SOUND.page(dir)  SOUND.land()  SOUND.start()  SOUND.slide(f)
//      SOUND.verdict(tabId, mandate)  SOUND.on

const SOUND = (() => {
  const KEY = 'mpob-sound';
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = v => { try { localStorage.setItem(KEY, v); } catch {} };
  const BELL = [880, 987.77, 1108.73, 1318.51, 1479.98, 1760]; // A major pentatonic, bright, for chimes
  const KALIMBA = [440, 493.88, 554.37, 659.26, 739.99, 880, 987.77, 1108.73, 1318.51]; // the same scale, an octave lower

  let ctx = null, master = null, room = null, click = null, on = false, btn = null, row = null;
  let lastQ = null, travel = 0, lastNote = 0, lastChapter = -1, timer = 0;

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master = ctx.createGain(); master.gain.value = 0;
    master.connect(comp); comp.connect(ctx.destination);
    // The click: 12 ms of noise, shaped once so every tap is identical (a real switch sounds the same each time).
    const n = Math.round(ctx.sampleRate * 0.012);
    click = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = click.getChannelData(0);
    for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 6) * (t < 0.04 ? t / 0.04 : 1); }
    // The room: a short, soft stereo reverb made from decaying, smoothed noise; notes send a little into it, clicks stay dry.
    const len = Math.round(ctx.sampleRate * 1.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const x = ir.getChannelData(ch); let s = 0;
      for (let i = 0; i < len; i++) { s = s * 0.55 + (Math.random() * 2 - 1) * 0.45; x[i] = s * Math.pow(1 - i / len, 3.2); }
    }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    room = ctx.createGain(); room.gain.value = 0.9;
    room.connect(conv); conv.connect(master);
    document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : on && ctx.resume(); });
    return true;
  }

  function enable() {
    if (!ctx && !build()) return;
    ctx.resume();
    on = true; save('on');
    master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.2);
    if (!timer) timer = setInterval(follow, 120);
    paint();
  }
  function disable() {
    on = false; save('off');
    if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    paint();
  }
  const toggle = () => (on ? disable() : enable());
  const live = () => Boolean(ctx && on && ctx.state !== 'closed');

  // One soft note: a sine (and a quieter octave) with a quick attack, a natural decay and a little of the room.
  function note(freq, { at = 0, gain = 0.06, decay = 0.9, type = 'sine', pan = 0, octave = 0.25, wet = 0.22 } = {}) {
    const t = ctx.currentTime + at;
    const bus = ctx.createGain(); bus.gain.value = 1;
    let out = bus;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; bus.connect(p); out = p; }
    out.connect(master);
    if (wet) { const send = ctx.createGain(); send.gain.value = wet; out.connect(send); send.connect(room); }
    [[freq, 1, type], [freq * 2, octave, 'sine']].forEach(([f, level, ty]) => {
      if (!level) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = ty; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * level, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + decay + 0.05);
    });
  }
  // A dry click: the shaped noise through a band-pass, with an optional tiny tonal body.
  function clickAt(freq, { gain = 0.55, q = 1.6, body = 0, bodyGain = 0.05 } = {}) {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = click;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = Math.min(1200, freq * 0.5);
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(master); src.start(t);
    if (body) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(body, t); o.frequency.exponentialRampToValueAtTime(body * 0.63, t + 0.012);
      og.gain.setValueAtTime(bodyGain, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
      o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.03);
    }
  }

  // Touches.
  function tap(kind = 'step') {
    if (!live()) return;
    if (kind === 'soft') return clickAt(1900, { gain: 0.32, q: 1.2, body: 900, bodyGain: 0.04 });
    clickAt(kind === 'back' ? 2700 : kind === 'next' ? 3900 : 3400, { body: kind === 'back' ? 1500 : kind === 'next' ? 2200 : 1900 });
  }
  let lastDetent = 0;
  function detent(f) { // f: 0..1 along the slider
    if (!live()) return;
    const now = performance.now(); if (now - lastDetent < 45) return; lastDetent = now;
    clickAt(1300 + Math.max(0, Math.min(1, f)) * 1800, { gain: 0.16, q: 5 });
  }

  // Events.
  // A page opens: one soft wooden marimba note, pitched by the tab's place in the top bar (Home lowest, Decision now
  // highest), so the ear knows where it landed. A marimba bar is a sine with a bright 4x overtone that dies fast, plus the
  // knock of the mallet.
  const TAB_NOTES = [329.63, 369.99, 440, 493.88, 554.37, 659.26]; // E4 up to E5 on the same A major scale
  function page(dir = 1, index = 0) {
    if (!live()) return;
    const k = Math.max(0, Math.min(TAB_NOTES.length - 1, index)), f = TAB_NOTES[k], t = ctx.currentTime;
    const bus = ctx.createGain(); bus.gain.value = 1;
    let out = bus;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = (k / (TAB_NOTES.length - 1) - 0.5) * 0.5; bus.connect(p); out = p; }
    out.connect(master);
    const send = ctx.createGain(); send.gain.value = 0.12; out.connect(send); send.connect(room);
    [[f, 0.085, 0.55], [f * 4, 0.03, 0.12], [f * 9.2, 0.008, 0.04]].forEach(([fr, level, decay]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = fr;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + decay + 0.05);
    });
    clickAt(Math.min(4000, f * 5), { gain: 0.14, q: 2.2 });
  }
  function land() {
    if (!live()) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(190, t + 0.09);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.16);
  }
  function start() {
    if (!live()) return;
    [0, 2, 4].forEach((k, i) => note(BELL[k], { at: i * 0.11, gain: 0.05, decay: 1.4, pan: (i - 1) * 0.3, wet: 0.3 }));
  }
  function chime(ch) { note(BELL[ch % BELL.length], { gain: 0.045, decay: 1.8, pan: (Math.random() - 0.5) * 0.6, octave: 0.3, wet: 0.3 }); }
  function pluck(freq, pan, gain = 0.032) { note(freq, { gain, decay: 1.1, pan, octave: 0.12, wet: 0.25 }); }
  let slideStep = -1;
  function slide(f) { // the Home knob: one kalimba note per eighth of the track, climbing
    if (!live()) return;
    const k = Math.floor(Math.max(0, Math.min(0.999, f)) * 8);
    if (f < 0.02) { slideStep = -1; return; }
    if (k > slideStep) { slideStep = k; pluck(KALIMBA[Math.min(KALIMBA.length - 1, k)], (f - 0.5) * 0.6, 0.03); }
  }
  let verdictTab = null, verdictLast = null;
  function verdict(tabId, m) { // only when the verdict changes on the page in hand, never on arrival
    if (tabId !== verdictTab) { verdictTab = tabId; verdictLast = m; return; }
    if (m === verdictLast) return;
    verdictLast = m;
    if (!live()) return;
    const notes = m === 'B30' ? [659.26, 830.61, 987.77, 1318.51] : m === 'B15' ? [554.37, 440] : [659.26, 880];
    notes.forEach((f, i) => note(f, { at: i * 0.075, gain: m === 'B30' ? 0.045 : 0.04, decay: m === 'B30' ? 1.3 : 1, pan: (i - (notes.length - 1) / 2) * 0.25, wet: 0.3 }));
  }
  function shimmer() {
    if (!live()) return;
    [1760, 1479.98, 1318.51, 1108.73].forEach((f, i) => note(f, { at: i * 0.045, gain: 0.018, decay: 0.7, octave: 0, pan: 0.3 - i * 0.2, wet: 0.45 }));
  }

  // Follow the Home journey: every stretch of camera travel plays one kalimba note, placed on the scale by where you are,
  // so moving forward climbs and moving back descends; at most about four notes a second; a bell marks each chapter.
  function follow() {
    if (!live()) return;
    const story = typeof HOME !== 'undefined' ? HOME.scene?.story : null;
    if (!story || !document.querySelector('#page .story')) { lastQ = null; lastChapter = -1; travel = 0; return; }
    const q = Number(story.progress) || 0, now = performance.now();
    if (lastQ !== null) travel += Math.abs(q - lastQ);
    const dir = lastQ === null ? 1 : Math.sign(q - lastQ) || 1;
    lastQ = q;
    if (travel > 0.014 && now - lastNote > 240) {
      travel = 0; lastNote = now;
      const pos = Math.max(0, Math.min(1, q)) * (KALIMBA.length - 1) * 2.4; // climbs the scale a little over twice per journey
      const k = Math.round(pos) % (KALIMBA.length * 2 - 2), idx = k < KALIMBA.length ? k : KALIMBA.length * 2 - 2 - k;
      pluck(KALIMBA[Math.max(0, Math.min(KALIMBA.length - 1, idx + (dir < 0 ? -1 : 0)))], (q - 0.5) * 0.8);
    }
    const ch = Math.max(0, Number(story.chapter) || 0);
    if (ch !== lastChapter) { if (lastChapter !== -1) chime(ch); lastChapter = ch; }
  }

  // Touch sounds that need no wiring in the app: sliders tick as they move; choices, chips and switches click softly.
  // (Step boxes, Back and Next are wired in app.js; the looks shimmer when the page's theme changes.)
  document.addEventListener('input', e => {
    const el = e.target;
    if (!el?.matches?.('input[type=range]')) return;
    const min = Number(el.min) || 0, max = Number(el.max) || 100;
    detent((Number(el.value) - min) / Math.max(1e-9, max - min));
  }, true);
  document.addEventListener('click', e => {
    const t = e.target?.closest?.('.chip, .seg button, .choice, .mini-case, .switch, [data-set], [data-switch]');
    if (t && !t.closest('.theme-sound') && !t.matches('[data-go], [data-back], [data-next], [data-tab]')) tap('soft');
  }, true);
  new MutationObserver(() => shimmer()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Two controls show the same setting: the round mute button (every page) and the Sound switch in the Appearance menu.
  const ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  const wanted = () => read() !== 'off';
  function paint() {
    const isOn = on || (!ctx && wanted());
    if (btn) {
      btn.innerHTML = isOn ? ICON_ON : ICON_OFF;
      btn.setAttribute('aria-pressed', String(!isOn));
      btn.setAttribute('aria-label', isOn ? 'Mute sound' : 'Turn sound on');
      btn.title = isOn ? 'Mute sound' : 'Sound is off. Turn it on';
    }
    row?.querySelector('.switch')?.setAttribute('aria-checked', String(isOn));
  }
  // The mute button floats at the bottom right of every page (the top bar has no room left). If it would sit on another
  // button or field, such as Next at the foot of a step card, it slides up out of the way.
  const CSS = `.sound-fab { position: fixed; z-index: 30; right: max(16px, env(safe-area-inset-right, 0px)); bottom: max(16px, env(safe-area-inset-bottom, 0px));
  width: 44px; height: 44px; padding: 0; display: grid; place-items: center; border-radius: 50%; cursor: pointer;
  color: var(--ink); background: color-mix(in srgb, var(--card) 82%, transparent); border: 1px solid var(--line);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 10px 26px -12px rgba(0, 0, 0, .45);
  transition: translate .45s cubic-bezier(.34, 1.4, .64, 1), background-color .2s ease, color .2s ease, scale .12s ease; }
.sound-fab svg { width: 20px; height: 20px; }
.sound-fab[aria-pressed="true"] { color: var(--muted); }
.sound-fab:active { scale: .92; }
.sound-fab:focus-visible { outline: 3px solid color-mix(in srgb, var(--s1) 60%, transparent); outline-offset: 3px; }
.sound-fab.shy { translate: 0 -64px; }
.home-on .sound-fab { color: #fffaf0; background: rgba(10, 16, 22, .55); border-color: rgba(255, 255, 255, .22); }
.home-on .sound-fab[aria-pressed="true"] { color: rgba(255, 250, 240, .6); }
.theme-sound { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; padding: 10px 10px 4px; border-top: 1px solid var(--line); }
.theme-sound b { display: block; font-size: 13px; color: var(--ink); }
.theme-sound small { display: block; font-size: 11px; line-height: 1.3; color: var(--muted); }
@media print { .sound-fab { display: none !important; } }`;
  function style() { if (!document.getElementById('sound-style')) { const s = document.createElement('style'); s.id = 'sound-style'; s.textContent = CSS; document.head.appendChild(s); } }
  // Pressing the button while the journey plays must not stop it: the journey stops on any press, so note it first.
  let resume = false;
  ['pointerdown', 'keydown'].forEach(t => addEventListener(t, e => {
    if (e.target?.closest?.('.sound-fab')) resume = Boolean(typeof HOME !== 'undefined' && HOME.scene?.story?.auto);
  }, { capture: true }));
  function mountFab() {
    if (btn || !document.body) return;
    style();
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'sound-fab';
    btn.addEventListener('click', () => { toggle(); if (resume) { resume = false; HOME.scene?.play(); } });
    document.body.appendChild(btn); paint();
    let queued = false;
    const dodge = () => {
      queued = false;
      const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.bottom + (btn.classList.contains('shy') ? 64 : 0) - r.height / 2;
      const under = document.elementsFromPoint(x, y).find(el => el !== btn && !btn.contains(el) && el.closest?.('button, a, input, select, textarea, [role="slider"]'));
      btn.classList.toggle('shy', Boolean(under));
    };
    const ask = () => { if (!queued) { queued = true; requestAnimationFrame(dodge); } };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); setInterval(ask, 1000);
  }
  function mountMenu() {
    const pop = document.getElementById('theme-pop');
    if (!pop || row) return Boolean(row);
    style();
    row = document.createElement('div'); row.className = 'theme-sound';
    row.innerHTML = '<span><b>Sound</b><small>Clicks, chimes and the journey notes</small></span><button type="button" class="switch" role="switch" aria-checked="false" aria-label="Sound"></button>';
    row.querySelector('.switch').addEventListener('click', toggle);
    pop.appendChild(row); paint();
    return true;
  }
  // Wake on the first tap anywhere unless the visitor turned sound off.
  const wake = e => {
    if (e.target?.closest?.('.sound-fab, .theme-sound')) return; // that tap sets the choice itself
    removeEventListener('pointerdown', wake, true);
    if (!on && wanted()) enable();
  };
  addEventListener('pointerdown', wake, true);
  let tries = 0; const menuTimer = setInterval(() => { if (mountMenu() || ++tries > 60) clearInterval(menuTimer); }, 250);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFab); else setTimeout(mountFab);

  return { enable, disable, toggle, tap, page, land, start, slide, verdict, get on() { return on; }, get muted() { return read() === 'off'; } };
})();
