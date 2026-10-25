// Step pictures: every step box on OBJ1-OBJ4 and Decision now shows a drawn picture of what that step is about (the diesel
// pump, palm fruit beside the biodiesel flask, a balance weighing diesel against biodiesel, the B30 stamp...). Shared by the
// User and Developer levels; the Developer level's extra steps (the long-run link test, the starting-money search, the
// five-year stress test) have pictures of their own, and the list that matches the page's number of steps is used. It takes
// the place of the Mirror Hall liquid (hall.js stays in the builds but is no longer mounted). Drawn in code, in palm gold,
// fruit red, leaf green and diesel blue, on a ground tinted by the step colour, so the looks still recolour it.
// Motion: each picture moves on its own (a drip, swaying fronds, a waving flag, falling coins, a flipping calendar...),
// tilts and shifts in layers under the pointer, and a light sweeps across the step in hand. The pictures that show a check
// follow the live numbers: the balance tips by the price gap, the flag turns green or amber, the shield turns red when the
// fund is short, the B30 stamp comes down when approval is on, the ladder and the drop move to the blend, the jar fills to
// the savings share. Pictures rest while the row is off screen and stand still under Reduce motion.
// Self-contained: it brings its own stylesheet, so shared.css stays identical across the two levels.
// API:  ART.mount(flowWrap | null, tabId)    ART.update({ gap, fundSafe, auth, mandate, capture })

const ART = (() => {
  const SCENES = {
    obj1: ['pump', 'palm', 'balance', 'cross', 'signal'],
    obj2: ['fundflow', 'oilcase', 'period', 'share', 'survive'],
    obj3: ['levy', 'production', 'savings', 'seed', 'compare'],
    obj4: ['balance', 'fundcheck', 'stamp', 'ladder', 'swings', 'b30'],
    decision: ['balance', 'fundcheck', 'stamp', 'blend']
  };
  const DEVELOPER = { // the Developer level shows more steps on three objectives
    obj1: ['pump', 'palm', 'balance', 'cross', 'longrun', 'signal'],
    obj2: ['fundflow', 'oilcase', 'period', 'share', 'survive', 'seedsearch'],
    obj4: ['balance', 'fundcheck', 'stamp', 'ladder', 'matrix', 'swings', 'b30']
  };
  const F ='font-family="Segoe UI, -apple-system, Roboto, sans-serif"';
  const CSS = `
.ring > .step-art { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; border-radius: inherit; pointer-events: none; overflow: hidden;
  background: linear-gradient(168deg, color-mix(in srgb, var(--c) 42%, #0b1014) 0%, color-mix(in srgb, var(--c) 14%, #05070a) 100%);
  transform: perspective(520px) rotateY(calc(var(--px, 0) * 6deg)) rotateX(calc(var(--py, 0) * -5deg)) scale(1.04);
  transition: transform .45s cubic-bezier(.2, .8, .3, 1), filter .45s ease; }
.ring:has(> .step-art), .has-art .ring { overflow: hidden; -webkit-box-reflect: below 6px linear-gradient(transparent 84%, rgba(0, 0, 0, .12)); }
.ring > .step-art ~ .disc { position: relative; z-index: 1; }
.ring > .step-art ~ .disc > svg { display: none; }
.ring > .step-art ~ .check { z-index: 2; }
.node.is-future .ring > .step-art { filter: saturate(.78) brightness(.88); }
.node.is-active .ring > .step-art { filter: saturate(1.12) brightness(1.06); }
.step-art .d0 { transform: translate(calc(var(--px, 0) * -2px), calc(var(--py, 0) * -1.5px)); }
.step-art .d1 { transform: translate(calc(var(--px, 0) * 1.5px), calc(var(--py, 0) * 1px)); }
.step-art .d2 { transform: translate(calc(var(--px, 0) * 3px), calc(var(--py, 0) * 2px)); }
.step-art .d3 { transform: translate(calc(var(--px, 0) * 5px), calc(var(--py, 0) * 3.5px)); }
.step-art .d0, .step-art .d1, .step-art .d2, .step-art .d3 { transition: transform .35s ease-out; }
.step-art .sweep { transform: translateX(-80px); }
.node:hover .step-art .sweep, .node.is-active .step-art .sweep { animation: art-sweep calc(3.2s * var(--tempo, 1)) cubic-bezier(.45, 0, .25, 1) infinite; }
.step-art .m-drip { animation: art-drip calc(1.9s * var(--tempo, 1)) ease-in infinite; transform-box: fill-box; }
.step-art .m-sway { animation: art-sway calc(4.2s * var(--tempo, 1)) ease-in-out infinite; transform-box: view-box; }
.step-art .m-sway.slow { animation-duration: 6s; }
.step-art .m-bob { animation: art-bob calc(3s * var(--tempo, 1)) ease-in-out infinite; }
.step-art .m-wave { animation: art-wave calc(2.8s * var(--tempo, 1)) ease-in-out infinite; transform-box: view-box; }
.step-art .m-pulse { animation: art-pulse calc(2.2s * var(--tempo, 1)) ease-out infinite; transform-box: fill-box; transform-origin: center; }
.step-art .m-bub { animation: art-bub calc(2.2s * var(--tempo, 1)) ease-in infinite; transform-box: fill-box; }
.step-art .m-blink { animation: art-blink calc(1.1s * var(--tempo, 1)) steps(1) infinite; }
.step-art .m-spin { animation: art-spin calc(1.3s * var(--tempo, 1)) ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.step-art .m-fall { animation: art-fall calc(2.4s * var(--tempo, 1)) cubic-bezier(.5, 0, .75, .4) infinite; }
.step-art .m-draw { stroke-dasharray: 1 1; animation: art-draw calc(5s * var(--tempo, 1)) ease-in-out infinite; }
.step-art .m-flip { animation: art-flip calc(3.4s * var(--tempo, 1)) ease-in-out infinite; transform-box: view-box; }
.step-art .m-slide { animation: art-slide calc(2.2s * var(--tempo, 1)) linear infinite; }
.step-art .m-rise { animation: art-rise calc(2.4s * var(--tempo, 1)) ease-out infinite; }
.step-art .m-breathe { animation: art-breathe calc(3.6s * var(--tempo, 1)) ease-in-out infinite; transform-box: view-box; }
.step-art .m-level { animation: art-level calc(2.6s * var(--tempo, 1)) ease-in-out infinite; }
.step-art .m-idle { animation: art-idle calc(5s * var(--tempo, 1)) ease-in-out infinite; transform-box: view-box; }
.step-art .m-nudge { animation: art-nudge calc(1.4s * var(--tempo, 1)) ease-in-out infinite; }
.step-art .m-glow { animation: art-glow calc(3s * var(--tempo, 1)) ease-in-out infinite; }
.step-art .m-scan { animation: art-scan calc(3.2s * var(--tempo, 1)) ease-in-out infinite; }
.step-art .m-colsweep { animation: art-colsweep calc(3.6s * var(--tempo, 1)) steps(6, jump-none) infinite; }
@keyframes art-scan { 0%, 100% { transform: translateX(-10px); } 50% { transform: translateX(26px); } }
@keyframes art-colsweep { from { transform: translateX(0); } to { transform: translateX(63px); } }
@keyframes art-sweep { from { transform: translateX(-80px); } 60%, to { transform: translateX(130px); } }
@keyframes art-drip { 0% { transform: translateY(-5px); opacity: 0; } 15% { opacity: 1; } 75% { transform: translateY(9px); opacity: 1; } 100% { transform: translateY(11px); opacity: 0; } }
@keyframes art-sway { 0%, 100% { transform: rotate(-2.4deg); } 50% { transform: rotate(2.4deg); } }
@keyframes art-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
@keyframes art-wave { 0%, 100% { transform: skewY(0) scaleX(1); } 50% { transform: skewY(-5deg) scaleX(.93); } }
@keyframes art-pulse { from { transform: scale(.6); opacity: .85; } to { transform: scale(2); opacity: 0; } }
@keyframes art-bub { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: .9; } 100% { transform: translateY(-12px); opacity: 0; } }
@keyframes art-blink { 0% { opacity: 1; } 50% { opacity: 0; } }
@keyframes art-spin { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(.12); } }
@keyframes art-fall { 0% { transform: translateY(-22px); opacity: 0; } 15% { opacity: 1; } 70% { transform: translateY(0); opacity: 1; } 85%, 100% { transform: translateY(4px); opacity: 0; } }
@keyframes art-draw { 0% { stroke-dashoffset: 1; } 40%, 82% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -1; } }
@keyframes art-flip { 0%, 50% { transform: scaleY(1); opacity: 1; } 78% { transform: scaleY(0); opacity: .5; } 79%, 100% { transform: scaleY(0); opacity: 0; } }
@keyframes art-slide { from { transform: translateX(0); } to { transform: translateX(-20px); } }
@keyframes art-rise { 0% { transform: translateY(8px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(-18px); opacity: 0; } }
@keyframes art-breathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(.88); } }
@keyframes art-level { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(1.5px); } }
@keyframes art-idle { 0%, 100% { transform: rotate(-.8deg); } 50% { transform: rotate(.8deg); } }
@keyframes art-nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
@keyframes art-glow { 0%, 100% { opacity: .22; } 50% { opacity: .5; } }
/* live pictures */
.step-art .beam { transform: rotate(var(--tilt, 0deg)); transform-box: view-box; transform-origin: 50px 30px; transition: transform 1.1s cubic-bezier(.34, 1.56, .64, 1); }
.step-art .pan-l { transform: translateY(calc(var(--lift, 0px) * -1)); transition: transform 1.1s cubic-bezier(.34, 1.56, .64, 1); }
.step-art .pan-r { transform: translateY(var(--lift, 0px)); transition: transform 1.1s cubic-bezier(.34, 1.56, .64, 1); }
.step-art[data-ok="false"] { --shield: #d9442e; }
.step-art .bad, .step-art[data-ok="false"] .ok { opacity: 0; }
.step-art[data-ok="false"] .bad { opacity: 1; }
.step-art .imprint { opacity: 0; transition: opacity .3s ease .3s; }
.step-art[data-on="true"] .imprint { opacity: 1; }
.step-art[data-on="true"] .slot { opacity: 0; }
.step-art.pressing .press { animation: art-press calc(.9s * var(--tempo, 1)) cubic-bezier(.3, 0, .2, 1); }
@keyframes art-press { 0% { transform: translateY(0); } 38% { transform: translateY(21px); } 52% { transform: translateY(21px); } 100% { transform: translateY(0); } }
.step-art .rung { opacity: .3; transform-box: fill-box; transform-origin: center; transition: opacity .45s ease, transform .6s cubic-bezier(.34, 1.56, .64, 1); }
.step-art .rung.on { opacity: 1; transform: scale(1.08); }
.step-art .marker { transition: transform .8s cubic-bezier(.34, 1.4, .64, 1); }
.step-art .gold { transform-box: view-box; transform-origin: 50px 10px; transition: transform 1s cubic-bezier(.34, 1.3, .64, 1); }
.step-art .level { transform: scaleY(var(--fill, 1)); transform-box: view-box; transform-origin: 50px 92px; transition: transform 1s cubic-bezier(.34, 1.3, .64, 1); }
.art-rest .step-art *, .art-rest .step-art { animation-play-state: paused !important; }
@media (prefers-reduced-motion: reduce) {
  .step-art * { animation: none !important; }
  .ring > .step-art, .step-art * { transition: none !important; }
  .ring > .step-art { transform: none; }
}
@media print { .ring > .step-art * { animation: none !important; } }`;

  let uid = 0, wrap = null, io = null, last = null, styled = false;

  /* ── drawing ─────────────────────────────────────── */
  function defs(u) {
    const lin = (id, a, b) => `<linearGradient id="${id}${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
    return `<defs>${lin('ag', '#ffd978', '#c07d0e')}${lin('ab', '#8aa2f0', '#1e2c57')}${lin('an', '#6fdc9f', '#1f6b40')}${lin('as', '#eef3f0', '#8f9b95')}
      <radialGradient id="af${u}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff9257"/><stop offset=".55" stop-color="#d63f1b"/><stop offset="1" stop-color="#5c1206"/></radialGradient>
      <radialGradient id="ah${u}" cx=".75" cy=".15" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="gl${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".32" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="sw${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;
  }
  const shadow = (cx, rx) => `<ellipse cx="${cx}" cy="93" rx="${rx}" ry="3.6" fill="#000" opacity=".3"/>`;
  const txt = (x, y, s, size, fill, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${fill}" ${F} ${extra}>${s}</text>`;

  function body(id, u) {
    const g = n => `url(#${n}${u})`;
    const coin = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="3.2" fill="#a8690a"/><ellipse cx="${x}" cy="${y - 1.3}" rx="9" ry="3.2" fill="#ffcf5c" stroke="#fff3c4" stroke-width=".4"/>`;
    const stack = (x, n) => Array.from({ length: n }, (_, k) => coin(x, 88 - k * 4)).join('');
    const wave = (y, a) => { let d = `M-40 ${y}`; for (let k = 0; k < 20; k++) d += k ? ' t10 0' : ` q5 ${-a} 10 0`; return d; };
    switch (id) {
      case 'pump': return `<g class="d1">${shadow(46, 36)}</g>
        <g class="d2"><rect x="16" y="22" width="38" height="68" rx="7" fill="${g('ab')}" stroke="#9fb3f3" stroke-width=".7"/><rect x="18" y="24" width="34" height="6" rx="3" fill="#fff" opacity=".13"/>
          <rect x="22" y="32" width="26" height="16" rx="2.5" fill="#09101f"/>${txt(31, 43.5, 'RM', 8, '#ffd36b')}<rect class="m-blink" x="41" y="36" width="2" height="8" fill="#ffd36b"/>
          <rect x="22" y="53" width="26" height="3" rx="1.5" fill="#09101f" opacity=".7"/><rect x="22" y="59" width="16" height="3" rx="1.5" fill="#09101f" opacity=".5"/><rect x="12" y="88" width="46" height="6" rx="2" fill="#2b3f73"/></g>
        <g class="d3"><g class="m-sway" style="transform-origin:54px 42px"><path d="M54 42 C72 40 79 52 77 66" fill="none" stroke="#0b0d10" stroke-width="4" stroke-linecap="round"/>
          <path d="M71 64 h12 l3 6 l-9 5 l-7 -3 z" fill="${g('as')}"/><path class="m-drip" d="M80 80c0 0-4 5-4 8a4 4 0 0 0 8 0c0-3-4-8-4-8z" fill="#8aa2f0"/></g></g>`;
      case 'palm': {
        const fruit = [[30, 58], [38, 54], [46, 58], [26, 66], [34, 64], [42, 64], [50, 66], [30, 74], [38, 72], [46, 74], [34, 81], [42, 81]]
          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.3" fill="${g('af')}"/><circle cx="${x - 1.7}" cy="${y - 1.9}" r="1.3" fill="#ffc2a0" opacity=".7"/>`).join('');
        return `<defs><clipPath id="fk${u}"><path d="M72 44 V58 L63 76 a4 4 0 0 0 3.6 6 h22.8 a4 4 0 0 0 3.6 -6 L84 58 V44 Z"/></clipPath></defs>
        <g class="d1"><g class="m-sway slow" style="transform-origin:38px 66px" fill="${g('an')}"><path d="M38 66 C20 46 6 46 0 52 C14 48 26 54 38 66z"/><path d="M38 66 C28 36 32 22 42 12 C38 30 40 46 38 66z"/><path d="M38 66 C52 42 64 36 74 36 C62 44 50 52 38 66z" opacity=".8"/></g></g>
        <g class="d2"><g class="m-bob"><path d="M38 92 V82" stroke="#5a3a18" stroke-width="3" stroke-linecap="round"/>${fruit}</g></g>
        <g class="d3"><path d="M72 44 V58 L63 76 a4 4 0 0 0 3.6 6 h22.8 a4 4 0 0 0 3.6 -6 L84 58 V44 Z" fill="rgba(255,255,255,.07)"/>
          <g clip-path="url(#fk${u})"><g class="m-level"><path d="M58 69 q5 -2 10 0 t10 0 t10 0 t10 0 V90 H58 Z" fill="${g('ag')}"/></g>
          <circle class="m-bub" cx="73" cy="79" r="1.2" fill="#fff"/><circle class="m-bub" cx="80" cy="77" r="1" fill="#fff" style="animation-delay:.7s"/><circle class="m-bub" cx="77" cy="80" r=".9" fill="#fff" style="animation-delay:1.4s"/></g>
          <path d="M70 44 h16 M72 44 V58 L63 76 a4 4 0 0 0 3.6 6 h22.8 a4 4 0 0 0 3.6 -6 L84 58 V44" fill="none" stroke="#e8f0ea" stroke-width="1.3" stroke-linejoin="round"/></g>`;
      }
      case 'balance': return `<g class="d1">${shadow(50, 28)}<path d="M50 30 V90 M36 91 h28" stroke="#d5ddd8" stroke-width="3.2" stroke-linecap="round"/></g>
        <g class="d2"><g class="m-idle" style="transform-origin:50px 30px">
          <g class="beam"><path d="M16 30 H84" stroke="#d5ddd8" stroke-width="3" stroke-linecap="round"/></g>
          <g class="pan-l"><path d="M16 30 L7 52 M16 30 L25 52" stroke="#d5ddd8" stroke-width=".8"/><path d="M5 52 h22 a11 5 0 0 1 -22 0z" fill="#d5ddd8"/><rect x="9.5" y="37" width="13" height="15" rx="2" fill="${g('ab')}"/><path d="M9.5 42 h13 M9.5 47 h13" stroke="#0a1226" stroke-width=".8"/>${txt(16, 66, 'diesel', 6.5, '#b9c8f5')}</g>
          <g class="pan-r"><path d="M84 30 L75 52 M84 30 L93 52" stroke="#d5ddd8" stroke-width=".8"/><path d="M73 52 h22 a11 5 0 0 1 -22 0z" fill="#d5ddd8"/><rect x="77" y="34" width="14" height="18" rx="2" fill="${g('ag')}"/><path d="M77 40 h14 M77 46 h14" stroke="#8a5a00" stroke-width=".8"/>${txt(84, 66, 'palm', 6.5, '#ffd36b')}</g>
          <circle cx="50" cy="30" r="3.6" fill="#ffd36b" stroke="#fff3c4" stroke-width=".6"/></g></g>`;
      case 'cross': return `<g class="d1" stroke="rgba(255,255,255,.07)"><path d="M20 10 V90 M40 10 V90 M60 10 V90 M80 10 V90 M6 22 H94 M6 42 H94 M6 62 H94 M6 82 H94"/></g>
        <g class="d2"><path class="m-draw" pathLength="1" d="M8 80 L92 32" fill="none" stroke="#8aa2f0" stroke-width="3" stroke-linecap="round"/><path class="m-draw" pathLength="1" style="animation-delay:.3s" d="M8 92 L92 16" fill="none" stroke="#ffcf5c" stroke-width="3" stroke-linecap="round"/>
          ${txt(86, 47, 'diesel', 6.5, '#b9c8f5')}${txt(70, 16, 'palm', 6.5, '#ffd36b')}</g>
        <g class="d3"><circle class="m-pulse" cx="44" cy="59.4" r="7" fill="none" stroke="#fff" stroke-width="1.2"/><circle cx="44" cy="59.4" r="7" fill="none" stroke="#fff" stroke-width="1.3"/><circle cx="44" cy="59.4" r="3.2" fill="#ffcf5c" stroke="#fff"/></g>`;
      case 'signal': return `<g class="d1"><path d="M12 92 q38 -12 76 0 z" fill="#2f7d4a" opacity=".75"/><circle class="m-glow" cx="54" cy="33" r="26" style="fill:var(--flag,#ffb547)"/></g>
        <g class="d2"><path d="M30 14 V90" stroke="#d5ddd8" stroke-width="3" stroke-linecap="round"/><circle cx="30" cy="13" r="2.6" fill="#ffd36b"/>
          <g class="m-wave" style="transform-origin:31px 33px"><path d="M31 18 C45 12 56 24 76 18 L76 48 C56 54 45 42 31 48 Z" style="fill:var(--flag,#ffb547)" stroke="rgba(255,255,255,.5)" stroke-width=".6"/>${txt(53, 39.5, '!', 16, '#2a1408', 'class="glyph"')}</g></g>`;
      case 'fundflow': return `<defs><clipPath id="tk${u}"><rect x="22" y="30" width="56" height="58" rx="8"/></clipPath></defs>
        <g class="d1"><rect x="22" y="30" width="56" height="58" rx="8" fill="rgba(255,255,255,.06)"/></g>
        <g class="d2"><g clip-path="url(#tk${u})"><g class="m-level"><path d="M10 56 q4 -2.5 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 V92 H10 Z" fill="${g('an')}"/></g></g>
          <rect x="22" y="30" width="56" height="58" rx="8" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1"/>${txt(50, 78, 'BSF', 9, '#eafff2')}</g>
        <g class="d3"><path d="M10 16 H34 V24" stroke="#d5ddd8" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${txt(18, 12, 'in', 6.5, '#ffd36b')}
          <g class="m-fall"><ellipse cx="34" cy="48" rx="5" ry="2" fill="#ffcf5c" stroke="#fff3c4" stroke-width=".5"/></g>
          <path d="M78 80 H90 V86" stroke="#d5ddd8" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${txt(86, 75, 'out', 6.5, '#b9c8f5')}
          <path class="m-drip" style="animation-delay:.9s" d="M90 88c0 0-3 4-3 6a3 3 0 0 0 6 0c0-2-3-6-3-6z" fill="#6fdc9f"/></g>`;
      case 'oilcase': return `<g class="d1" stroke="rgba(255,255,255,.12)" stroke-dasharray="2 3"><path d="M10 22 H90 M10 36 H90 M10 50 H90"/></g>
        <g class="d2"><path class="m-draw" pathLength="1" d="M10 46 L22 40 L32 44 L44 26 L54 34 L66 22 L78 36 L90 30" fill="none" stroke="#ffcf5c" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></g>
        <g class="d3"><g class="m-bob"><rect x="34" y="58" width="32" height="34" rx="5" fill="#20262c" stroke="#5c6670"/><rect x="34" y="65" width="32" height="3" fill="#8aa2f0"/><rect x="34" y="82" width="32" height="3" fill="#8aa2f0"/>
          <ellipse cx="50" cy="58" rx="16" ry="3" fill="#2c343c" stroke="#5c6670"/><path d="M50 70 c0 0 -4 5 -4 7.5 a4 4 0 0 0 8 0 c0 -2.5 -4 -7.5 -4 -7.5z" fill="#0b0d10" stroke="#ffcf5c" stroke-width=".7"/></g>
          <circle class="m-pulse" cx="90" cy="30" r="3" fill="#ffcf5c"/><circle cx="90" cy="30" r="2.6" fill="#ffcf5c"/></g>`;
      case 'period': {
        const dots = Array.from({ length: 20 }, (_, k) => { const x = 28 + (k % 5) * 10, y = 54 + Math.floor(k / 5) * 8; return `<rect x="${x}" y="${y}" width="5" height="4" rx="1" fill="${k === 12 ? '#e0a92b' : '#9aa3ad'}"/>`; }).join('');
        return `<g class="d1"><rect x="26" y="34" width="56" height="58" rx="6" fill="#d9dfdb" opacity=".3"/></g>
        <g class="d2"><rect x="22" y="30" width="56" height="58" rx="6" fill="#eef2ef"/>${dots}
          <g class="m-flip" style="transform-origin:50px 44px"><rect x="22" y="44" width="56" height="44" rx="3" fill="#f7faf8"/>${dots}</g>
          <path d="M28 30 h44 a6 6 0 0 1 6 6 v8 h-56 v-8 a6 6 0 0 1 6 -6z" fill="#d63f1b"/>${txt(50, 41, 'MONTHS', 6.5, '#fff', 'letter-spacing=".6"')}
          <path d="M36 25 v9 M64 25 v9" stroke="#d5ddd8" stroke-width="3" stroke-linecap="round"/></g>`;
      }
      case 'share': return `<defs><clipPath id="jr${u}"><path d="M30 40 h40 v44 a8 8 0 0 1 -8 8 h-24 a8 8 0 0 1 -8 -8z"/></clipPath></defs>
        <g class="d1">${shadow(50, 24)}</g>
        <g class="d2"><g clip-path="url(#jr${u})"><g class="level"><rect x="30" y="40" width="40" height="52" fill="${g('ag')}"/><path d="M30 50 H70 M30 56 H70 M30 62 H70 M30 68 H70 M30 74 H70 M30 80 H70 M30 86 H70" stroke="#a8690a" stroke-width=".8"/></g></g>
          <path d="M30 40 h40 v44 a8 8 0 0 1 -8 8 h-24 a8 8 0 0 1 -8 -8z" fill="rgba(255,255,255,.07)" stroke="#e8f0ea" stroke-width="1.3"/><rect x="34" y="33" width="32" height="7" rx="2" fill="#2f7d4a"/><rect x="44" y="35.5" width="12" height="2" rx="1" fill="#0b0d10"/></g>
        <g class="d3"><g class="m-fall"><ellipse cx="50" cy="31" rx="2" ry="5" fill="#ffcf5c" stroke="#fff3c4" stroke-width=".5"/></g></g>`;
      case 'survive': return `<defs><clipPath id="sv${u}"><rect x="0" y="58" width="100" height="42"/></clipPath></defs>
        <g class="d1"><g clip-path="url(#sv${u})"><g class="m-slide"><path d="${wave(70, 6)} V100 H-40 Z" fill="#1e2c57" opacity=".9"/></g><g class="m-slide" style="animation-duration:3.1s"><path d="${wave(78, 5)} V100 H-40 Z" fill="#2c4a8a" opacity=".85"/></g></g></g>
        <g class="d3"><g class="m-bob"><path d="M50 18 l22 8 v18 c0 14 -9 22 -22 26 c-13 -4 -22 -12 -22 -26 v-18 z" fill="${g('an')}" stroke="#bff0d4" stroke-width="1"/><path d="M40 44 l7 7 l13 -14" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
          <circle class="m-pulse" cx="50" cy="44" r="16" fill="none" stroke="#bff0d4" stroke-width="1"/></g>`;
      case 'levy': return `<g class="d1">${shadow(50, 30)}</g>
        <g class="d2"><path d="M24 56 h52 v30 a6 6 0 0 1 -6 6 h-40 a6 6 0 0 1 -6 -6z" fill="${g('an')}"/><rect x="24" y="52" width="52" height="8" rx="3" fill="#2f9d63"/><rect x="40" y="54.5" width="20" height="3" rx="1.5" fill="#0b0d10"/>${txt(50, 80, 'BSL', 11, '#eafff2')}</g>
        <g class="d3"><g class="m-fall" style="animation-duration:2.2s"><g class="m-spin"><circle cx="50" cy="44" r="9" fill="${g('ag')}" stroke="#fff3c4" stroke-width=".8"/>${txt(50, 46.6, 'RM', 7, '#7a4a00')}</g></g></g>`;
      case 'production': {
        const fruit = [[46, 52], [52, 50], [58, 53], [48, 58], [55, 58], [51, 63]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${g('af')}"/>`).join('');
        return `<g class="d1"><path d="M6 92 q44 -12 88 0 z" fill="#2f7d4a" opacity=".6"/></g>
        <g class="d2"><path d="M48 92 C47 76 50 60 52 44" stroke="#7a5230" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M46 84 q3 -2 5 0 M47 74 q3 -2 5 0 M48 64 q3 -2 5 0" stroke="#5a3a18" stroke-width="1" fill="none"/><g class="m-bob">${fruit}</g></g>
        <g class="d3"><g class="m-sway" style="transform-origin:52px 44px" fill="${g('an')}"><path d="M52 44 C40 30 26 30 16 36 C28 34 40 38 52 44z"/><path d="M52 44 C46 26 50 16 58 10 C54 24 54 34 52 44z"/><path d="M52 44 C64 28 78 26 88 32 C76 32 64 38 52 44z"/><path d="M52 44 C38 42 26 50 20 60 C30 52 40 48 52 44z" opacity=".85"/><path d="M52 44 C66 44 78 52 84 62 C74 54 64 50 52 44z" opacity=".85"/></g></g>`;
      }
      case 'savings': return `<g class="d1">${shadow(50, 30)}<g class="m-rise"><circle cx="38" cy="46" r="5.5" fill="${g('ag')}" stroke="#fff3c4" stroke-width=".6"/></g><g class="m-rise" style="animation-delay:.8s"><circle cx="52" cy="46" r="5.5" fill="${g('ag')}" stroke="#fff3c4" stroke-width=".6"/></g><g class="m-rise" style="animation-delay:1.6s"><circle cx="45" cy="46" r="5.5" fill="${g('ag')}" stroke="#fff3c4" stroke-width=".6"/></g></g>
        <g class="d2"><rect x="22" y="48" width="56" height="40" rx="7" fill="#7a4a24"/><rect x="22" y="48" width="56" height="10" rx="5" fill="#8f5a2e"/><path d="M56 62 h22 v14 h-22 a7 7 0 0 1 0 -14z" fill="#6a3e1c"/><circle cx="60" cy="69" r="2.4" fill="#ffd36b"/></g>`;
      case 'seed': return `<g class="d1">${shadow(50, 34)}</g>
        <g class="d2"><path d="M20 42 L50 24 L80 42 Z" fill="#d5ddd8"/><rect x="22" y="42" width="56" height="5" fill="#c3ccc7"/>${[27, 39, 51, 63].map(x => `<rect x="${x}" y="47" width="10" height="30" fill="#e9eeeb"/><rect x="${x + 6.5}" y="47" width="2" height="30" fill="#c3ccc7"/>`).join('')}
          <rect x="18" y="77" width="64" height="5" fill="#c3ccc7"/><rect x="14" y="82" width="72" height="6" rx="1.5" fill="#aeb8b3"/><circle cx="50" cy="35.5" r="3" fill="#ffd36b"/></g>
        <g class="d3"><g class="m-fall" style="animation-duration:2.8s"><g class="m-spin"><circle cx="50" cy="17" r="6" fill="${g('ag')}" stroke="#fff3c4" stroke-width=".6"/></g></g><circle class="m-pulse" cx="50" cy="35.5" r="4" fill="none" stroke="#ffd36b" stroke-width="1"/></g>`;
      case 'compare': {
        const cols = [[22, [10, 14, 22]], [43, [12, 18, 26]], [64, [8, 12, 18]]];
        const bars = cols.map(([x, [levy, sav, seed]], k) => `<g class="m-breathe" style="transform-origin:${x + 7}px 90px;animation-delay:${k * 0.45}s"><rect x="${x}" y="${90 - seed}" width="14" height="${seed}" fill="#f4b23a"/><rect x="${x}" y="${90 - seed - sav}" width="14" height="${sav}" fill="#36a96b"/><rect x="${x}" y="${90 - seed - sav - levy}" width="14" height="${levy}" rx="2" fill="#7b8af0"/></g>`).join('');
        return `<g class="d1" stroke="rgba(255,255,255,.12)"><path d="M14 90 H88 M14 70 H88 M14 50 H88" stroke-dasharray="2 3"/></g><g class="d2">${bars}</g>`;
      }
      case 'fundcheck': return `<g class="d1">${stack(22, 5)}${stack(40, 8)}</g>
        <g class="d3"><g class="m-bob"><path d="M68 34 l16 6 v13 c0 10 -7 16 -16 18 c-9 -2 -16 -8 -16 -18 v-13 z" style="fill:var(--shield,#2f9d63)" stroke="rgba(255,255,255,.7)" stroke-width=".9"/>
          <path class="ok" d="M61.5 52 l4.5 4.5 l8 -9" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${txt(68, 58, '!', 15, '#fff', 'class="bad"')}</g>
          <circle class="m-pulse" cx="68" cy="52" r="12" fill="none" style="stroke:var(--shield,#2f9d63)" stroke-width="1"/></g>`;
      case 'stamp': return `<g class="d1"><rect x="14" y="58" width="72" height="34" rx="3" fill="#eef2ef"/><path d="M20 66 h26 M20 72 h22 M20 78 h26 M20 84 h16" stroke="#9aa3ad" stroke-width="1.4"/>
          <rect class="slot" x="52" y="63" width="26" height="20" rx="2" fill="none" stroke="#8a4fb8" stroke-dasharray="2.5 2"/>
          <g class="imprint"><rect x="53" y="64" width="24" height="18" rx="2" fill="none" stroke="#8a4fb8" stroke-width="1.6"/>${txt(65, 76, 'B30', 8, '#8a4fb8')}</g></g>
        <g class="d3"><g class="press"><g class="m-bob"><ellipse cx="65" cy="12" rx="8" ry="6" fill="#c18cf0"/><rect x="62" y="16" width="6" height="14" fill="#7a3fa8"/><rect x="51" y="30" width="28" height="11" rx="2" fill="#8a4fb8"/>${txt(65, 38.6, 'B30', 7.5, '#fff')}</g></g></g>`;
      case 'ladder': return `<g class="d1"><path d="M30 14 V92 M70 14 V92" stroke="#d5ddd8" stroke-width="2.5" stroke-linecap="round" opacity=".55"/></g>
        <g class="d2">${[['B30', 22, '#2fbfb6', '#04201e'], ['B20', 46, '#e0a92b', '#1a1300'], ['B15', 70, '#ff6a5c', '#2a0806']].map(([m, y, c, ink]) => `<g class="rung" data-m="${m}"><rect x="26" y="${y}" width="48" height="16" rx="8" fill="${c}" stroke="#fff" stroke-opacity=".6"/>${txt(50, y + 11.5, m, 8, ink)}</g>`).join('')}</g>
        <g class="d3"><g class="marker" style="transform:translateY(49px)"><g class="m-nudge"><path d="M12 0 l8 5 l-8 5z" fill="#fff"/></g></g></g>`;
      case 'swings': {
        const row = (y, a, c, label, dur) => `${txt(11, y + 2.5, label, 6.5, c)}<g clip-path="url(#sg${u})"><g class="m-slide" style="animation-duration:${dur}s"><path d="${wave(y, a)}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/></g></g>`;
        return `<defs><clipPath id="sg${u}"><rect x="22" y="0" width="74" height="100"/></clipPath></defs>
        <g class="d1" stroke="rgba(255,255,255,.08)"><path d="M22 30 H96 M22 54 H96 M22 78 H96"/></g>
        <g class="d2">${row(30, 18, '#2fbfb6', 'B30', 1.5)}${row(54, 11, '#e0a92b', 'B20', 2.2)}${row(78, 11, '#c18cf0', 'Rule', 2.2)}</g>`;
      }
      case 'b30': return `<g class="d1"><circle class="m-glow" cx="50" cy="52" r="34" fill="#ffd36b"/></g>
        <g class="d2"><g class="m-bob"><path d="M50 16 C50 16 30 42 30 58 a20 20 0 0 0 40 0 C70 42 50 16 50 16Z" fill="${g('ag')}" stroke="#fff3c4" stroke-width=".8"/>${txt(50, 65, 'B30', 13, '#4a2e00')}</g></g>
        <g class="d3"><g class="m-sway" style="transform-origin:72px 82px"><path d="M72 82 C70 68 80 60 92 60 C92 72 84 82 72 82z" fill="${g('an')}"/><path d="M72 82 C78 74 84 68 90 62" stroke="#bff0d4" stroke-width=".7" fill="none"/></g>
          <g class="m-rise"><path d="M14 74 l5 -6 l5 6 M19 68 v12" stroke="#5fd394" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g><g class="m-rise" style="animation-delay:1.2s"><path d="M22 66 l4 -5 l4 5 M26 61 v10" stroke="#ffd36b" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
      case 'blend': return `<defs><clipPath id="dp${u}"><path d="M50 14 C50 14 26 44 26 61 a24 24 0 0 0 48 0 C74 44 50 14 50 14Z"/></clipPath></defs>
        <g class="d1"><ellipse class="m-pulse" cx="50" cy="91" rx="12" ry="2.4" fill="none" stroke="#ffd36b" stroke-width="1"/></g>
        <g class="d2"><g class="m-bob"><g clip-path="url(#dp${u})"><rect x="20" y="10" width="60" height="80" fill="${g('ab')}"/><rect class="gold" x="20" y="10" width="60" height="25.3" fill="${g('ag')}" style="transform:scaleY(.72)"/></g>
          <path d="M50 14 C50 14 26 44 26 61 a24 24 0 0 0 48 0 C74 44 50 14 50 14Z" fill="none" stroke="#fff3c4" stroke-width=".9"/><path d="M36 54 q-3 8 1 16" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round"/>
          ${txt(50, 68, 'B20', 15, '#fff', 'class="lbl"')}${txt(50, 78, '20% palm', 6.5, '#e8eeff', 'class="sub"')}</g></g>`;
      case 'longrun': { // two prices tied together: they wander, but the gap between them holds
        const ties = Array.from({ length: 21 }, (_, k) => `M${-40 + k * 10} 44 V58`).join(' ');
        return `<defs><clipPath id="lr${u}"><rect x="8" y="0" width="84" height="100"/></clipPath></defs>
        <g class="d1" stroke="rgba(255,255,255,.07)"><path d="M8 30 H92 M8 51 H92 M8 72 H92"/></g>
        <g class="d2" clip-path="url(#lr${u})"><g class="m-slide" style="animation-duration:3s"><path d="${ties}" stroke="rgba(255,255,255,.28)" stroke-width=".8" stroke-dasharray="2 2"/>
          <path d="${wave(44, 16)}" fill="none" stroke="#8aa2f0" stroke-width="2.4" stroke-linecap="round"/><path d="${wave(58, 16)}" fill="none" stroke="#ffcf5c" stroke-width="2.4" stroke-linecap="round"/></g></g>
        <g class="d3"><g class="m-bob"><circle cx="45" cy="84" r="5.5" fill="none" stroke="#e8f0ea" stroke-width="1.8"/><circle cx="55" cy="84" r="5.5" fill="none" stroke="#e8f0ea" stroke-width="1.8"/></g></g>`;
      }
      case 'seedsearch': return `<g class="d1">${stack(28, 3)}${stack(50, 5)}${stack(72, 7)}</g>
        <g class="d3"><g class="m-scan"><circle cx="40" cy="42" r="13" fill="rgba(255,255,255,.12)" stroke="#e8f0ea" stroke-width="2.4"/><path d="M49.5 51.5 L60 62" stroke="#e8f0ea" stroke-width="4" stroke-linecap="round"/></g></g>`;
      case 'matrix': { // 3 energy cases x 6 columns (2 ceilings x 3 regimes): a scan steps across the eighteen five-year runs
        const tone = (r, c) => (r === 0 && c === 5 ? '#ff6a5c' : (r + c) % 4 === 3 ? '#ffb547' : '#3fc596');
        const cells = [0, 1, 2].map(r => [0, 1, 2, 3, 4, 5].map(c => `<rect x="${13 + c * 12.6}" y="${28 + r * 16}" width="10.6" height="12.6" rx="2" fill="${tone(r, c)}" opacity=".9"/>`).join('')).join('');
        return `<g class="d2">${cells}</g><g class="d3"><rect class="m-colsweep" x="11" y="24" width="14.6" height="52" rx="3" fill="none" stroke="#fff" stroke-width="1.6"/></g>
        ${txt(50, 90, '5 YEARS', 7, '#e8f0ea', 'letter-spacing=".8"')}`;
      }
      default: return '';
    }
  }

  function scene(id) {
    const u = ++uid;
    const holder = document.createElement('div');
    holder.innerHTML = `<svg class="step-art" data-scene="${id}" viewBox="0 0 100 133" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${defs(u)}
      <rect class="d0" x="-10" y="-10" width="120" height="153" fill="url(#ah${u})"/>${body(id, u)}
      <rect width="100" height="133" fill="url(#gl${u})"/><rect class="sweep" x="0" y="0" width="60" height="133" fill="url(#sw${u})"/></svg>`;
    return holder.firstElementChild;
  }

  /* ── mounting ─────────────────────────────────────── */
  function mount(w, tabId) {
    io?.disconnect(); io = null; wrap = w || null;
    if (!wrap) return;
    if (!styled) { const s = document.createElement('style'); s.id = 'art-style'; s.textContent = CSS; document.head.appendChild(s); styled = true; }
    wrap.classList.add('has-hall', 'has-art'); // has-hall keeps the gallery layout of tall cards from shared.css
    const nodes = wrap.querySelectorAll('.flow .node');
    const ids = (SCENES[tabId]?.length === nodes.length ? SCENES[tabId] : DEVELOPER[tabId]) || SCENES[tabId] || [];
    nodes.forEach((node, i) => {
      const ring = node.querySelector('.ring');
      if (!ring || ring.querySelector(':scope > .step-art')) return;
      ring.prepend(scene(ids[i] || ''));
      node.addEventListener('pointermove', e => {
        const r = ring.getBoundingClientRect();
        ring.style.setProperty('--px', Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)).toFixed(3));
        ring.style.setProperty('--py', Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)).toFixed(3));
      });
      node.addEventListener('pointerleave', () => { ring.style.removeProperty('--px'); ring.style.removeProperty('--py'); });
    });
    if ('IntersectionObserver' in window) { const target = wrap; io = new IntersectionObserver(([e]) => target.classList.toggle('art-rest', !e.isIntersecting)); io.observe(target); }
    if (last) update(last);
  }

  // The live pictures: called on every refresh with the numbers of the page on show.
  function update(st) {
    last = st;
    if (!wrap) return;
    const q = s => wrap.querySelectorAll(`.step-art[data-scene="${s}"]`);
    const gap = Number(st.gap) || 0;
    const a = Math.max(-11, Math.min(11, -gap / 70)); // biodiesel dearer (gap below zero): the palm side goes down
    q('balance').forEach(s => { s.style.setProperty('--tilt', `${a.toFixed(2)}deg`); s.style.setProperty('--lift', `${(34 * Math.sin((a * Math.PI) / 180)).toFixed(2)}px`); });
    const [flag, glyph] = gap > 0 ? ['#5fd394', '✓'] : gap < 0 ? ['#ffb547', '!'] : ['#b8c2bd', '='];
    q('signal').forEach(s => { s.style.setProperty('--flag', flag); const t = s.querySelector('.glyph'); if (t && t.textContent !== glyph) t.textContent = glyph; });
    q('fundcheck').forEach(s => { s.dataset.ok = String(Boolean(st.fundSafe)); });
    q('stamp').forEach(s => {
      const on = Boolean(st.auth);
      if (on && s.dataset.on === 'false') { s.classList.remove('pressing'); void s.getBoundingClientRect(); s.classList.add('pressing'); }
      s.dataset.on = String(on);
    });
    const m = ['B15', 'B20', 'B30'].includes(st.mandate) ? st.mandate : 'B20';
    q('ladder').forEach(s => {
      s.querySelectorAll('.rung').forEach(r => r.classList.toggle('on', r.dataset.m === m));
      s.querySelector('.marker').style.transform = `translateY(${{ B30: 25, B20: 49, B15: 73 }[m]}px)`;
    });
    const share = { B15: 0.15, B20: 0.2, B30: 0.3 }[m];
    q('blend').forEach(s => {
      s.querySelector('.gold').style.transform = `scaleY(${((4 + 71 * share) / 25.3).toFixed(3)})`;
      const lbl = s.querySelector('.lbl'), sub = s.querySelector('.sub');
      if (lbl.textContent !== m) lbl.textContent = m;
      const pct = `${Math.round(share * 100)}% palm`; if (sub.textContent !== pct) sub.textContent = pct;
    });
    const fill = Math.max(0.06, Math.min(1, Number(st.capture) || 0));
    q('share').forEach(s => s.style.setProperty('--fill', fill.toFixed(3)));
  }

  return { mount, update, scenes: SCENES, developer: DEVELOPER };
})();
