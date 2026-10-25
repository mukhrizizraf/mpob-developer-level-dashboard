// Journey guide: Home is a camera move that only runs when you scroll or press Play, and first-time visitors did not know
// that (on a phone there was no hint at all). A "slide to start" control now waits on the first screen of the journey:
// slide the knob across, tap it, or press Enter, and the journey plays by itself with its sound. If someone stops part-way,
// a small hint after a few quiet seconds says how to carry on, with a Play button. Any scroll, swipe or key still takes over,
// exactly as before. Self-contained (own CSS); under Reduce motion the journey is a still picture and the guide stays away.
// API: GUIDE.start() (runs itself)  GUIDE.state

const GUIDE = (() => {
  const coarse = () => Boolean(window.matchMedia?.('(pointer: coarse)').matches);
  const CSS = `
.guide { position: absolute; z-index: 4; left: 50%; bottom: max(30px, env(safe-area-inset-bottom, 0px)); translate: -50% 0; display: grid; justify-items: center; gap: 10px;
  transition: opacity .45s ease, translate .6s cubic-bezier(.2, .9, .3, 1.1); }
.guide.gone { opacity: 0; translate: -50% 18px; pointer-events: none; }
.guide-track { position: relative; width: min(300px, calc(100vw - 48px)); height: 60px; border-radius: 999px; overflow: hidden;
  background: rgba(10, 16, 22, .55); border: 1px solid rgba(255, 230, 170, .35); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 18px 40px -18px rgba(0, 0, 0, .8), 0 0 0 6px rgba(240, 190, 80, .06); }
.guide-fill { position: absolute; inset: 0 auto 0 0; width: 60px; border-radius: 999px; background: linear-gradient(90deg, rgba(240, 185, 56, .0), rgba(240, 185, 56, .35)); }
.guide-text { position: absolute; inset: 0; display: grid; place-items: center; padding-left: 52px; font: 600 15px/1 var(--font, system-ui); letter-spacing: .02em; white-space: nowrap;
  color: transparent; background: linear-gradient(100deg, rgba(255, 246, 225, .45) 30%, #fffaf0 50%, rgba(255, 246, 225, .45) 70%); background-size: 220% 100%;
  -webkit-background-clip: text; background-clip: text; animation: guideShine 2.6s linear infinite; pointer-events: none; }
@keyframes guideShine { from { background-position: 120% 0; } to { background-position: -120% 0; } }
.guide-knob { position: absolute; left: 5px; top: 5px; width: 50px; height: 50px; border: 0; border-radius: 50%; padding: 0; cursor: grab; touch-action: none;
  display: grid; place-items: center; color: #2a1a00; background: radial-gradient(circle at 35% 30%, #ffe7a3, #f0b938 55%, #b9770c);
  box-shadow: 0 6px 18px rgba(240, 185, 56, .45), inset 0 1px 0 rgba(255, 255, 255, .6); }
.guide-knob:active { cursor: grabbing; }
.guide-knob:focus-visible { outline: 3px solid #fffaf0; outline-offset: 3px; }
.guide-knob svg { width: 22px; height: 22px; }
.guide:not(.dragging) .guide-knob { animation: guideNudge 2.4s cubic-bezier(.45, 0, .25, 1) infinite; }
@keyframes guideNudge { 0%, 55%, 100% { transform: translateX(0); } 70% { transform: translateX(16px); } 82% { transform: translateX(0); } 90% { transform: translateX(6px); } }
.guide.returning .guide-knob, .guide.returning .guide-fill { transition: transform .5s cubic-bezier(.34, 1.56, .64, 1), width .5s cubic-bezier(.34, 1.56, .64, 1); }
.guide-sub { margin: 0; font: 500 12.5px/1.3 var(--font, system-ui); color: rgba(255, 246, 225, .7); text-align: center; text-shadow: 0 1px 8px rgba(0, 0, 0, .8); }
.guide-sub b { color: #ffe7a3; font-weight: 650; }
.guide-nudge { position: absolute; z-index: 4; left: 50%; bottom: max(26px, env(safe-area-inset-bottom, 0px)); translate: -50% 0; display: flex; align-items: center; gap: 12px;
  padding: 8px 8px 8px 16px; border-radius: 999px; background: rgba(10, 16, 22, .62); border: 1px solid rgba(255, 230, 170, .3); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  font: 600 13px/1 var(--font, system-ui); color: #fffaf0; transition: opacity .4s ease, translate .5s cubic-bezier(.2, .9, .3, 1.1); }
.guide-nudge.gone { opacity: 0; translate: -50% 14px; pointer-events: none; }
.guide-nudge .chev { width: 14px; height: 14px; border-right: 2px solid #ffe7a3; border-bottom: 2px solid #ffe7a3; rotate: 45deg; animation: guideChev 1.4s ease-in-out infinite; }
.guide-nudge.up .chev { rotate: 225deg; }
@keyframes guideChev { 0%, 100% { translate: 0 -2px; opacity: .5; } 50% { translate: 0 3px; opacity: 1; } }
.guide-nudge.up .chev { animation-name: guideChevUp; }
@keyframes guideChevUp { 0%, 100% { translate: 0 3px; opacity: .5; } 50% { translate: 0 -3px; opacity: 1; } }
.guide-play { border: 0; border-radius: 999px; padding: 8px 14px; font: 700 12.5px/1 var(--font, system-ui); letter-spacing: .04em; cursor: pointer; color: #2a1a00; background: #f0b938; }
.story:has(.guide:not(.gone)) .story-hint, .story:has(.guide-nudge:not(.gone)) .story-hint { visibility: hidden; }
@media (max-width: 760px) {
  .guide { bottom: auto; top: calc(var(--bar-h, 60px) + 70px); }
  .guide.gone { translate: -50% -14px; }
}
@media (prefers-reduced-motion: reduce) { .guide, .guide-nudge { display: none; } }
@media print { .guide, .guide-nudge { display: none !important; } }`;
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';

  let guide = null, nudge = null, styled = false, timer = 0, lastQ = -1, quiet = 0;
  const state = { shown: false, nudged: false, started: false };

  function begin() {
    state.started = true;
    guide?.classList.add('gone');
    if (typeof SOUND !== 'undefined' && !SOUND.muted) { SOUND.enable(); SOUND.start(); }
    if (typeof HOME !== 'undefined') HOME.scene?.play();
  }

  function build(stage) {
    if (!styled) { const s = document.createElement('style'); s.id = 'guide-style'; s.textContent = CSS; document.head.appendChild(s); styled = true; }
    guide = document.createElement('div');
    guide.className = 'guide gone'; guide.setAttribute('role', 'group'); guide.setAttribute('aria-label', 'Start the journey');
    guide.innerHTML = `<div class="guide-track"><i class="guide-fill"></i><span class="guide-text">Slide to start the journey</span>
      <button type="button" class="guide-knob" aria-label="Start the journey: it plays by itself">${ARROW}</button></div>
      <p class="guide-sub">${coarse() ? 'or <b>swipe up</b> to explore at your own pace' : 'or <b>scroll</b> to explore at your own pace'}</p>`;
    nudge = document.createElement('div');
    nudge.className = `guide-nudge gone${coarse() ? ' up' : ''}`;
    nudge.innerHTML = `<i class="chev" aria-hidden="true"></i><span>${coarse() ? 'Swipe up to carry on' : 'Scroll to carry on'}</span><button type="button" class="guide-play">Play</button>`;
    nudge.querySelector('.guide-play').addEventListener('click', () => { nudge.classList.add('gone'); begin(); });
    stage.append(guide, nudge);

    const knob = guide.querySelector('.guide-knob'), fill = guide.querySelector('.guide-fill'), track = guide.querySelector('.guide-track');
    let x0 = 0, dx = 0, dragging = false, moved = false;
    const max = () => track.clientWidth - knob.offsetWidth - 10;
    const place = x => { knob.style.transform = `translateX(${x}px)`; fill.style.width = `${x + 60}px`; guide.querySelector('.guide-text').style.opacity = String(1 - Math.min(1, x / (max() * 0.6)));
      if (typeof SOUND !== 'undefined') SOUND.slide(x / Math.max(1, max())); }; // kalimba notes climb with the knob
    knob.addEventListener('pointerdown', e => {
      dragging = true; moved = false; x0 = e.clientX; dx = 0;
      guide.classList.add('dragging'); guide.classList.remove('returning');
      knob.setPointerCapture(e.pointerId); e.preventDefault();
    });
    knob.addEventListener('pointermove', e => {
      if (!dragging) return;
      dx = Math.max(0, Math.min(max(), e.clientX - x0)); if (dx > 4) moved = true;
      place(dx);
    });
    const release = () => {
      if (!dragging) return; dragging = false; guide.classList.remove('dragging');
      if (!moved || dx > max() * 0.7) { place(max()); setTimeout(begin, 140); return; } // a tap, or slid most of the way
      guide.classList.add('returning'); place(0);
    };
    knob.addEventListener('pointerup', release);
    knob.addEventListener('pointercancel', release);
    knob.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(max()); setTimeout(begin, 140); } });
    knob.addEventListener('click', e => { if (e.detail === 0) begin(); }); // keyboard activation that arrives as a click
  }

  function reset() {
    if (!guide) return;
    guide.classList.remove('returning', 'dragging');
    const knob = guide.querySelector('.guide-knob'); knob.style.transform = '';
    guide.querySelector('.guide-fill').style.width = ''; guide.querySelector('.guide-text').style.opacity = '';
  }

  function tick() {
    const stage = document.querySelector('#page .story .story-stage');
    const st = typeof HOME !== 'undefined' ? HOME.scene?.story : null;
    if (!stage || !st) { guide = guide?.isConnected ? guide : null; return; }
    if (!guide || !stage.contains(guide)) build(stage);
    const q = Number(st.progress) || 0;
    const showGuide = !st.auto && !st.still && q < 0.02;
    if (showGuide && guide.classList.contains('gone')) reset();
    guide.classList.toggle('gone', !showGuide); state.shown = showGuide;
    quiet = Math.abs(q - lastQ) < 0.0005 ? quiet + 0.25 : 0; lastQ = q;
    const showNudge = !st.auto && !st.still && q >= 0.02 && q < 0.97 && quiet >= 5;
    nudge.classList.toggle('gone', !showNudge); state.nudged = showNudge;
  }

  function start() { if (!timer) timer = setInterval(tick, 250); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start);
  return { start, state, begin };
})();
