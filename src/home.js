// Home and the living hive. Shared by the User and Developer levels.
// Home is the journey, told as one long camera move through a fruit bunch drawn in light, from B5 to the B30 decision,
// with the MPOB and UKM marks on its last screen. Every other page has a swarm of glowing particles (fog, honeycomb,
// depth) as its moving background, a vortex in the colour of the step on show, and the swarm writes the step in hand
// ("Set diesel price") in a band under the objective; a new step scatters the words and it writes the next ones.
// One requestAnimationFrame loop for the swarm; it rests when the tab is hidden or the journey fills the screen, and
// becomes a still picture under Reduce motion. Pause sits in the top bar. Everything is drawn in code.

const HOME = (() => {
  const M = () => (typeof MOTION === 'undefined' ? null : MOTION);
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Variable Display", "Segoe UI", Roboto, Arial, sans-serif';

  /* ── Page ── */
  // Sponsor marks, kept small: the build embeds brand/mpob.* and brand/ukm.* when present; otherwise quiet wordmarks.
  function sponsors() {
    let logos = {};
    try { logos = JSON.parse(document.getElementById('brand-logos')?.textContent || '{}'); } catch {}
    const mark = (key, short, name) => logos[key]
      ? `<img src="${logos[key]}" alt="${name}" class="sp-${key}">`
      : `<span class="sp-word" title="${name}"><b>${short}</b><small>${name}</small></span>`;
    return `<div class="hive-sponsors"><span class="sp-k">Supported by</span><span class="sp-marks">${mark('mpob', 'MPOB', 'Malaysian Palm Oil Board')}<i aria-hidden="true"></i>${mark('ukm', 'UKM', 'Universiti Kebangsaan Malaysia')}</span></div>`;
  }
  /* ── The journey, as one long camera move through an oil palm fruit bunch drawn in light ── */
  // A tall section whose stage stays pinned while you scroll. It opens through a drop-shaped keyhole onto the bunch,
  // swaying once in a night field as first light creeps along the horizon. Then the bunch turns and lets its fruit go
  // (B5, B7 and B10 fly off with them), rings gather where the core was (B20: a fifth of the ring is palm gold), a flower
  // opens there (B30 and its three checks), its petals scatter (the fund), and an iris gathers in the dark, watching the
  // four inputs, under the invitation to make the next call. Six screens of copy take their turns over the same stretch.
  // Scroll drives everything, so scrolling back plays it backwards; the pointer is a breeze. The words and buttons are real.
  const CHAPTERS = [
    { n: '01', short: 'Palm', side: 'l', k: 'Where it starts', h: 'Grow first. Blend later.',
      p: 'Malaysia has blended palm biodiesel into its diesel since 2011. Scroll to follow the oil from the fruit to the pump.', links: [['Start with the palm oil price', 'obj1', 1]] },
    { n: '02', short: 'B5 to B10', side: 'r', k: '2011 to 2019', h: 'Five, seven, ten.',
      p: 'B5 came in 2011, B7 in 2014 and B10 in 2019. Each step put more palm biodiesel into every litre.', links: [] },
    { n: '03', short: 'B20', side: 'l', k: 'From 2020, phased', h: 'Twenty, today.',
      p: 'B20 began in 2020 and was rolled out in phases, by region and sector. In a B20 litre, one fifth is palm biodiesel.', links: [['See today’s decision', 'decision', 3]] },
    { n: '04', short: 'Three checks', side: 'r', k: 'The rule for B30', h: 'Three checks before thirty.',
      p: 'B30 starts only when biodiesel is cheaper than diesel, the fund is above its safety limit and the government has approved it.', links: [['Price gap', 'obj4', 0], ['Fund', 'obj4', 1], ['Approval', 'obj4', 2]] },
    { n: '05', short: 'Fund', side: 'l', k: 'Biodiesel Stabilisation Fund', h: 'A fund for the hard months.',
      p: 'When biodiesel costs more than diesel, the fund pays the gap. When it costs less, the savings go back in.', links: [['Test the fund against shocks', 'obj2', 0]] },
    { n: '06', short: 'Decide', side: 'l', k: 'Your turn', h: 'Make the next call.',
      p: 'Set the prices and the fund, and see whether the blend stays at B20 or can move to B30.', links: [['Decide now', 'decision', 0, true], ['Start with Objective 1', 'obj1', 0]] },
  ];
  function storyHtml() {
    const links = c => c.links.length ? `<div class="ss-links">${c.links.map(([t, tab, step, primary]) =>
      `<button type="button" class="${primary ? 'is-primary' : ''}" data-tab="${tab}" data-step="${step}">${esc(t)}<span aria-hidden="true">→</span></button>`).join('')}</div>` : '';
    return `<section class="story" data-story aria-labelledby="story-h">
        <div class="story-stage">
          <canvas class="story-canvas" aria-hidden="true"></canvas>
          <div class="story-top"><span id="story-h">Malaysia’s biodiesel journey</span><span class="st-right"><span class="st-count"><b data-story-n>01</b> / ${String(CHAPTERS.length).padStart(2, '0')}</span>
            <button type="button" class="st-play" data-story-play aria-pressed="false"><svg viewBox="0 0 12 12" aria-hidden="true"><path class="i-play" d="M3 1.5v9l7.5-4.5z"/><path class="i-pause" d="M2.5 1.5h2.6v9H2.5zM6.9 1.5h2.6v9H6.9z"/></svg><span>Play</span></button></span></div>
          <ol class="story-rail" aria-label="Chapters">${CHAPTERS.map((c, i) => `<li><button type="button" data-story-go="${i}" aria-label="Chapter ${c.n}: ${esc(c.short)}"><i></i><span>${esc(c.short)}</span></button></li>`).join('')}</ol>
          ${CHAPTERS.map((c, i) => `<article class="ss ss-${c.side}" data-ss="${i}">
            <p class="ss-k"><span>${c.n}</span>${esc(c.k)}</p>
            <h3 class="ss-h"><span class="ss-script">${esc(c.h[0])}</span>${esc(c.h.slice(1))}</h3>
            <p class="ss-p">${esc(c.p)}</p>${links(c)}${i === CHAPTERS.length - 1 ? sponsors() : ''}</article>`).join('')}
          <div class="story-hint" aria-hidden="true"><span>Scroll</span><i></i></div>
        </div>
      </section>`;
  }
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const keys = (pts, x) => { // smooth piecewise curve through [x, y] keys
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], t = (x - x0) / (x1 - x0); return y0 + (y1 - y0) * t * t * (3 - 2 * t); }
    return pts.at(-1)[1];
  };
  const seeded = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // 0 gold · 1 orange · 2 ember · 3 deep red · 4 teal · 5 ice · 6 white · 7 green
  const PAL = [[255, 212, 120], [255, 150, 60], [240, 92, 40], [176, 44, 30], [96, 222, 206], [146, 200, 255], [236, 244, 255], [130, 214, 112]];
  const RINGS = [{ R: 1.32, tx: 0, tz: 0, w: 0.07 }, { R: 1.02, tx: 1.15, tz: 0.5, w: -0.34 }, { R: 0.74, tx: -0.95, tz: 1.25, w: 0.5 }];
  const EDGE = [0.37, 0.53, 0.71, 0.87], HALF = 0.05; // bunch → rings → flower → scattered petals → iris
  const camYaw = p => 6.2832 * sstep(0.06, 0.88, p); // one full turn, ending face-on to the iris
  const camPitch = p => keys([[0, 0.1], [0.3, 0.22], [0.44, 0.3], [0.6, 0.42], [0.76, 0.26], [0.9, 0], [1, 0]], p);
  const DIST = {
    wide: [[0, 7.2], [0.14, 6.2], [0.32, 5.6], [0.44, 4.6], [0.6, 5.4], [0.76, 6.6], [0.9, 5.1], [1, 5.0]],
    narrow: [[0, 7.2], [0.14, 6.4], [0.32, 6.0], [0.44, 5.4], [0.6, 6.4], [0.76, 7.2], [0.9, 5.6], [1, 5.4]],
  };
  function dropPath(g, x, y, s) { // a palm-oil drop, s = half its height
    g.beginPath(); g.moveTo(x, y - s);
    g.bezierCurveTo(x + s * 0.2, y - s * 0.55, x + s * 0.6, y - s * 0.12, x + s * 0.6, y + s * 0.34);
    g.arc(x, y + s * 0.34, s * 0.6, 0, Math.PI);
    g.bezierCurveTo(x - s * 0.6, y - s * 0.12, x - s * 0.2, y - s * 0.55, x, y - s); g.closePath();
  }

  function storyField(section, frozen) {
    const stage = section.querySelector('.story-stage'), cv = section.querySelector('canvas'), g = cv.getContext('2d');
    const screens = [...section.querySelectorAll('[data-ss]')], rail = [...section.querySelectorAll('[data-story-go]')];
    const numEl = section.querySelector('[data-story-n]'), hint = section.querySelector('.story-hint'), playBtn = section.querySelector('[data-story-play]');
    const NC = CHAPTERS.length, still = () => Boolean(M()?.reduce);
    let W = 0, H = 0, dpr = 1, wide = true, U = 100, P = [], reads = [], sprites = [], barH = 60;
    let raf = 0, last = 0, visible = false, time = 0, frames = 0, chapter = -1, covers = false, isStill = null;
    let q = 0, qRaw = 0, qs = 0, qv = 0, keyOpen = 0, primed = false; // scroll progress, the camera's smoothed copy, its velocity
    let copyBox = null; // the screen of copy on show, so readings keep clear of it
    const view = { cx: 0, cy: 0 }, cam = {}, A = [0, 0, 0], B = [0, 0, 0], S = [0, 0, 0];
    const wind = { x: -1e4, y: -1e4, on: 0, to: 0, nx: 0, ny: 0, sx: 0, sy: 0 };

    function makeSprites() {
      sprites = PAL.map(([r, gg, b]) => {
        const c = document.createElement('canvas'); c.width = c.height = 48; const x = c.getContext('2d');
        const gr = x.createRadialGradient(24, 24, 0, 24, 24, 24), hi = v => Math.min(255, v + 70);
        gr.addColorStop(0, `rgba(${hi(r)},${hi(gg)},${hi(b)},1)`); gr.addColorStop(0.16, `rgba(${r},${gg},${b},.92)`);
        gr.addColorStop(0.42, `rgba(${r},${gg},${b},.2)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        x.fillStyle = gr; x.fillRect(0, 0, 48, 48); return c;
      });
    }
    // From the camera's view at progress p back to the world: the rings are framed for the camera as it stands when they
    // form, so the B20 ring faces the viewer, and the history readings fly toward the side away from the words.
    function toCamFrame(x, y, z, out, p = 0.44) {
      const yw = camYaw(p), pt = camPitch(p), cy = Math.cos(yw), sy = Math.sin(yw), cp = Math.cos(pt), sp = Math.sin(pt);
      const y0 = cp * y + sp * z, z1 = -sp * y + cp * z;
      out[0] = cy * x + sy * z1; out[1] = y0; out[2] = -sy * x + cy * z1;
    }
    function build() {
      const rnd = seeded(2011), n = wide ? 2600 : 1500;
      const nStar = Math.round(n * 0.15), nGround = Math.round(n * 0.12), nMain = n - nStar - nGround, per = 6, nFruit = Math.ceil(nMain / per);
      P = [];
      // Fruitlets on an ovoid bunch, each a small cluster of points that flies off together when it is let go.
      for (let f = 0; f < nFruit; f++) {
        const t = (f + 0.5) / nFruit, phi = Math.acos(1 - 2 * t), th = f * 2.39996, yy = Math.cos(phi), rr = Math.sin(phi) * (1 - 0.16 * yy);
        const fx = rr * Math.cos(th) * 0.84, fy = yy, fz = rr * Math.sin(th) * 0.84;
        const rel = rnd() < 0.58, relP = 0.13 + rnd() * 0.19, ripe = rnd();
        const ux = fx, uy = fy * 0.6 + 0.45, uz = fz, ul = Math.hypot(ux, uy, uz) || 1, far = 7 + rnd() * 7;
        const fcol = yy > 0.7 ? 3 : ripe < 0.42 ? 1 : ripe < 0.74 ? 2 : ripe < 0.9 ? 3 : 0;
        for (let k = 0; k < per && P.length < nMain; k++) {
          const hx = rnd() * 2 - 1, hy = rnd() * 2 - 1, hz = rnd() * 2 - 1, hl = Math.hypot(hx, hy, hz) || 1, fr = rnd();
          P.push({ role: 2, rel, relP: relP + rnd() * 0.012, st: rnd(), fcol, size: 1 + rnd() * 1.1, tw: rnd() * 6.283, arc: 0.15 + rnd() * 0.45,
            bx: fx * (0.97 + rnd() * 0.06) + (rnd() - 0.5) * 0.06, by: fy * (0.97 + rnd() * 0.06) + (rnd() - 0.5) * 0.06, bz: fz * (0.97 + rnd() * 0.06) + (rnd() - 0.5) * 0.06,
            far: [ux / ul * far + (rnd() - 0.5) * 1.2, uy / ul * far + (rnd() - 0.5) * 1.2, uz / ul * far + (rnd() - 0.5) * 1.2], swirl: (rnd() - 0.5) * 1.6,
            hx: hx / hl, hy: hy / hl, hz: hz / hl, // a direction, for the small spheres (ring core, flower heart)
            ri: rnd() < 0.5 ? 0 : rnd() < 0.6 ? 1 : 2, ra: rnd() * 6.283, rj: (rnd() - 0.5) * 0.06, core: rnd() < 0.07,
            fp: fr < 0.12 ? 0 : fr < 0.22 ? 1 : 2, pk: Math.floor(rnd() * 6), ps: rnd() ** 0.85, pw: rnd() < 0.62 ? (rnd() < 0.5 ? -1 : 1) : rnd() * 2 - 1,
            ia: Math.floor(rnd() * 140) / 140 * 6.283 + (rnd() - 0.5) * 0.02, iu: rnd() ** 0.9, iw: rnd() * 6.283, spark: rnd() < 0.05 });
        }
      }
      for (let i = 0; i < nStar; i++) {
        const u = rnd() * 2 - 1, a = rnd() * 6.283, r = 9 + rnd() * 9, s = Math.sqrt(1 - u * u);
        P.push({ role: 0, x: Math.cos(a) * s * r, y: u * r * 0.7 + 1.5, z: Math.sin(a) * s * r, size: 0.5 + rnd() * 1.1, tw: rnd() * 6.283, tws: 0.5 + rnd() * 1.6, c: rnd() < 0.75 ? 6 : rnd() < 0.5 ? 5 : 0 });
      }
      for (let i = 0; i < nGround; i++) P.push({ role: 1, x: (rnd() - 0.5) * 24, y: -2.3 + (rnd() - 0.5) * 0.08, z: (rnd() - 0.5) * 24, size: 0.5 + rnd() * 0.8, tw: rnd() * 6.283 });
      // Readings ride on particular particles, so they fly off with the fruit and the petals.
      reads = [];
      const anchor = (test, set, text, win, long = false) => { const o = P.find(v => v.role === 2 && !v.anchor && test(v)); if (!o) return; o.anchor = true; set(o); reads.push({ o, text, win, long }); };
      const toward = (o, x, y, at) => { const f = [0, 0, 0]; toCamFrame(x, y, 0, f, at); o.far = f; o.swirl = 0; };
      anchor(o => o.rel && o.by > 0.2, o => { o.relP = 0.15; toward(o, -2.3, 0.9, 0.23); }, 'B5 · 2011', [0.15, 0.17, 0.27, 0.31]);
      anchor(o => o.rel && Math.abs(o.by) < 0.3, o => { o.relP = 0.2; toward(o, -2.5, -0.5, 0.28); }, 'B7 · 2014', [0.2, 0.22, 0.31, 0.35]);
      anchor(o => o.rel && o.by < -0.2, o => { o.relP = 0.25; toward(o, -1.2, -1.6, 0.33); }, 'B10 · 2019', [0.25, 0.27, 0.34, 0.38]);
      anchor(o => !o.rel, o => { o.ri = 0; o.ra = 0.03; o.core = false; }, 'B20 · 20% palm biodiesel', [0.44, 0.46, 0.5, 0.53]);
      anchor(o => !o.rel, o => { o.ri = 0; o.ra = 3.9; o.core = false; }, '80% diesel', [0.4, 0.43, 0.5, 0.53]);
      anchor(o => !o.rel, o => { o.fp = 1; o.hx = 0; o.hy = 1; o.hz = 0; }, 'B30 · 30% palm', [0.57, 0.61, 0.68, 0.72]);
      [['1 · Cheaper than diesel?', 0], ['2 · Fund above its limit?', 2], ['3 · Government approval?', 4]].forEach(([t, k]) =>
        anchor(o => !o.rel, o => { o.fp = 2; o.pk = k; o.ps = 1; o.pw = 0; }, t, [0.58, 0.62, 0.68, 0.71], true));
      [['Biodiesel dearer: the fund pays', 1], ['Biodiesel cheaper: savings go in', 3]].forEach(([t, k]) =>
        anchor(o => !o.rel, o => { o.fp = 2; o.pk = k; o.ps = 1; o.pw = 0; }, t, [0.72, 0.75, 0.83, 0.86], true));
      ['Palm oil price', 'Diesel price', 'Fund balance', 'B30 approval'].forEach((t, j) =>
        anchor(() => true, o => { o.ia = 0.785 + j * 1.571; o.iu = 1; }, t, [0.89, 0.93, 2, 3]));
      // Colours by keyframe: bunch, rings, flower, scattered petals, iris (released fruit become stars until the iris).
      for (const o of P) {
        if (o.role !== 2) continue;
        const ring = o.core ? 6 : o.ri === 0 ? (o.ra < 1.2566 ? 0 : 5) : o.ri === 1 ? 4 : 6;
        const flower = o.fp === 0 ? 7 : o.fp === 1 ? 6 : o.ps < 0.25 ? 2 : Math.abs(o.pw) === 1 ? 0 : 1;
        const iris = o.iu < 0.07 ? 0 : o.spark ? 6 : o.iu < 0.45 ? 4 : 5;
        o.cols = [o.fcol, ring, flower, flower, iris]; o.star = o.tw > 1.6 ? 6 : 5;
      }
    }

    // Keyframe positions in the world (bunch at the origin, about one unit across).
    function bunchPos(o, out) { const b = 1 + 0.015 * Math.sin(time * 1.3 + o.tw); out[0] = o.bx * b; out[1] = o.by * b; out[2] = o.bz * b; }
    function flyPos(o, p, out) {
      bunchPos(o, out);
      const t = clamp01((p - o.relP) / 0.2); if (t <= 0) return 0;
      const e = 1 - (1 - t) ** 3, [fx, fy, fz] = o.far;
      const x = out[0] + (fx - out[0]) * e, y = out[1] + (fy - out[1]) * e + Math.sin(Math.PI * t) * 0.8, z = out[2] + (fz - out[2]) * e;
      const c = Math.cos(o.swirl * e), s = Math.sin(o.swirl * e);
      out[0] = x * c - z * s + Math.sin(time * 0.3 + o.tw) * 0.25 * e; out[1] = y + Math.cos(time * 0.25 + o.tw) * 0.2 * e; out[2] = x * s + z * c;
      return t;
    }
    function ringPos(o, out) {
      if (o.core) { out[0] = o.hx * 0.16; out[1] = o.hy * 0.16; out[2] = o.hz * 0.16; return; }
      const R = RINGS[o.ri], a = o.ra + time * R.w, r = R.R + o.rj;
      let x = Math.cos(a) * r, y = Math.sin(a) * r, z = (o.st - 0.5) * 0.03;
      if (o.ri) { // the other two rings are tilted, a gyroscope around the blend ring
        const y1 = y * Math.cos(R.tx) - z * Math.sin(R.tx); z = y * Math.sin(R.tx) + z * Math.cos(R.tx); y = y1;
        const x1 = x * Math.cos(R.tz) - y * Math.sin(R.tz); y = x * Math.sin(R.tz) + y * Math.cos(R.tz); x = x1;
      }
      toCamFrame(x, y, z, out);
    }
    function flowerPos(o, open, out) {
      if (o.fp === 0) { const s = o.ps; out[0] = 0.1 * Math.sin(s * 2.4) + (o.st - 0.5) * 0.03; out[1] = -0.12 - 3 * s; out[2] = (o.tw / 6.283 - 0.5) * 0.03; return; }
      if (o.fp === 1) { const r = o.anchor ? 0 : 0.17 * (0.6 + 0.4 * open); out[0] = o.hx * r; out[1] = 0.04 + o.hy * r * 0.8; out[2] = o.hz * r; return; }
      const phi = o.pk / 6 * 6.283 + 0.26, s = o.ps;
      const a = mix(0.16, 1.05, open) + s * mix(0.05, 0.55, open); // petals curl outward toward the tip as they open
      const L = 1.3 * s, rad = Math.sin(a) * L, hgt = Math.cos(a) * L * mix(1, 0.75, open);
      const wv = 0.4 * Math.sin(Math.PI * s ** 0.75) * o.pw * mix(0.55, 1, open), c = Math.cos(phi), sn = Math.sin(phi);
      out[0] = c * rad - sn * wv; out[1] = 0.02 + hgt; out[2] = sn * rad + c * wv;
    }
    function scatterPos(o, p, out) {
      flowerPos(o, 1, out);
      const u = sstep(0.66, 0.86, p);
      if (o.fp === 2) {
        const phi = o.pk / 6 * 6.283 + 0.26, d = (0.6 + 2.1 * u) * (0.75 + 0.08 * ((o.pk * 37) % 7));
        out[0] += Math.cos(phi) * d; out[1] += 0.12 * d - 1.3 * u * u; out[2] += Math.sin(phi) * d;
      } else if (o.fp === 0) out[1] -= 1.8 * u;
      else { const d = 0.4 + 1.2 * u; out[0] += o.hx * d; out[1] += o.hy * d; out[2] += o.hz * d; }
    }
    function irisPos(o, out) {
      const a = o.ia + time * 0.025 + 0.035 * Math.sin(o.iu * 10 + o.iw), r = 0.34 + 1.06 * o.iu;
      out[0] = Math.cos(a) * r; out[1] = Math.sin(a) * r; out[2] = -0.12 * (1 - o.iu) + (o.st - 0.5) * 0.04;
    }
    function kf(o, k, p, out) {
      if (k === 4) return irisPos(o, out);
      if (o.rel) return flyPos(o, p, out);
      if (k === 0) return bunchPos(o, out);
      if (k === 1) return ringPos(o, out);
      if (k === 2) return flowerPos(o, sstep(0.55, 0.67, p), out);
      return scatterPos(o, p, out);
    }
    function stageOf(o, p) { // [keyframe, progress to the next one]; each particle changes a moment apart from its neighbours
      for (let e = 0; e < 4; e++) { const c = EDGE[e] + (o.st - 0.5) * 0.05; if (p < c - HALF) return [e, 0]; if (p < c + HALF) return [e, (p - c + HALF) / (2 * HALF)]; }
      return [4, 0];
    }
    function camera(p) {
      cam.yaw = camYaw(p) + wind.sx * 0.12 + 0.04 * Math.sin(time * 0.2);
      cam.pitch = camPitch(p) + wind.sy * 0.07;
      const roll = (p > 0 && p < 0.14 ? 0.14 * Math.sin(6.2832 * p / 0.14) : 0) + 0.015 * Math.sin(time * 0.5); // the bunch sways once
      cam.dist = keys(wide ? DIST.wide : DIST.narrow, p); cam.ty = keys(wide ? [[0, 0], [0.5, 0], [0.62, -0.15], [0.76, -0.3], [0.88, 0], [1, 0]] : [[0, 0], [0.5, 0], [0.62, 0.45], [0.76, 0.1], [0.88, 0], [1, 0]], p);
      cam.cy = Math.cos(cam.yaw); cam.sy = Math.sin(cam.yaw); cam.cp = Math.cos(cam.pitch); cam.sp = Math.sin(cam.pitch); cam.cr = Math.cos(roll); cam.sr = Math.sin(roll);
      cam.F = U * 6;
      // The scene leans away from the words: right of centre when the copy is on the left, and the other way round.
      const side = keys(CHAPTERS.map((c, i) => [(i + 0.5) / NC, c.side === 'l' ? 1 : -1]), p);
      view.cx = wide ? W / 2 + side * W * 0.17 : W / 2; view.cy = wide ? H * 0.53 : (barH + 64 + H * 0.64) / 2;
    }
    function project(x, y, z, out) {
      y -= cam.ty;
      const x1 = x * cam.cy - z * cam.sy, z1 = x * cam.sy + z * cam.cy, y2 = y * cam.cp - z1 * cam.sp, z2 = y * cam.sp + z1 * cam.cp;
      const d = z2 + cam.dist; if (d < 0.3) return false;
      const k = cam.F / d; out[0] = view.cx + (x1 * cam.cr - y2 * cam.sr) * k; out[1] = view.cy - (x1 * cam.sr + y2 * cam.cr) * k; out[2] = 6 / d;
      return true;
    }
    function dot(x, y, r, c, a) {
      if (a < 0.01 || x < -40 || y < -40 || x > W + 40 || y > H + 40) return;
      g.globalAlpha = a > 1 ? 1 : a; const s = r * 3.2; g.drawImage(sprites[c], x - s, y - s, s * 2, s * 2);
    }
    function draw() {
      const p = Math.max(-0.3, Math.min(1, qs));
      camera(p);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#01050a'); bg.addColorStop(0.55, '#04131b'); bg.addColorStop(1, '#01050a');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const warm = keys([[0, 1], [0.3, 0.8], [0.44, 0.45], [0.6, 1], [0.76, 0.7], [0.9, 0.3], [1, 0.3]], p), R0 = Math.max(W, H) * 0.62;
      const neb = g.createRadialGradient(view.cx, view.cy, 0, view.cx, view.cy, R0);
      neb.addColorStop(0, `rgba(245,170,60,${(0.13 * warm).toFixed(3)})`); neb.addColorStop(0.35, 'rgba(30,130,150,.1)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = neb; g.fillRect(0, 0, W, H);
      // First light creeps along the horizon of the night field, then fades as the camera lifts.
      const dawn = 1 - sstep(0.4, 0.58, p), front = sstep(-0.12, 0.42, p);
      if (dawn > 0.01) {
        const hy = view.cy + cam.F * Math.tan(cam.pitch), fx = W * (0.04 + 0.96 * front);
        g.save(); g.translate(fx * 0.5, hy - 6); g.scale(Math.max(40, fx * 0.62) / 60, 1);
        const band = g.createRadialGradient(0, 0, 0, 0, 0, 60);
        band.addColorStop(0, `rgba(245,170,60,${(0.2 * dawn).toFixed(3)})`); band.addColorStop(1, 'rgba(245,170,60,0)');
        g.fillStyle = band; g.fillRect(-60, -60, 120, 120); g.restore();
        const hot = g.createRadialGradient(fx, hy, 0, fx, hy, 180); hot.addColorStop(0, `rgba(255,214,130,${(0.34 * dawn).toFixed(3)})`); hot.addColorStop(1, 'rgba(255,214,130,0)');
        g.fillStyle = hot; g.fillRect(fx - 180, hy - 180, 360, 360);
        const line = g.createLinearGradient(0, 0, fx + 60, 0); line.addColorStop(0, 'rgba(255,224,160,0)');
        line.addColorStop(0.8, `rgba(255,224,160,${(0.55 * dawn).toFixed(3)})`); line.addColorStop(1, 'rgba(255,224,160,0)');
        g.fillStyle = line; g.fillRect(0, hy - 0.5, fx + 60, 1);
      }
      g.globalCompositeOperation = 'lighter';
      const R = wide ? 130 : 90, gust = wind.on, scale = wide ? 1.2 : 1, groundA = 0.26 * (1 - sstep(0.42, 0.6, p));
      const frontX = -12 + 24 * front, fill = 6.2832 * 0.2 * sstep(0.37, 0.46, p); // the B20 ring fills to one fifth
      for (const o of P) {
        let x, y, z, c, c2 = -1, mixT = 0, a, size = o.size;
        if (o.role === 0) { x = o.x; y = o.y; z = o.z; c = o.c; a = 0.3 + 0.6 * Math.sin(time * o.tws + o.tw) ** 2; }
        else if (o.role === 1) {
          if (groundA < 0.01) continue;
          x = o.x; y = o.y; z = o.z; const lit = Math.abs(x - frontX) < 0.9; c = lit ? 0 : 4; a = groundA * (lit ? 2.6 : 1) * (0.7 + 0.3 * Math.sin(time + o.tw));
        } else {
          const [k, t] = stageOf(o, p);
          const ft = kf(o, k, p, A);
          if (t > 0) {
            kf(o, k + 1, p, B); const e = t * t * (3 - 2 * t), lift = Math.sin(Math.PI * t) * o.arc;
            x = A[0] + (B[0] - A[0]) * e; y = A[1] + (B[1] - A[1]) * e; z = A[2] + (B[2] - A[2]) * e;
            const l = Math.hypot(x, y, z) || 1; x += x / l * lift; y += y / l * lift; z += z / l * lift;
          } else { x = A[0]; y = A[1]; z = A[2]; }
          const colAt = kk => (o.rel && kk < 4 ? (ft > 0.4 || kk > 0 ? o.star : o.fcol)
            : kk === 1 && o.ri === 0 && !o.core ? (o.ra < fill ? 0 : 5) : o.cols[kk]);
          c = colAt(k); if (t > 0) { c2 = colAt(k + 1); mixT = t; }
          a = 0.62;
          if (o.rel && k < 4 && ft > 0) { a = 0.62 - 0.3 * ft; size *= 1 - 0.35 * ft; }
          const inScatter = k === 2 ? t : k === 3 ? 1 - t : 0; // how far this particle is into the scattered-petals keyframe
          if (!o.rel && o.fp === 2 && Math.abs(o.pw) < 1) a *= 1 - 0.75 * sstep(0.68, 0.84, p) * inScatter; // petals thin to outlines
          if (!o.rel && o.fp === 0) a *= 1 - sstep(0.7, 0.84, p) * inScatter; // the stem falls away
          size *= 1 - 0.15 * (k === 4 ? 1 : k === 3 ? t : 0);
        }
        if (!project(x, y, z, S)) continue;
        let sx = S[0], sy = S[1];
        if (gust > 0.01) { // the pointer is a breeze
          const dx = sx - wind.x, dy = sy - wind.y, d2 = dx * dx + dy * dy;
          if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) ** 2 * 34 * gust; sx += dx / d * f; sy += dy / d * f; }
        }
        if (o.anchor) { o.sx = sx; o.sy = sy; }
        const r = Math.min(7, (0.55 + size * 0.7) * S[2] * scale), aa = a * Math.min(1.4, 0.55 + S[2] * 0.5);
        if (c2 >= 0 && c2 !== c) { dot(sx, sy, r, c, aa * (1 - mixT)); dot(sx, sy, r, c2, aa * mixT); } else dot(sx, sy, r, c, aa);
      }
      g.globalAlpha = 1;
      // A lens flare at the heart of the scene: the bunch's core, the rings' centre, the flower's heart, the iris's pupil.
      const fl = keys([[-0.2, 1], [0.1, 0.8], [0.3, 0.45], [0.42, 0.95], [0.52, 0.55], [0.64, 0.42], [0.8, 0.15], [0.92, 0.8], [1, 0.85]], p);
      const centre = project(0, 0.02, 0, S) ? S[0] : view.cx;
      if (project(0, 0.02, 0, S)) {
        const fr = (wide ? 70 : 46) * (0.6 + fl), glow = g.createRadialGradient(S[0], S[1], 0, S[0], S[1], fr);
        glow.addColorStop(0, `rgba(255,255,255,${(0.9 * fl).toFixed(3)})`); glow.addColorStop(0.12, `rgba(220,236,255,${(0.45 * fl).toFixed(3)})`); glow.addColorStop(1, 'rgba(160,200,255,0)');
        g.fillStyle = glow; g.fillRect(S[0] - fr, S[1] - fr, fr * 2, fr * 2);
        const sw = W * 0.42 * fl, streak = g.createLinearGradient(S[0] - sw, 0, S[0] + sw, 0);
        streak.addColorStop(0, 'rgba(160,200,255,0)'); streak.addColorStop(0.5, `rgba(235,244,255,${(0.55 * fl).toFixed(3)})`); streak.addColorStop(1, 'rgba(160,200,255,0)');
        g.fillStyle = streak; g.fillRect(S[0] - sw, S[1] - 1, sw * 2, 2);
      }
      g.globalCompositeOperation = 'source-over';
      // Readings: a ring on the particle, a hairline, a label.
      g.font = `600 ${wide ? 11 : 10}px ${FONT}`; g.textBaseline = 'middle'; g.lineWidth = 1;
      if ('letterSpacing' in g) g.letterSpacing = '1.6px';
      const safeTop = barH + 96;
      for (const rd of reads) {
        const [a0, a1, b0, b1] = rd.win, al = sstep(a0, a1, p) * (1 - sstep(b0, b1, p)), o = rd.o;
        if (al < 0.02 || (rd.long && !wide) || o.sx === undefined || o.sx < 0 || o.sx > W || o.sy < safeTop - 10 || o.sy > H - 20) continue;
        const tw = g.measureText(rd.text.toUpperCase()).width + 46;
        let right = o.sx >= centre - 4; if (right && o.sx + tw > W - 12) right = false; if (!right && o.sx - tw < 12) right = true;
        const dy = o.sy - 16 < safeTop ? 16 : -16, ly = o.sy + dy;
        const hits = r => copyBox && ly > copyBox.t - 14 && ly < copyBox.b + 14 && (r ? o.sx + tw > copyBox.l - 12 && o.sx < copyBox.r + 12 : o.sx - tw < copyBox.r + 12 && o.sx > copyBox.l - 12);
        if (hits(right)) { if (hits(!right)) continue; right = !right; }
        const dx = right ? 24 : -24;
        g.globalAlpha = al; g.strokeStyle = 'rgba(255,248,230,.75)';
        g.beginPath(); g.arc(o.sx, o.sy, 3.5, 0, 6.283); g.stroke();
        g.beginPath(); g.moveTo(o.sx + dx / 8, o.sy + dy / 5); g.lineTo(o.sx + dx, o.sy + dy); g.lineTo(o.sx + dx * 1.5, o.sy + dy); g.stroke();
        g.fillStyle = '#f7f1e3'; g.textAlign = right ? 'left' : 'right'; g.fillText(rd.text.toUpperCase(), o.sx + dx * 1.5 + (right ? 6 : -6), o.sy + dy);
      }
      g.globalAlpha = 1;
      if ('letterSpacing' in g) g.letterSpacing = '0px';
      // The keyhole: the scene is first seen through one drop of palm oil, which opens as you scroll in.
      keyOpen = sstep(0, 0.08, p);
      if (keyOpen < 0.999) {
        const s = mix(wide ? 66 : 50, Math.hypot(W, H) * 1.4, keyOpen ** 3), kx = view.cx, ky = view.cy - s * 0.1;
        g.globalCompositeOperation = 'destination-in'; dropPath(g, kx, ky, s); g.fillStyle = '#000'; g.fill();
        g.globalCompositeOperation = 'source-over';
        g.save(); dropPath(g, kx, ky, s); g.strokeStyle = `rgba(245,214,138,${(0.75 * (1 - keyOpen)).toFixed(3)})`; g.lineWidth = 1.2;
        g.shadowColor = 'rgba(245,184,28,.7)'; g.shadowBlur = 18; g.stroke(); g.restore();
      }
      frames++;
    }
    // Screens of copy take turns: each owns a sixth of the scroll, fading in and out at its edges; the last one stays.
    function screensAt(p) {
      screens.forEach((el, i) => {
        const a = i / NC, b = (i + 1) / NC, f = 0.25 / NC;
        const o = (i === 0 ? 1 : sstep(a, a + f, p)) * (i === NC - 1 ? 1 : 1 - sstep(b - f, b, p));
        if (el._o !== undefined && Math.abs(el._o - o) < 0.002) return;
        el._o = o; el.style.opacity = o.toFixed(3); el.style.transform = `translate3d(0, ${((1 - o) * (p < (a + b) / 2 ? 34 : -34)).toFixed(1)}px, 0)`;
        el.style.visibility = o < 0.02 ? 'hidden' : 'visible';
      });
      const c = Math.max(0, Math.min(NC - 1, Math.floor(p * NC)));
      if (c !== chapter) {
        chapter = c; numEl.textContent = CHAPTERS[c].n; section.dataset.chapter = String(c);
        rail.forEach((b, i) => (i === c ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
      }
      rail.forEach((b, i) => b.style.setProperty('--f', clamp01((p - i / NC) * NC).toFixed(3)));
      hint.style.opacity = (1 - sstep(0, 0.04, p)).toFixed(3);
      const el = screens[chapter], cr = cv.getBoundingClientRect(), b = el._o > 0.1 ? el.getBoundingClientRect() : null;
      copyBox = b ? { l: b.left - cr.left, r: b.right - cr.left, t: b.top - cr.top, b: b.bottom - cr.top } : null;
    }
    function readScroll() {
      const r = section.getBoundingClientRect(), span = Math.max(1, r.height - H);
      qRaw = -r.top / span; q = Math.max(-0.3, Math.min(1, qRaw)); covers = r.top <= 0.5 && r.bottom >= innerHeight - 0.5;
    }
    function layout() {
      const now = still();
      if (now !== isStill) {
        isStill = now; section.classList.toggle('is-still', now);
        if (now) screens.forEach(el => { el.style.opacity = el.style.transform = el.style.visibility = ''; el._o = undefined; });
      }
      barH = document.querySelector('.topbar')?.offsetHeight ?? 60; section.style.setProperty('--bar-h', `${barH}px`);
      const r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const nowWide = W >= 860;
      if (nowWide !== wide || !P.length) { wide = nowWide; build(); }
      U = wide ? Math.min(W * 0.5, H) * 0.25 : Math.min(W * 0.27, (H * 0.64 - barH - 64) * 0.3);
      if (!sprites.length) makeSprites();
    }
    function render() { if (still()) { qs = 0.62; draw(); return; } readScroll(); if (!primed) { qs = q; primed = true; } screensAt(qs); draw(); }
    function frame(now) {
      raf = 0;
      if (!section.isConnected || section.closest('.is-leaving') || still()) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now;
      if (!frozen()) time += dt;
      readScroll();
      // The camera follows the scroll on a spring, so a flick glides to a stop instead of jumping.
      const w = 8; qv += (w * w * (q - qs) - 2 * w * qv) * dt; qs += qv * dt;
      if (Math.abs(q - qs) > 0.3) { qs = q - Math.sign(q - qs) * 0.3; qv = 0; }
      const e = Math.min(1, dt * 4); wind.on += (wind.to - wind.on) * e; wind.sx += (wind.nx - wind.sx) * e * 0.5; wind.sy += (wind.ny - wind.sy) * e * 0.5;
      screensAt(qs); draw();
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf && visible && !still()) { last = 0; raf = requestAnimationFrame(frame); } };
    let auto = false, autoQ = 0, autoRaf = 0, autoLast = 0;
    const CHAPTER_S = 6.3; // seconds per chapter at the average pace
    const topAt = at => scrollY + section.getBoundingClientRect().top + at * (section.offsetHeight - H);
    function autoStep(now) {
      autoRaf = 0;
      if (!auto) return;
      if (!section.isConnected || section.closest('.is-leaving')) { setAuto(false); return; }
      const dt = autoLast ? Math.min(0.1, (now - autoLast) / 1000) : 1 / 60; autoLast = now;
      const x = ((autoQ * NC) % 1 + 1) % 1, pace = autoQ < 0 ? 2.2 : 0.4 + 1.2 * (1 - Math.sin(Math.PI * x));
      autoQ = Math.min(1, autoQ + dt * pace / (NC * CHAPTER_S));
      scrollTo({ top: topAt(autoQ), behavior: 'auto' });
      if (autoQ >= 1) { setAuto(false); return; }
      autoRaf = requestAnimationFrame(autoStep);
    }
    const interrupt = e => { // pressing Play itself (a click, Enter or Space) is not an interruption; anything else is
      if (e.target?.closest?.('[data-story-play]') && (e.type !== 'keydown' || e.key === 'Enter' || e.key === ' ')) return;
      setAuto(false);
    };
    const AUTO_STOPS = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    function setAuto(on) {
      if (on !== auto) {
        auto = on;
        if (on) { AUTO_STOPS.forEach(t => addEventListener(t, interrupt, { passive: true, capture: true })); autoLast = 0; autoRaf = requestAnimationFrame(autoStep); }
        else { AUTO_STOPS.forEach(t => removeEventListener(t, interrupt, { capture: true })); if (autoRaf) cancelAnimationFrame(autoRaf); autoRaf = 0; }
      }
      playBtn.setAttribute('aria-pressed', String(auto));
      playBtn.querySelector('span').textContent = auto ? 'Pause' : autoQ >= 0.995 || qRaw >= 0.995 ? 'Replay' : 'Play';
    }
    function play() {
      if (still()) return;
      readScroll();
      if (qRaw >= 0.995) { autoQ = 0; scrollTo({ top: topAt(0), behavior: 'auto' }); } else autoQ = Math.max(-0.3, qRaw);
      setAuto(true); M()?.haptic?.(8);
    }
    playBtn.addEventListener('click', () => (auto ? setAuto(false) : play()));
    function goChapter(i, instant = false) {
      setAuto(false);
      const r = section.getBoundingClientRect(), span = r.height - H, target = i === NC - 1 ? 1 : (i + 0.5) / NC;
      scrollTo({ top: scrollY + r.top + target * span, behavior: instant || still() ? 'auto' : 'smooth' });
      M()?.haptic?.(6);
    }
    stage.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect(); wind.x = e.clientX - r.left; wind.y = e.clientY - r.top;
      wind.to = e.target.closest('button') ? 0 : 1; wind.nx = wind.x / W - 0.5; wind.ny = wind.y / H - 0.5;
    }, { passive: true });
    const calm = () => { wind.to = 0; wind.nx = wind.ny = 0; };
    stage.addEventListener('pointerleave', calm); stage.addEventListener('pointercancel', calm); // a finger that starts scrolling
    rail.forEach(b => b.addEventListener('click', () => goChapter(Number(b.dataset.storyGo))));
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }) : null;
    io?.observe(section);
    let rt = 0;
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { layout(); render(); }, 80); }) : null;
    ro?.observe(stage); const topbar = document.querySelector('.topbar'); if (topbar) ro?.observe(topbar); // the journey tucks under the bar, so it follows its height
    layout(); render();
    if (!io) { visible = true; kick(); }
    return {
      stop() { setAuto(false); if (raf) cancelAnimationFrame(raf); raf = 0; io?.disconnect(); ro?.disconnect(); },
      play,
      redraw() { layout(); if (still()) render(); else { primed = false; render(); kick(); } },
      go: goChapter,
      get covers() { return covers && !still(); },
      get stats() { return { frames, progress: qs, chapter, open: keyOpen, particles: P.length, still: Boolean(isStill), auto }; },
    };
  }

  // Home is the journey and nothing else: motion first, few words. The page title stays for screen readers.
  function html(cfg) {
    return `<h1 class="sr-only">${esc(cfg.title)}</h1>${storyHtml()}`;
  }

  /* ── The living hive: fog, honeycomb and the swarm on one full-screen layer behind every page ── */
  const ATM = {
    light: { base: [238, 247, 240], fog: [[155, 225, 93, 0.34], [30, 174, 191, 0.2], [108, 192, 74, 0.3], [245, 184, 28, 0.16], [143, 216, 192, 0.3]], hex: [20, 113, 58] },
    dark: { base: [4, 17, 10], fog: [[47, 158, 68, 0.42], [30, 174, 191, 0.26], [245, 184, 28, 0.16], [20, 113, 58, 0.5], [143, 216, 192, 0.16]], hex: [160, 230, 180] },
  };
  const LIGHT0 = ATM.light; // Classic's light atmosphere; a look can replace it (--hive-base, --hive-fog, --hive-hex)
  function layerEl() {
    let l = document.getElementById('hive-layer');
    if (!l) { l = document.createElement('div'); l.id = 'hive-layer'; l.className = 'hive-layer'; l.setAttribute('aria-hidden', 'true'); l.innerHTML = '<canvas></canvas>'; document.body.prepend(l); }
    return l;
  }
  const mix = (a, b, t) => a + (b - a) * t;
  // What the swarm writes for a step: its short title without "To" and the articles ("To set the diesel price" → "Set diesel price").
  const phrase = s => String(s ?? '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').replace(/^\s*to\s+/i, '').replace(/\b(the|a|an)\s+/gi, '').replace(/\s+/g, ' ').trim().replace(/^./, c => c.toUpperCase());
  // The words, drawn once in the step colour on a canvas shaped like the band, then sampled into points.
  const LW = 1000, textCache = new Map();
  const WRITE = 0.3; // seconds from the first letter of a step's words setting off to the last
  function sampleText(text, lh, rgb, want) {
    const key = `${text}|${lh}|${rgb}|${want}`;
    if (textCache.has(key)) return textCache.get(key);
    const c = document.createElement('canvas'); c.width = LW; c.height = lh;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = (lines, cap) => { g.font = `800 100px ${FONT}`; const w = Math.max(...lines.map(l => g.measureText(l).width)); return Math.min(cap, 100 * LW * 0.94 / w); };
    let lines = [text], size = fit(lines, lh * 0.66);
    const words = text.split(' ');
    if (size < lh * 0.34 && words.length > 1) { // a narrow band: two lines, split near the middle
      let best = 1, bestD = Infinity;
      for (let i = 1; i < words.length; i++) { const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length); if (d < bestD) { bestD = d; best = i; } }
      const two = [words.slice(0, best).join(' '), words.slice(best).join(' ')], s2 = fit(two, lh * 0.4);
      if (s2 > size) { lines = two; size = s2; }
    }
    g.font = `800 ${size}px ${FONT}`;
    const [r, gg, b] = rgb, light = rgb.map(v => Math.round(v + (255 - v) * 0.45));
    const grad = g.createLinearGradient(0, lh * 0.15, 0, lh * 0.85);
    grad.addColorStop(0, `rgb(${light.join(',')})`); grad.addColorStop(1, `rgb(${r},${gg},${b})`);
    g.fillStyle = grad;
    lines.forEach((l, i) => g.fillText(l, LW / 2, lh / 2 + (i - (lines.length - 1) / 2) * size * 1.06));
    const data = g.getImageData(0, 0, LW, lh).data;
    let filled = 0; for (let i = 3; i < data.length; i += 16) if (data[i] > 140) filled++;
    const gap = Math.max(2.2, Math.sqrt(filled * 4 / want));
    const pts = [];
    for (let y = gap / 2; y < lh; y += gap) for (let x = gap / 2; x < LW; x += gap) {
      const jx = Math.min(LW - 1, Math.round(x + (Math.random() - 0.5) * gap * 0.5)), jy = Math.min(lh - 1, Math.round(y + (Math.random() - 0.5) * gap * 0.5));
      const i = (jy * LW + jx) * 4;
      if (data[i + 3] > 140) pts.push([jx, jy, data[i], data[i + 1], data[i + 2]]);
    }
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    if (textCache.size > 40) textCache.clear();
    textCache.set(key, pts);
    return pts;
  }

  // One swarm for the whole app. It is made once and carried from page to page as the moving background: a vortex in the
  // colour of the step on show (on Home it rests behind the journey). A page can give it a band ([data-hive-anchor]) where
  // it writes the step in hand; a new step scatters the words and the swarm writes the next ones. A tab change swirls it.
  let current = null;
  function start(root) {
    if (current) { current.attach(root); return current; }
    const html = document.documentElement;
    const layer = layerEl(), canvas = layer.querySelector('canvas'), ctx = canvas.getContext('2d');
    const vtx = { x: 0, y: 0, zoom: 1, spin: 0, kick: 0, init: false };
    let W = 0, H = 0, dpr = 1, N = 0, parts = [], wide = true, place = { x: 0, y: 0, s: 1 }, hexLayer = { light: null, dark: null }, hexes = [];
    let clock = 9, time = 0, frames = 0, raf = 0, last = 0, paused = false, roam = true;
    let anchor = null, storyEl = null, story = null, page = null;
    let words = '', lh = 160, cur = []; // the words being written, the band's shape in canvas units, their points
    let sayRaf = 0; // the next frame, when new words are sampled
    let atm = 0, atmTo = 0; // 0 = light atmosphere, 1 = dark
    const pointer = { x: -9999, y: -9999, on: false, nx: 0, ny: 0 };
    const tint = { to: null, c: [224, 161, 14], amt: 0, clock: 9 }; // the step colour the swarm takes on
    const still = () => Boolean(M()?.reduce) || paused;

    // Pause lives in the top bar, so the swarm can be stopped from any page.
    const bar = document.querySelector('.topbar-inner');
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'hive-toggle'; toggle.dataset.homePause = ''; toggle.setAttribute('aria-pressed', 'false');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-pause" d="M9 6v12M15 6v12"/><path class="i-play" d="M8 5.5l11 6.5-11 6.5z"/></svg><span class="sr-only">Pause the swarm</span>';
    bar?.insertBefore(toggle, bar.querySelector('#theme'));

    function readTheme() {
      const cs = getComputedStyle(html);
      atmTo = /dark/.test(cs.colorScheme || '') ? 1 : 0;
      // A light look may bring its own ground: --hive-base "r g b", --hive-fog five "r g b a" groups, --hive-hex "r g b".
      const nums = name => cs.getPropertyValue(name).trim().split(/[\s,]+/).filter(Boolean).map(Number).filter(n => !Number.isNaN(n));
      const base = nums('--hive-base'), fog = nums('--hive-fog'), hex = nums('--hive-hex');
      const next = { base: base.length === 3 ? base : LIGHT0.base, hex: hex.length === 3 ? hex : LIGHT0.hex,
        fog: fog.length === 20 ? [0, 1, 2, 3, 4].map(i => fog.slice(i * 4, i * 4 + 4)) : LIGHT0.fog };
      const redraw = next.hex.join() !== ATM.light.hex.join();
      ATM.light = next;
      if (redraw && W) buildHex();
      if (still() || !frames) atm = atmTo;
    }
    function layout() {
      W = Math.max(1, html.clientWidth); H = Math.max(1, html.clientHeight); // the fixed layer, without scrollbars
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      wide = W >= 860;
      const want = Math.round(Math.min(3200, Math.max(wide ? 900 : 1100, W * H / 470)));
      if (want !== N) {
        N = want;
        parts = Array.from({ length: N }, () => {
          const z = 0.45 + Math.random() * 1.0;
          return { x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, px: 0, py: 0, t: -1, wd: 0, z,
            r: 90, g: 190, b: 120, k: 0.6 + Math.random() * 0.8, seed: Math.random() * 100, size: 0.7 + Math.random() * 1.1,
            vr: 0.05 + 0.95 * Math.sqrt(Math.random()), arm: Math.floor(Math.random() * 3), th: Math.random() * 6.283, jit: (Math.random() - 0.5) * 0.55 };
        });
        parts.forEach(p => { p.px = p.x; p.py = p.y; });
      }
      writeWords(false);
      buildHex();
    }
    // Honeycomb drawn once per size and look, then blitted every frame.
    function buildHex() {
      const hs = wide ? 36 : 26, hw = hs * Math.sqrt(3);
      hexes = [];
      for (let row = -1, y = 0; y < H + hs * 2; row++, y = row * hs * 1.5) for (let col = -1, x = 0; x < W + hw; col++, x = col * hw + (row % 2 ? hw / 2 : 0)) hexes.push([x, y, hs]);
      for (const key of ['light', 'dark']) {
        const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.lineWidth = 1;
        const [r, gg, b] = ATM[key].hex; g.strokeStyle = `rgba(${r},${gg},${b},${key === 'dark' ? 0.045 : 0.055})`;
        for (const [x, y, s] of hexes) { hexPath(g, x, y, s); g.stroke(); }
        hexLayer[key] = c;
      }
    }
    function hexPath(g, x, y, s) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; const hx = x + Math.cos(a) * s * 0.96, hy = y + Math.sin(a) * s * 0.96; k ? g.lineTo(hx, hy) : g.moveTo(hx, hy); } g.closePath(); }
    function placeWords() {
      if (!anchor?.isConnected || !cur.length) { roam = true; return; } // nothing to write: the swarm is the background
      const r = anchor.getBoundingClientRect();
      place = { x: r.left, y: r.top, s: r.width / LW };
      // Scrolled away from the band, the words break up and the whole swarm drifts behind the page.
      roam = r.bottom < H * 0.22 || r.top > H * 0.94;
    }
    // Hand most particles a point of the words; the rest drift as atmosphere across the whole screen.
    function writeWords(scatter = true) {
      const r = anchor?.isConnected ? anchor.getBoundingClientRect() : null;
      if (!words || !r || r.width < 10) { cur = []; parts.forEach(p => { p.t = -1; }); return; }
      readTint();
      lh = Math.max(60, Math.round(LW * r.height / r.width));
      cur = sampleText(words, lh, tint.to ?? [61, 74, 143], Math.round(N * 0.72));
      // Bees are matched to letters from left to right, so each flies a short way and the words write from the left:
      // a letter's bees set off WRITE * (its place along the line) seconds after the first letter's.
      const byX = parts.map((p, j) => j).sort((a, b) => parts[a].x - parts[b].x);
      const pts = cur.map((q, n) => n).sort((a, b) => cur[a][0] - cur[b][0]);
      parts.forEach(p => { p.t = -1; });
      pts.forEach((n, m) => { const p = parts[byX[Math.floor(m * N / pts.length)]]; p.t = n; p.wd = WRITE * cur[n][0] / LW + Math.random() * 0.06; });
      clock = 0;
      if (scatter && !still()) parts.forEach(p => { const a = Math.random() * 6.283, s = 60 + Math.random() * 160; p.vx += Math.cos(a) * s; p.vy += Math.sin(a) * s; });
      if (still()) settlePoints();
    }
    function settlePoints() { placeWords(); parts.forEach(p => { if (p.t >= 0 && cur[p.t] && !roam) { const q = cur[p.t]; p.x = p.px = place.x + q[0] * place.s; p.y = p.py = place.y + q[1] * place.s; p.r = q[2]; p.g = q[3]; p.b = q[4]; } }); }
    function say(text) {
      const w = phrase(text);
      if (w === words) return;
      words = w; anchor?.setAttribute('data-hive-say', w);
      cancelAnimationFrame(sayRaf); clearTimeout(sayRaf); sayRaf = 0;
      if (still()) { writeWords(true); draw(); return; }
      // Sampled just after the next frame is painted, so a tab or step change shows first: the text sampling is the
      // slow part of a click. (A frame callback alone runs before that frame paints, so it would still hold it up.)
      sayRaf = requestAnimationFrame(() => { sayRaf = setTimeout(() => { sayRaf = 0; writeWords(true); kick(); }, 0); });
    }
    const burst = (cx, cy, power, radius) => parts.forEach(p => {
      const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1;
      if (d > radius) return;
      const f = power * (1 - d / radius);
      p.vx += dx / d * f; p.vy += dy / d * f;
    });
    // A tab change: every bee is thrown round the vortex, which turns a little further, then settles on the new page.
    function swirl() {
      if (still() || !vtx.init) return;
      vtx.kick += 0.9;
      parts.forEach(p => { const dx = p.x - vtx.x, dy = p.y - vtx.y, d = Math.hypot(dx, dy) || 1, s = 110 + Math.random() * 190; p.vx += -dy / d * s; p.vy += dx / d * s; });
    }
    // The colour of the step on show (the page's --accent), read every so often and eased into.
    const probe = document.createElement('canvas').getContext('2d');
    function readTint() {
      const v = page ? getComputedStyle(page).getPropertyValue('--accent').trim() : '';
      if (!v) { tint.to = null; return; }
      probe.fillStyle = '#000'; probe.fillStyle = v; const hx = probe.fillStyle;
      const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hx);
      tint.to = m ? [1, 2, 3].map(k => parseInt(m[k], 16)) : null;
    }

    function step(dt) {
      time += dt; clock += dt;
      atm = mix(atm, atmTo, Math.min(1, dt * 3));
      placeWords();
      tint.clock += dt;
      if (tint.clock > 0.4) { tint.clock = 0; readTint(); }
      const te = Math.min(1, dt * 1.6);
      tint.amt += ((tint.to ? 1 : 0) - tint.amt) * te;
      if (tint.to) for (let k = 0; k < 3; k++) tint.c[k] += (tint.to[k] - tint.c[k]) * te;
      const swirlN = Math.max(0, 1 - clock / 0.5); // the bees swarm hardest just after new words are sent
      const sy = scrollY;
      // The vortex turns around the words while they show, or the middle of the screen once the page scrolls on.
      const tcx = roam ? W * 0.5 : place.x + LW * place.s / 2, tcy = roam ? H * 0.5 : place.y + lh * place.s / 2;
      if (!vtx.init) { vtx.x = tcx; vtx.y = tcy; vtx.init = true; }
      const ve = Math.min(1, dt * 2); vtx.x += (tcx - vtx.x) * ve; vtx.y += (tcy - vtx.y) * ve;
      const prog = Math.min(1, sy / Math.max(1, document.documentElement.scrollHeight - H));
      vtx.zoom = mix(vtx.zoom, 0.9 + prog * 0.45, ve);
      vtx.kick *= Math.exp(-dt * 1.4);
      vtx.spin = mix(vtx.spin, prog * 2.6, ve) + vtx.kick * dt * 3; // scrolling turns the whole vortex; a tab change spins it on
      const Rm = Math.hypot(W, H) * 0.56 * vtx.zoom;
      const gold = [mix(224, 255, atm), mix(161, 214, atm), mix(14, 90, atm)];
      const inner = gold.map((v, k) => mix(v, tint.c[k], tint.amt * 0.85)), outer = [mix(31, 30, atm), mix(138, 174, atm), mix(92, 191, atm)];
      for (const p of parts) {
        p.px = p.x; p.py = p.y;
        let tx, ty, k;
        const formed = p.t >= 0 && cur[p.t] && !roam && clock >= p.wd;
        if (formed) {
          // A stiff, nearly critically damped spring: a letter lands in about half a second and barely overshoots.
          const q = cur[p.t]; tx = place.x + q[0] * place.s; ty = place.y + q[1] * place.s; k = 13 * (0.85 + 0.25 * p.k);
          const e = Math.min(1, dt * 6); p.r += (q[2] - p.r) * e; p.g += (q[3] - p.g) * e; p.b += (q[4] - p.b) * e;
        } else {
          // The vortex: every free particle orbits on one of three spiral arms, tilted like a galaxy seen at an angle;
          // inner particles turn faster and glow in the step colour, outer ones cool to teal. Slow, behind a working page.
          p.th += (0.08 + 0.5 * (1 - p.vr) ** 1.5) * dt * 0.55;
          const a = p.th + p.arm * 2.094 + 2.7 * Math.log(1 + p.vr * 5) + vtx.spin + p.jit, rr = p.vr * Rm;
          tx = vtx.x + Math.cos(a) * rr + pointer.nx * 18 * p.z; ty = vtx.y + Math.sin(a) * rr * 0.58 + pointer.ny * 12 * p.z;
          k = 1.7 * p.k;
          const e = Math.min(1, dt * 1.5), c0 = mix(inner[0], outer[0], p.vr), c1 = mix(inner[1], outer[1], p.vr), c2 = mix(inner[2], outer[2], p.vr);
          p.r += (c0 - p.r) * e; p.g += (c1 - p.g) * e; p.b += (c2 - p.b) * e;
        }
        let ax = (tx - p.x) * k * k * 0.5, ay = (ty - p.y) * k * k * 0.5;
        // Bee-like turbulence: strongest while the swarm travels, a soft shimmer once the words hold.
        const n = 150 * (0.05 + swirlN) + (formed ? 0 : 22);
        ax += n * Math.sin(p.y * 0.012 + time * 1.7 + p.seed); ay += n * Math.cos(p.x * 0.011 - time * 1.4 + p.seed);
        if (pointer.on) {
          const dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy, R = wide ? 120 : 84;
          if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 5600; ax += dx / d * f; ay += dy / d * f; }
          else if (!formed && d2 < 260 * 260) { ax -= dx * 0.6; ay -= dy * 0.6; } // curious bees circle the pointer
        }
        const damp = Math.exp(-dt * (formed ? 15 * (0.85 + 0.25 * p.k) : 1.7));
        p.vx = (p.vx + ax * dt) * damp; p.vy = (p.vy + ay * dt) * damp;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const L = ATM.light, D = ATM.dark;
      ctx.fillStyle = `rgb(${L.base.map((v, i) => Math.round(mix(v, D.base[i], atm))).join(',')})`;
      ctx.fillRect(0, 0, W, H);
      // Fog: large soft glows drifting slowly, the light and dark palettes cross-faded by the atmosphere.
      for (let i = 0; i < 5; i++) {
        const fx = W * (0.5 + 0.42 * Math.sin(time * (0.05 + i * 0.013) + i * 1.9)), fy = H * (0.5 + 0.38 * Math.cos(time * (0.04 + i * 0.011) + i * 2.7));
        const rad = Math.max(W, H) * (0.38 + 0.08 * Math.sin(time * 0.2 + i));
        for (const [pal, wgt] of [[L, 1 - atm], [D, atm]]) {
          if (wgt < 0.02) continue;
          const [r, g, b, a] = pal.fog[i]; const gr = ctx.createRadialGradient(fx, fy, 0, fx, fy, rad);
          gr.addColorStop(0, `rgba(${r},${g},${b},${(a * wgt).toFixed(3)})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        }
      }
      // The vortex core: a soft glow where the swirl turns, in the step colour.
      if (vtx.init) {
        const cr = Math.min(W, H) * 0.42 * vtx.zoom, gr = ctx.createRadialGradient(vtx.x, vtx.y, 0, vtx.x, vtx.y, cr);
        const base = atm > 0.5 ? [255, 214, 90] : ATM.light.fog[0].slice(0, 3), c = base.map((v, k) => Math.round(mix(v, tint.c[k], tint.amt)));
        gr.addColorStop(0, `rgba(${c.join(',')},${(atm > 0.5 ? 0.22 * atm : 0.32 * (1 - atm)).toFixed(3)})`);
        gr.addColorStop(0.45, atm > 0.5 ? `rgba(30,174,191,${(0.12 * atm).toFixed(3)})` : `rgba(30,174,191,${(0.1 * (1 - atm)).toFixed(3)})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
      // Honeycomb, lit around the words and where the pointer is.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (hexLayer.light && 1 - atm > 0.02) { ctx.globalAlpha = 1 - atm; ctx.drawImage(hexLayer.light, 0, 0); }
      if (hexLayer.dark && atm > 0.02) { ctx.globalAlpha = atm; ctx.drawImage(hexLayer.dark, 0, 0); }
      ctx.globalAlpha = 1; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = place.x + LW * place.s / 2, cy = place.y + lh * place.s / 2, reach = (wide ? 420 : 240) * (roam ? 0 : 1);
      const hc = ATM.dark.hex.map((v, i) => Math.round(mix(ATM.light.hex[i], v, atm)));
      for (const [x, y, s] of hexes) {
        const d = Math.hypot((x - cx) * 0.5, y - cy), dp = pointer.on ? Math.hypot(x - pointer.x, y - pointer.y) : 1e9;
        const glow = (reach ? Math.max(0, 1 - d / reach) * (0.5 + 0.5 * Math.sin(time * 1.6 - d * 0.02)) : 0) + Math.max(0, 1 - dp / 170);
        if (glow < 0.08) continue;
        hexPath(ctx, x, y, s);
        ctx.strokeStyle = `rgba(${hc.join(',')},${(glow * (0.14 + atm * 0.08)).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke();
        if (glow > 0.6) { ctx.fillStyle = atm > 0.5 ? `rgba(255,214,90,${((glow - 0.6) * 0.12).toFixed(3)})` : `rgba(${ATM.light.fog[2].slice(0, 3).join(',')},${((glow - 0.6) * 0.14).toFixed(3)})`; ctx.fill(); }
      }
      // The swarm. Near particles (larger z) are bigger and brighter: depth without 3D. Free bees are softer dots.
      ctx.globalCompositeOperation = atm > 0.5 ? 'lighter' : 'source-over';
      ctx.lineCap = 'round';
      for (const p of parts) {
        const formed = p.t >= 0 && cur[p.t] && !roam;
        const col = `rgb(${p.r | 0},${p.g | 0},${p.b | 0})`, size = formed ? 0.95 + p.size * 0.3 : p.size * p.z; // even dots keep the letters crisp
        const sp = Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
        ctx.globalAlpha = (formed ? 0.92 : 0.25) * (0.55 + 0.45 * p.z / 1.45);
        if (sp > (formed ? 1.2 : 2.4)) { ctx.strokeStyle = col; ctx.lineWidth = size * 1.6; ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, size * 1.2, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      frames++;
    }
    function frame(now) {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
      if (!document.hidden && !still() && !story?.covers) { step(dt); draw(); } // rests while the journey fills the screen
      if (!still()) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf && !still()) { last = 0; raf = requestAnimationFrame(frame); } };
    function settle() { atm = atmTo; readTint(); tint.amt = tint.to ? 1 : 0; if (tint.to) tint.c = tint.to.slice(); settlePoints(); draw(); }

    // Touch the hive: the pointer parts the swarm and the drifting bees circle it; a tap on open ground sends a ripple.
    const QUIET = '.story, .topbar, .stage, .flow, .hero h1, .hero-kicker, .theme-pop, footer';
    const onMove = e => {
      if (e.target.closest?.(QUIET)) { pointer.on = false; } else { pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true; }
      pointer.nx = e.clientX / W - 0.5; pointer.ny = e.clientY / H - 0.5;
    };
    const onLeave = () => { pointer.on = false; };
    const onDown = e => {
      if (still() || e.target.closest?.(`button, a, input, select, textarea, label, ${QUIET}`)) return;
      burst(e.clientX, e.clientY, 950, 280); M()?.haptic?.(6);
    };
    addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('pointerleave', onLeave); addEventListener('pointerdown', onDown, { passive: true });

    const setPaused = v => {
      paused = v; toggle.setAttribute('aria-pressed', String(v));
      toggle.querySelector('.sr-only').textContent = v ? 'Play the swarm' : 'Pause the swarm'; toggle.title = v ? 'Play the swarm' : 'Pause the swarm';
      if (v) { if (raf) cancelAnimationFrame(raf); raf = 0; settle(); } else kick();
    };
    toggle.addEventListener('click', () => setPaused(!paused));
    toggle.title = 'Pause the swarm';

    // The top bar turns to night glass while the journey runs underneath it.
    let under = null;
    function syncBar() {
      const b = storyEl?.isConnected ? storyEl.getBoundingClientRect() : null, h = bar?.offsetHeight ?? 60;
      const now = Boolean(b && b.top < h && b.bottom > h);
      if (now !== under) { under = now; html.classList.toggle('story-under-bar', now); }
    }

    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { layout(); if (still()) settle(); syncBar(); }, 100); };
    addEventListener('resize', onResize);
    const onScroll = () => { syncBar(); if (still()) settle(); };
    addEventListener('scroll', onScroll, { passive: true });
    const mo = new MutationObserver(() => { readTheme(); if (still()) settle(); });
    mo.observe(html, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener('visibilitychange', onVis);
    M()?.watch?.(() => { if (current === api) { if (still()) settle(); else kick(); story?.redraw(); } });

    // Each page hands the swarm its own root: Home brings the journey; the other pages bring the band to write in.
    function attach(r) {
      const fresh = Boolean(page);
      story?.stop();
      page = document.getElementById('page');
      anchor = r.querySelector('[data-hive-anchor]');
      storyEl = r.querySelector('[data-story]'); story = storyEl ? storyField(storyEl, () => paused) : null;
      html.classList.toggle('home-on', Boolean(storyEl));
      html.classList.toggle('home-night-end', Boolean(storyEl && !storyEl.nextElementSibling)); // the page ends in the journey's night
      under = null; syncBar();
      cancelAnimationFrame(sayRaf); clearTimeout(sayRaf); sayRaf = 0;
      words = ''; cur = []; parts.forEach(p => { p.t = -1; });
      readTint();
      if (fresh) { swirl(); if (still()) settle(); else kick(); }
    }
    function stop() {
      story?.stop(); story = null; sbwRo?.disconnect();
      if (raf) cancelAnimationFrame(raf); raf = 0;
      removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); removeEventListener('pointerdown', onDown);
      removeEventListener('resize', onResize); removeEventListener('scroll', onScroll);
      mo.disconnect(); document.removeEventListener('visibilitychange', onVis);
      toggle.remove();
      layer.classList.remove('is-on'); html.classList.remove('home-on', 'home-night-end', 'hive-on', 'story-under-bar');
      if (current === api) current = null;
    }

    const setSbw = () => html.style.setProperty('--sbw', `${Math.max(0, innerWidth - html.clientWidth)}px`);
    const sbwRo = 'ResizeObserver' in window ? new ResizeObserver(setSbw) : null;
    setSbw(); sbwRo?.observe(html);
    readTheme(); layout();
    layer.classList.add('is-on'); html.classList.add('hive-on');
    attach(root);
    if (still()) settle(); else kick();
    const api = { stop, attach, say, pause: setPaused,
      get words() { return words; }, get frames() { return frames; }, get particles() { return N; }, get roaming() { return roam; },
      get writing() { return Boolean(cur.length) && !roam; }, get paused() { return paused; },
      get tint() { return tint.to && tint.amt > 0.5 ? `rgb(${tint.to.join(', ')})` : null; },
      get story() { return story?.stats; }, chapter: (i, instant) => story?.go(i, instant), play: () => story?.play() };
    current = api;
    return api;
  }
  return { html, start, phrase, say: text => current?.say(text), get scene() { return current; } };
})();
