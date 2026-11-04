// Step morph: how the step cards arrive when an objective or the Decision page opens.
// The cards of the page being left break into dust in their own colours; the dust spirals into a vortex over the step
// row; the new cards spin out of that vortex, swing up in an arc and drop into their places with a small hop, then hand
// over to the real cards underneath. The flying cards are copies in a layer above the page, so nothing is clipped by the
// row's sideways scroll; the real buttons stay in place and usable the whole time.
// The hive and its writing (home.js) are not touched. Under Reduce motion nothing moves and the cards simply appear.
// The flight is a first welcome: each page plays it once per visit to the studio. Going back to a page already seen,
// the cards only pop up in place (a 10px rise from 94% size on a spring with a small overshoot, 30ms apart, about
// half a second), so moving back and forth between objectives is quick but still alive.
//
// How it stays smooth on a phone (changed 4 Nov 2026; measure before undoing any of this):
// - Each card's whole path is worked out once and handed to the browser as a Web Animation of transform and opacity, so
//   it runs on the compositor: a busy main thread cannot slow it down or make it stutter, and it plays at the screen's
//   own rate. Nothing reads the layout during the flight.
// - One continuous path. The orbit blends into the drop and the spin eases out over the whole flight, so a card never
//   stops between the two.
// - The copies are flat: no moving picture, shadow, reflection or moving sheen. The real cards rest (their pictures hidden
//   and still) until their copy lands.
// - The hand-over waits for the last card. Each copy rests in place until then, so nothing wakes up while cards are still
//   in the air; every real card appears at once under its copy, and the moving pictures start only when the copies are gone.
// - The cards' own CSS entrance (nodeIn) stays off afterwards. Taking is-morphing away alone would restart it, and the
//   cards that had just landed would vanish and come in a second time.
// - The dust is capped, lighter on touch screens, and drawn from small pre-made dots.
//
// Self-contained: it brings its own small stylesheet, so shared.css stays identical across the two levels.
// API:  MORPH.capture(oldPage) -> boxes   (call before the old page starts to move)
//       MORPH.play(newPage | null, boxes, key, { quiet })  (null for Home: the old cards just turn to dust; key names
//       the page; quiet: the page opened without a click, so the cards pop and the flight is kept for the first click)
//       Call play() before the new page starts its own fold: it measures the row at rest.
//       MORPH.stageAfter: milliseconds after the flight starts when the step below the row can be built.

const MORPH = (() => {
  const TAU = Math.PI * 2;
  const M = () => (typeof MOTION === 'undefined' ? null : MOTION);
  const reduce = () => Boolean(M() ? M().reduce : window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  // Timing (seconds). Card i starts STAGGER * i after card 0. A card lands at spin + fly, and rests hop later.
  const T = { spin: 0.5, fly: 0.52, hop: 0.2, fade: 0.14, stagger: 0.06 };
  const LAND = T.spin + T.fly, REST = LAND + T.hop;
  const TURNS = 720; // the spin, in degrees, across the whole flight
  const STAGE_AFTER = 500; // milliseconds after the cards start when the step below the row can be built: they run on the compositor
  // How much dust. Touch screens get less: the look is the same at phone size and the GPU has far less to do.
  const COARSE = Boolean(window.matchMedia?.('(pointer: coarse)').matches);
  const DUST = COARSE ? { max: 380, card: 36, feed: 50, burst: 12, trail: 0.3, air: 30 } : { max: 1200, card: 80, feed: 110, burst: 22, trail: 0.7, air: 60 };
  // The revisit pop: a damped spring (damping ratio 0.75, launched at 8 units/s) sampled for CSS linear(): halfway in
  // a tenth of its time, 5% overshoot. The cubic-bezier written before it is the fallback for browsers without linear().
  const POP_SPRING = 'linear(0, 0.142, 0.275, 0.398, 0.51, 0.61, 0.697, 0.771, 0.835, 0.888, 0.931, 0.966, 0.993, 1.013, 1.028, 1.038, 1.045, 1.048, 1.049, 1.048, 1.046, 1.043, 1.039, 1.035, 1.031, 1.027, 1.023, 1.019, 1.016, 1.013, 1.01, 1.008, 1.006, 1.004, 1.003, 1.002, 1)';

  const CSS = `
.morph-dust { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 18; pointer-events: none; }
.morph-layer { position: absolute; left: 0; top: 0; width: 100%; z-index: 19; pointer-events: none; overflow: hidden; }
.morph-layer .node.morph-card { position: absolute; left: 0; top: 0; margin: 0; animation: none; transition: none; will-change: transform, opacity; }
.morph-layer .node-title, .morph-layer .node-label, .morph-layer .node-value { visibility: hidden; backdrop-filter: none; -webkit-backdrop-filter: none; }
:root .morph-layer .ring { transition: none; overflow: hidden; background: var(--c); box-shadow: none; -webkit-box-reflect: none; filter: none; }
.morph-layer .ring *, .morph-layer .ring *::before, .morph-layer .ring *::after { animation: none !important; transition: none !important; }
.morph-layer .ring > .step-art { transform: scale(1.04); }
.morph-layer .disc, .morph-layer .morph-sheen { will-change: opacity; }
.morph-layer .morph-sheen { position: absolute; inset: 0; z-index: 3; border-radius: inherit; pointer-events: none; opacity: 0;
  background: linear-gradient(115deg, rgba(255, 255, 255, .12) 20%, rgba(255, 255, 255, .6) 50%, rgba(255, 255, 255, .12) 80%); }
.flow-wrap.is-morphing .node, .flow-wrap.morph-done .node { animation: none; }
:root .flow-wrap.is-morphing .node .ring { -webkit-box-reflect: none; }
.flow-wrap.is-morphing .ring > .step-art, .flow-wrap.is-morphing .ring > .step-art * { animation: none !important; transition: none !important; }
:root .flow-wrap.is-morphing .node.morph-wait .ring { transform: scale(.001) !important; opacity: 0 !important; transition: none !important; }
.flow-wrap.is-morphing .node.morph-wait .ring > .step-art { visibility: hidden; } /* not display: none, the copies borrow its gradients */
.flow-wrap.is-morphing .node .node-value { backdrop-filter: none; -webkit-backdrop-filter: none; }
.flow-wrap.is-morphing .node .node-title, .flow-wrap.is-morphing .node .node-value {
  transition: opacity .22s ease, transform .34s var(--spring, cubic-bezier(.2, .9, .3, 1.2)); }
.flow-wrap.is-morphing .node.morph-name .node-title, .flow-wrap.is-morphing .node.morph-name .node-value { opacity: 0; transform: translateY(10px); }
:root .flow-wrap .node.morph-snap .ring { transition: none !important; }
.flow-wrap.morph-seen .node { animation: morphPop .5s cubic-bezier(.3, 1.3, .5, 1) backwards, morphFade .16s ease-out backwards;
  animation-timing-function: ${POP_SPRING}, ease-out; animation-delay: calc(var(--i, 0) * 30ms); }
@keyframes morphPop { from { transform: translateY(10px) scale(.94); } to { transform: none; } }
@keyframes morphFade { from { opacity: 0; } to { opacity: 1; } }`;

  let layer = null, cv = null, ctx = null, W = 0, H = 0, dpr = 1, raf = 0, last = 0, dark = false;
  let run = null;
  const seen = new Set(); // pages whose cards have already flown in
  const parts = [], ripples = [], dots = new Map();

  function ensure() {
    if (layer) return true;
    const style = document.createElement('style'); style.id = 'morph-style'; style.textContent = CSS; document.head.appendChild(style);
    cv = document.createElement('canvas'); cv.className = 'morph-dust'; cv.setAttribute('aria-hidden', 'true');
    layer = document.createElement('div'); layer.className = 'morph-layer has-hall'; layer.setAttribute('aria-hidden', 'true');
    document.body.append(cv, layer);
    ctx = cv.getContext('2d');
    size(); addEventListener('resize', size);
    M()?.watch?.(on => { if (on) finish(true); });
    return true;
  }
  function size() {
    // A phone's address bar sliding away fires resize with a little more height: keep the canvas for that, it is only
    // worth reallocating when the width changes. A turned phone also ends a flight, because its targets have moved.
    const wide = innerWidth !== W;
    if (!wide && innerHeight <= H) return;
    if (wide && run) finish(false);
    dpr = Math.min(COARSE ? 1.5 : 2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  const colourOf = el => (el && getComputedStyle(el).getPropertyValue('--c').trim()) || '#7b8af0';
  function darkGround() {
    for (const el of [document.body, document.documentElement]) {
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (!m || (m.length > 3 && Number(m[3]) === 0)) continue;
      return 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2] < 128;
    }
    return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  }

  /* ── dust ─────────────────────────────────────────── */
  function spawn(p) { if (parts.length >= DUST.max) parts[Math.floor(Math.random() * parts.length)] = p; else parts.push(p); kick(); }
  function dustFrom(box, n, target) {
    for (let k = 0; k < n; k++) {
      const x = box.x + Math.random() * box.w, y = box.y + Math.random() * box.h;
      // a dissolve that sweeps across the card: the far side lets go a little later
      const delay = ((x - box.x) / Math.max(1, box.w)) * 0.22 + Math.random() * 0.08;
      spawn({ x, y, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 90, age: -delay, life: 0.9 + Math.random() * 0.7,
        r: 0.8 + Math.random() * 1.8, c: box.c, tx: target?.x, ty: target?.y, seek: Boolean(target), sw: (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random()) });
    }
  }
  function dissolve(boxes, target) {
    if (!boxes?.length || reduce()) return;
    ensure();
    boxes.forEach(b => dustFrom(b, Math.min(DUST.card, Math.round((b.w * b.h) / 240)), target));
  }
  function burst(x, y, c, w) {
    for (let k = 0; k < DUST.burst; k++) {
      const a = Math.PI + Math.random() * Math.PI, s = 60 + Math.random() * 220;
      spawn({ x: x + (Math.random() - 0.5) * w * 0.8, y, vx: Math.cos(a) * s * 1.6, vy: Math.sin(a) * s * 0.5, age: 0, life: 0.4 + Math.random() * 0.35, r: 0.8 + Math.random() * 1.6, c, seek: false });
    }
    ripples.push({ x, y, c, age: 0, life: 0.5, w });
    kick();
  }

  /* ── cards ────────────────────────────────────────── */
  function capture(page) {
    if (!page || reduce()) return [];
    const out = [];
    page.querySelectorAll('.flow .node').forEach(node => {
      const r = node.querySelector('.ring')?.getBoundingClientRect();
      if (r && r.width > 6 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) out.push({ x: r.left, y: r.top, w: r.width, h: r.height, c: colourOf(node) });
    });
    if (run) run.cards.forEach(c => { if (!c.done && started(c)) { const r = c.ring.getBoundingClientRect(); if (r.width > 6) out.push({ x: r.left, y: r.top, w: r.width, h: r.height, c: c.c }); } });
    return out;
  }
  const clock = c => (Number(c.anim.currentTime) || 0) / 1000 - c.delay; // this card's own time, from the animation itself
  const started = c => clock(c) > 0;

  // Where card c is at its own time u. Orbit and drop are one curve: the orbit keeps turning while the drop takes over,
  // so the speed never falls to nothing between them, and the card comes down with real speed into the hop.
  function pose(c, u, v) {
    if (u >= LAND) {
      const h = u - LAND, env = Math.max(0, 1 - h / T.hop);
      const sq = Math.exp(-14 * h) * Math.sin(30 * h) * env;
      const sy = 1 - 0.2 * sq;
      return { x: c.tx, y: c.ty - Math.abs(Math.sin(16 * h)) * 9 * Math.exp(-11 * h) * env + (c.rh / 2) * (1 - sy),
        s: 1, sx: 1 + 0.12 * sq, sy, ry: c.dir * TURNS, rz: 0, op: 1 };
    }
    const e = 1 - Math.pow(1 - Math.min(1, u / T.spin), 3), th = c.th0 + c.dir * u * 9, depth = Math.sin(th);
    const r = v.R * (0.22 + 0.78 * e);
    const ox = v.x + Math.cos(th) * r, oy = v.y - 8 + depth * r * 0.32, os = (0.42 + 0.3 * e) * (0.86 + 0.14 * depth);
    const k = Math.max(0, (u - T.spin) / T.fly), wx = k * k * (3 - 2 * k), wy = Math.pow(k, 2.2);
    const shade = 0.7 + 0.3 * (depth * 0.5 + 0.5);
    return { x: ox + (c.tx - ox) * wx, y: oy + (c.ty - oy) * wy - c.lift * Math.sin(Math.PI * Math.pow(k, 0.8)),
      s: os + (1 - os) * wx, sx: 1, sy: 1, ry: c.dir * TURNS * (1 - Math.pow(1 - u / LAND, 2.6)),
      rz: Math.cos(th) * 12 * (1 - 0.4 * e) * (1 - wx) + Math.sin(Math.PI * k) * c.dir * 8,
      op: Math.min(1, u / 0.12) * (shade + (1 - shade) * wx) };
  }
  // The whole flight, sampled at 60 per second and handed to the compositor, which plays it at the screen's own rate.
  function launch(c, v) {
    const n = Math.ceil(REST * 60), flight = [], disc = [], glint = [];
    c.path = [];
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * REST, p = pose(c, u, v);
      const fx = Math.cos((p.ry * Math.PI) / 180);
      c.path.push(p);
      flight.push({ opacity: Number(p.op.toFixed(3)), transform: `translate3d(${(p.x - c.rx).toFixed(1)}px, ${(p.y - c.ry).toFixed(1)}px, 0) perspective(900px) rotateY(${p.ry.toFixed(1)}deg) rotateZ(${p.rz.toFixed(2)}deg) scale(${(p.s * p.sx).toFixed(4)}, ${(p.s * p.sy).toFixed(4)})` });
      disc.push({ opacity: Number(Math.max(0, Math.min(1, fx * 4)).toFixed(2)) }); // the back of a card has no number
      glint.push({ opacity: u >= LAND ? 0 : Number((0.75 * Math.pow(1 - Math.abs(fx), 2)).toFixed(3)) }); // light catches it edge-on
    }
    const timing = { duration: REST * 1000, delay: c.delay * 1000, fill: 'both', easing: 'linear' };
    c.anim = c.clone.animate(flight, timing);
    c.extras = [c.disc?.animate(disc, timing), c.sheen.animate(glint, timing)].filter(Boolean);
  }

  function vortexOf(wrap, nodes) {
    const wr = wrap.getBoundingClientRect();
    const x0 = Math.max(wr.left, 0), x1 = Math.min(wr.right, innerWidth);
    let y = 0, n = 0;
    nodes.forEach(node => { const r = node.getBoundingClientRect(); y += r.top + node._ry; n++; });
    return { x: (x0 + x1) / 2, y: n ? y / n : wr.top + wr.height / 2, R: Math.min(210, Math.max(90, (x1 - x0) * 0.28)) };
  }

  function play(page, leaving = [], key = null, { quiet = false } = {}) {
    const wrap = page?.querySelector('.flow-wrap');
    const nodes = wrap ? [...wrap.querySelectorAll('.flow .node')] : [];
    // Seen before, or a quiet arrival (the studio opening on this page, a key press, an address change): no flight and no
    // dust, the cards just pop up in place. A quiet arrival does not count as the visit, so the first click still flies.
    if (wrap && (quiet || (key != null && seen.has(key)))) {
      ensure(); finish(false); wrap.classList.add('morph-seen'); return;
    }
    if (!wrap || !nodes.length || reduce()) { finish(false); dissolve(leaving, null); return; }
    ensure(); finish(false); // cards still in the air were already captured as dust
    const wr = wrap.getBoundingClientRect();
    if (wr.bottom < 0 || wr.top > innerHeight) { dissolve(leaving, null); return; }
    if (key != null) seen.add(key);
    dark = darkGround();

    // The row may be on its way to the step in hand: go straight there, so that every target below is final.
    const active = wrap.querySelector('.flow .node.is-active');
    if (active && wrap.scrollWidth > wrap.clientWidth) wrap.scrollTo({ left: active.offsetLeft - wrap.clientWidth / 2 + active.offsetWidth / 2, behavior: 'instant' });

    wrap.classList.add('is-morphing'); // first: it turns off the cards' own entrance, which would throw the measurements below
    nodes.forEach(node => { const ring = node.querySelector('.ring'); node._rx = ring.offsetLeft + ring.offsetWidth / 2; node._ry = ring.offsetTop + ring.offsetHeight / 2; node._rh = ring.offsetHeight; });
    const v = vortexOf(wrap, nodes);
    dissolve(leaving, v);
    if (!leaving.length) { // first arrival: a little dust drifts in from the sides to feed the vortex
      for (let k = 0; k < DUST.feed; k++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        spawn({ x: v.x + side * (v.R * 1.6 + Math.random() * 220), y: v.y + (Math.random() - 0.5) * 220, vx: 0, vy: 0, age: -Math.random() * 0.2, life: 0.7 + Math.random() * 0.4,
          r: 0.8 + Math.random() * 1.5, c: colourOf(nodes[k % nodes.length]), tx: v.x, ty: v.y, seek: true, sw: side * (0.9 + Math.random()) });
      }
    }

    // The layer sits on the page rather than on the screen, so the cards stay over their places if the page is scrolled.
    layer.style.top = `${window.scrollY}px`; layer.style.height = `${innerHeight}px`;
    const rects = nodes.map(node => node.getBoundingClientRect());
    const cards = nodes.map((node, i) => {
      const clone = node.cloneNode(true);
      clone.removeAttribute('data-go'); clone.removeAttribute('id'); clone.tabIndex = -1; clone.disabled = true;
      clone.querySelectorAll('[id],[data-chip]').forEach(e => { e.removeAttribute('id'); e.removeAttribute('data-chip'); });
      clone.classList.remove('morph-wait', 'morph-name', 'morph-snap'); clone.classList.add('morph-card');
      clone.style.width = `${node.offsetWidth}px`;
      clone.style.transformOrigin = `${node._rx}px ${node._ry}px`;
      clone.style.zIndex = 100 + i;
      const ring = clone.querySelector('.ring');
      const sheen = document.createElement('i'); sheen.className = 'morph-sheen'; ring.appendChild(sheen);
      layer.appendChild(clone);
      node.classList.add('morph-wait', 'morph-name');
      const c = { node, clone, ring, sheen, disc: clone.querySelector('.disc'), c: colourOf(node), i, dir: i % 2 ? -1 : 1,
        th0: (i / nodes.length) * TAU + Math.random() * 0.3, delay: i * T.stagger, lift: node._rh * (0.6 + (i % 3) * 0.12),
        rx: node._rx, ry: node._ry, rh: node._rh, tx: rects[i].left + node._rx, ty: rects[i].top + node._ry,
        landed: false, rested: false, done: false };
      launch(c, v);
      return c;
    });
    // A swipe along the row during the flight means the person is already using it: the cards are there at once.
    const x0 = wrap.scrollLeft;
    const onScroll = () => { if (Math.abs(wrap.scrollLeft - x0) > 8) finish(false); };
    wrap.addEventListener('scroll', onScroll, { passive: true });
    run = { wrap, nodes, cards, onScroll };
    kick();
  }

  // The flight itself needs nothing from here. This only reads each card's clock for what goes with it: the dust trail,
  // the landing (dust, sound, a small tick), the card's name appearing, and at the end the hand-over to the real cards.
  function stepCards() {
    const R = run;
    if (!R.wrap.isConnected || R.wrap.closest('.is-leaving')) { finish(false, true); return; }
    let alive = 0, resting = 0;
    for (const c of R.cards) {
      if (c.done) continue; alive++;
      const u = clock(c);
      if (u < 0) continue;
      if (u < LAND) {
        if (Math.random() < (u < T.spin ? DUST.trail : DUST.trail * 2)) {
          const p = c.path[Math.min(c.path.length - 1, Math.round((u / REST) * (c.path.length - 1)))];
          spawn({ x: p.x + (Math.random() - 0.5) * 30, y: p.y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, age: 0, life: 0.45, r: 0.7 + Math.random() * 1.4, c: c.c, seek: false });
        }
        continue;
      }
      if (!c.landed) { c.landed = true; burst(c.tx, c.ty + c.rh / 2, c.c, c.rh * 0.75); M()?.haptic?.(5); if (typeof SOUND !== 'undefined') SOUND.land(); }
      if (u >= REST - 0.002) { resting++; if (!c.rested) { c.rested = true; c.node.classList.remove('morph-name'); } }
    }
    // Every card is down and nothing is moving: the real cards appear under their copies, still and fully drawn before the
    // copies fade, so the swap cannot be seen and whatever it costs falls where no one is watching.
    if (!R.handed && resting === R.cards.length) {
      R.handed = true;
      R.cards.forEach(c => {
        c.node.classList.add('morph-snap'); c.node.classList.remove('morph-wait');
        const fade = c.clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.fade * 1000, easing: 'ease-out', fill: 'forwards' });
        fade.onfinish = () => { c.clone.remove(); c.done = true; };
        c.fade = fade;
      });
      requestAnimationFrame(() => requestAnimationFrame(() => R.nodes.forEach(n => n.classList.remove('morph-snap'))));
    }
    if (!alive) { endRun(R); run = null; }
  }
  function endRun(R) {
    R.wrap.removeEventListener('scroll', R.onScroll);
    R.wrap.classList.add('morph-done'); // first, so that the cards' own entrance does not restart
    R.wrap.classList.remove('is-morphing');
  }

  // End the current flight. withDust: the cards in the air break into dust (a new tab was picked mid-flight).
  function finish(instant, withDust = false) {
    if (!run) return;
    const R = run; run = null;
    R.cards.forEach(c => {
      if (!c.done && withDust && !instant && started(c)) {
        const r = c.ring.getBoundingClientRect(); if (r.width > 6) dustFrom({ x: r.left, y: r.top, w: r.width, h: r.height, c: c.c }, Math.round(DUST.air), null);
      }
      if (c.fade) c.fade.onfinish = null;
      c.clone.remove(); c.node.classList.remove('morph-wait', 'morph-name', 'morph-snap');
    });
    endRun(R);
    if (instant) { parts.length = 0; ripples.length = 0; ctx?.clearRect(0, 0, cv.width, cv.height); }
  }

  /* ── loop ─────────────────────────────────────────── */
  // One loop only: dust spawned during a frame must not start a second loop.
  let inFrame = false;
  function kick() { if (!raf && !inFrame) { last = 0; raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; inFrame = true;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
    if (reduce()) { inFrame = false; finish(true); return; }
    if (run) stepCards();
    draw(dt);
    inFrame = false;
    if (run || parts.length || ripples.length) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  }
  // A small ready-made round dot per colour: stamping these is far cheaper for a phone's GPU than drawing arcs.
  function dotOf(c) {
    let d = dots.get(c);
    if (!d) {
      d = document.createElement('canvas'); d.width = d.height = 16;
      const g = d.getContext('2d'); g.fillStyle = c; g.beginPath(); g.arc(8, 8, 7.5, 0, TAU); g.fill();
      dots.set(c, d);
    }
    return d;
  }
  function draw(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt;
      if (p.age < 0) continue;
      if (p.age > p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      if (p.seek) {
        const dx = p.tx - p.x, dy = p.ty - p.y;
        p.vx += (dx * 3.4 - dy * p.sw * 2.6) * dt; p.vy += (dy * 3.4 + dx * p.sw * 2.6) * dt;
        const drag = Math.pow(0.18, dt); p.vx *= drag; p.vy *= drag;
      } else { const drag = Math.pow(0.22, dt); p.vx *= drag; p.vy = p.vy * drag - 14 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const a = Math.min(1, p.age / 0.08) * (1 - p.age / p.life);
      ctx.globalAlpha = (dark ? 0.9 : 0.75) * a;
      ctx.drawImage(dotOf(p.c), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]; r.age += dt;
      if (r.age > r.life) { ripples.splice(i, 1); continue; }
      const k = r.age / r.life, e = 1 - Math.pow(1 - k, 3), rx = r.w * (0.5 + 0.9 * e);
      ctx.globalAlpha = (1 - k) * (dark ? 0.7 : 0.5);
      ctx.strokeStyle = r.c; ctx.lineWidth = 2 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.ellipse(r.x, r.y + 4, rx, rx * 0.16, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  return { capture, play, dissolve, finish: () => finish(true), stageAfter: STAGE_AFTER, get busy() { return Boolean(run); } };
})();
