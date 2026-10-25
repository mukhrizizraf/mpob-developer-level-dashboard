// Visual + interaction check with headless Chrome/Edge over CDP (no npm packages needed).
//   node shoot.mjs [outDir]          (SCHEME=dark for dark mode)
// Walks every tab and step, then checks the code-review acceptance criteria: input drafts, reset scopes,
// snapshot labelling, phone layout, Lottie lifecycle, keyboard tabs, live reduced motion, print, swipe, themes.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const page = join(here, existsSync(join(here, '../V3_DASHBOARD_APP')) ? '../MPOB_Mandate_Decision_Studio_developer_level.html' : 'index.html');
const outDir = process.argv[2] ?? join(tmpdir(), 'mpob-developer-level-shots');
mkdirSync(outDir, { recursive: true });
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
const port = 9333 + Math.floor(Math.random() * 400);
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, '--no-first-run', '--disable-gpu', `--user-data-dir=${join(tmpdir(), `mpob-cdp-${port}`)}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let targets;
for (let i = 0; i < 50 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const problems = [];
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') problems.push(`EXCEPTION ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) problems.push(`CONSOLE ${msg.params.type}: ${msg.params.args.map(a => a.value ?? a.description).join(' ')}`);
});
const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const run = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) problems.push(`EVAL ${r.result.exceptionDetails.exception?.description ?? expr}`); return r.result?.result?.value; };
let W = 1440;
async function size(width, height = 900) { W = width; await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 }); await sleep(250); }
async function shot(name, full = true) {
  const height = full ? await run('Math.ceil(document.documentElement.scrollHeight)') : 900;
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: Math.min(height, 6000), deviceScaleFactor: 1, mobile: W < 600 });
  await sleep(150);
  const { result } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(result.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: W < 600 });
}
const media = (features, type = '') => send('Emulation.setEmulatedMedia', { media: type, features });
const scheme = process.env.SCHEME ?? 'light';

await send('Runtime.enable'); await send('Page.enable'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await media([{ name: 'prefers-color-scheme', value: scheme }]);
await size(1440);
await send('Page.navigate', { url: pathToFileURL(page).href });
await sleep(1500);
await run(`localStorage.clear(); history.replaceState(null, '', location.pathname); true`);
await send('Page.reload');
// Wait for the app itself, not a fixed delay: a large page on a slow machine takes longer to start.
for (let i = 0; i < 100 && !(await run("typeof S !== 'undefined' && document.readyState === 'complete'")); i++) await sleep(100);
await sleep(200);

const click = sel => run(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'missing ' + ${JSON.stringify(sel)}; el.click(); return 'ok'; })()`);
const text = sel => run(`document.querySelector(${JSON.stringify(sel)})?.textContent?.trim()`);
const slide = (key, value) => run(`(() => { const el = document.querySelector('.stage:not(.is-leaving) [data-range="${key}"]'); if (!el) return 'missing'; el.value = ${value}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return 'ok'; })()`);
const key = (k, code = k) => send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: { Enter: 13, Escape: 27, ArrowRight: 39, ArrowLeft: 37, Tab: 9, Home: 36, End: 35 }[k] ?? 0 }).then(() => send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code }));
async function typeInto(numKey, value) {
  await run(`document.querySelector('.stage:not(.is-leaving) [data-num="${numKey}"]').focus()`);
  await run(`(() => { const el = document.activeElement; el.value = ${JSON.stringify(value)}; return true; })()`);
}
const checks = [];
const expect = (label, actual, wanted) => checks.push(`${actual === wanted ? 'PASS' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${actual === wanted ? '' : ` (wanted ${JSON.stringify(wanted)})`}`);
const go = async (tab, step) => { await click(`.tab[data-tab="${tab}"]`); await sleep(900); if (step !== undefined) { await click(`.node[data-go="${step}"]`); await sleep(700); } };

// 0 · Home: opens first, straight into the journey (no preloader), and is the journey only: one long camera move, few words
expect('Home opens first', await run('S.tab'), 'home');
expect('No preloader count stands in front of the page', await run(`document.querySelectorAll('.hive-intro-ui').length + (document.documentElement.classList.contains('hive-intro') ? 1 : 0)`), 0);
await sleep(1500);
expect('The swarm layer covers the whole screen', await run(`(() => { const r = document.querySelector('#hive-layer canvas').getBoundingClientRect(); return Math.abs(r.width - document.documentElement.clientWidth) < 1 && Math.abs(r.height - document.documentElement.clientHeight) < 1; })()`), true);
expect('Home is the journey only: no hero text, swarm hero, cards or pour scene', await run(`document.querySelectorAll('#page [data-home-hive], #page .home-title, #page .home-card, #page .pour').length`), 0);
expect('The page title stays for screen readers', await run(`document.querySelector('#page h1.sr-only')?.textContent === TABS[0].title`), true);
expect('The journey starts at the top, under the top bar', await run(`Math.round(document.querySelector('#page [data-story]').getBoundingClientRect().top + scrollY)`), 0);
expect('The top bar turns to night glass over the journey', await run(`document.documentElement.classList.contains('story-under-bar')`), true);
await shot('home', false);
// The journey: one long camera move with six screens of copy
const storyAt = p => run(`(() => { const s = document.querySelector('#page [data-story]'), r = s.getBoundingClientRect(), span = r.height - s.querySelector('.story-stage').clientHeight; scrollTo({ top: scrollY + r.top + ${p} * span, behavior: 'instant' }); })()`);
expect('Six screens of copy and six chapter buttons', await run(`document.querySelectorAll('#page [data-ss]').length + ':' + document.querySelectorAll('#page [data-story-go]').length`), '6:6');
await storyAt(0); await sleep(1000);
expect('The journey opens through a closed keyhole', (await run('HOME.scene.story.open')) < 0.05, true);
expect('The stage is pinned to the screen', await run(`Math.round(document.querySelector('#page .story-stage').getBoundingClientRect().top)`), 0);
await shot('home-story-keyhole', false);
await storyAt(0.09); await sleep(1600);
expect('Scrolling on opens the keyhole', (await run('HOME.scene.story.open')) > 0.99, true);
const sf0 = await run('HOME.scene.story.frames'); await sleep(600);
expect('The journey keeps moving', (await run('HOME.scene.story.frames')) > sf0, true);
expect('Only the first screen of copy shows', await run(`[...document.querySelectorAll('#page [data-ss]')].map(e => Number(getComputedStyle(e).opacity) > 0.5 ? 1 : 0).join('')`), '100000');
await shot('home-story-1', false);
await click('#page [data-story-go="3"]');
for (let i = 0; i < 40 && (await run('HOME.scene.story.chapter')) !== 3; i++) await sleep(150);
await sleep(1600);
expect('A chapter button travels to that chapter', await run('HOME.scene.story.chapter'), 3);
expect('Its screen of copy shows', await run(`Number(getComputedStyle(document.querySelector('#page [data-ss="3"]')).opacity) > 0.9`), true);
expect('The chapter count follows', await text('#page [data-story-n]'), '04');
expect('The chapter button is marked current', await run(`document.querySelector('#page [data-story-go][aria-current]')?.dataset.storyGo`), '3');
await shot('home-story-4', false);
await storyAt(0.45); await sleep(1800); await shot('home-story-3', false);
await storyAt(0.76); await sleep(1800); await shot('home-story-5', false);
// Play: the journey runs without scrolling; any wheel, touch or key hands it back
await storyAt(0.2); await sleep(900);
await click('#page [data-story-play]'); await sleep(200);
expect('Play runs the journey by itself', await run('HOME.scene.story.auto'), true);
const pp0 = await run('HOME.scene.story.progress'); await sleep(1500);
expect('Playing moves the camera on', (await run('HOME.scene.story.progress')) > pp0 + 0.005, true);
expect('The Play button turns into Pause', await text('#page [data-story-play] span'), 'Pause');
await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 400, y: 400, deltaX: 0, deltaY: 40 }); await sleep(200);
expect('A wheel hands control back', await run('HOME.scene.story.auto'), false);
await storyAt(1); await sleep(2000);
expect('The last screen invites the next call', await run(`Number(getComputedStyle(document.querySelector('#page [data-ss="5"]')).opacity) > 0.9`), true);
expect('The page ends in the same night', await run(`document.documentElement.classList.contains('home-night-end') && getComputedStyle(document.querySelector('footer.foot')).backgroundColor`), 'rgb(1, 5, 10)');
await shot('home-story-end', false);
expect('The MPOB and UKM marks sit on the last screen', await run(`document.querySelectorAll('#page [data-ss="5"] .hive-sponsors img, #page [data-ss="5"] .hive-sponsors .sp-word').length`), 2);
await storyAt(0.75); await sleep(1600);
await click('#page [data-ss="4"] button[data-tab="obj2"]'); await sleep(1200);
expect('A link in the journey opens its objective', await run('S.tab + ":" + S.step.obj2'), 'obj2:0');
expect('Leaving Home ends the night footer and the night top bar', await run(`['home-night-end', 'story-under-bar', 'home-on'].some(c => document.documentElement.classList.contains(c))`), false);
// The swarm carries on as the background of every other page, in the colour of the step on show
expect('The swarm becomes the page background', await run('document.querySelector("#hive-layer").classList.contains("is-on")'), true);
await sleep(1500);
expect('The swarm writes the step in hand under the objective', await run('HOME.scene.words + ":" + HOME.scene.writing'), 'See how fund moves:true');
await shot('obj2-swarm-words', false);
expect('Every step box shows a drawn picture of its step', await run("document.querySelectorAll('#page .flow-wrap.has-art').length + ':' + document.querySelectorAll('#page .node .ring > .step-art').length"), '1:' + await run("document.querySelectorAll('#page .node').length"));
expect('The pictures move', await run("[...document.querySelectorAll('#page .step-art')].every(s => s.getAnimations({ subtree: true }).length > 0)"), true);
expect('Each card carries its number and value, not a ring arrow', await run("getComputedStyle(document.querySelector('#page .has-hall .ring'), '::after').display"), 'none');
await click('.node[data-go="1"]'); await sleep(1800);
expect('A new step: the swarm writes its words', await run('HOME.scene.words'), 'Choose oil-price case');
await run("document.body.style.paddingBottom = '1600px'; window.scrollTo(0, 1e6)"); await sleep(900); // room to scroll the band away on a short step
expect('Scrolled on, the words break up into the background', await run('HOME.scene.roaming'), true);
await run("document.body.style.paddingBottom = ''; window.scrollTo(0, 0)"); await sleep(600);
const bf0 = await run('HOME.scene.frames'); await sleep(700);
expect('The background keeps moving', (await run('HOME.scene.frames')) > bf0, true);
expect('The background takes the step colour', await run('HOME.scene.tint'), await run(`(() => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = getComputedStyle(document.getElementById('page')).getPropertyValue('--accent').trim(); const m = /^#(..)(..)(..)$/.exec(c.fillStyle); return m ? \`rgb(\${[1, 2, 3].map(k => parseInt(m[k], 16)).join(', ')})\` : null; })()`));
expect('The old ambient glow gives way to the swarm', await run(`getComputedStyle(document.getElementById('aurora')).display`), 'none');
await shot('obj2-swarm', false);
await click('[data-home-pause]'); await sleep(150); const fp = await run('HOME.scene.frames'); await sleep(500);
expect('Pause in the top bar stops the swarm', await run('HOME.scene.frames'), fp);
await click('[data-home-pause]'); await sleep(500);
expect('Play restarts it', (await run('HOME.scene.frames')) > fp, true);
await go('home'); await sleep(1500);
await storyAt(0.58); await sleep(1600);
await click('#page [data-ss="3"] button[data-tab="obj4"][data-step="1"]'); await sleep(1200);
expect('A step link in the journey opens that exact step', await run('S.tab + ":" + S.step.obj4'), 'obj4:1');

// 1 · Tour every step
const tabs = { obj1: 6, obj2: 6, obj3: 5, obj4: 7, decision: 4 };
for (const [tab, steps] of Object.entries(tabs)) {
  await go(tab);
  for (let s = 0; s < steps; s++) { await click(`.node[data-go="${s}"]`); await sleep(750); await shot(`${tab}-step${s + 1}`); }
}
const nanCount = await run(`[...document.querySelectorAll('[data-out]')].filter(el => /NaN|undefined/.test(el.textContent)).length`);
expect('No NaN/undefined in outputs on the last step', nanCount, 0);

// 2 · CR01: invalid text and Escape never change the model; a valid Enter commits once
await go('obj1', 0);
await typeInto('mops', 'abc'); await run(`document.activeElement.blur()`); await sleep(200);
expect('CR01 "abc" leaves MOPS unchanged', await run('S.mops'), 4004.93);
expect('CR01 "abc" shows a field error', await run(`!document.querySelector('.stage:not(.is-leaving) .field-error').hidden`), true);
await typeInto('mops', '1.2.3'); await key('Enter'); await sleep(150);
expect('CR01 malformed decimal rejected', await run('S.mops'), 4004.93);
await run(`document.activeElement.blur()`);
await typeInto('mops', '4500'); await key('Escape'); await sleep(150);
expect('CR01 Escape cancels the draft', await run('S.mops'), 4004.93);
await typeInto('mops', '9999'); await key('Enter'); await sleep(150);
expect('CR01 out-of-range value rejected', await run('S.mops'), 4004.93);
await run(`document.activeElement.blur()`);
await typeInto('mops', 'RM 4,500/t'); await key('Enter'); await sleep(200);
expect('CR01 valid Enter commits', await run('S.mops'), 4500);
expect('CR04 edited MOPS is labelled as your scenario', (await text('.stage:not(.is-leaving) [data-out="mopsSub"]'))?.startsWith('per tonne · your scenario'), true);
await click('.stage:not(.is-leaving) [data-reset="mops"]'); await sleep(150);

// 3 · CR02: focus and blur without editing creates no override; OBJ1 edits still flow in
await go('decision', 0);
await run(`document.querySelector('.stage:not(.is-leaving) [data-num="dec.mops"]').focus()`); await sleep(80); await run(`document.activeElement.blur()`); await sleep(150);
expect('CR02 unchanged blur creates no override', await run('Object.keys(S.dec).length'), 0);
await go('obj1', 0); await slide('mops', 5000); await sleep(200);
expect('CR02 OBJ1 change still reaches Decision', await run('decisionControls().mops'), 5000);

// 4 · CR03: reset scopes do what they say
await go('decision', 0); await slide('dec.mops', 5100); await sleep(200);
await go('decision', 3);
await click('[data-use-objectives]'); await sleep(200);
expect('CR03 "Use the objective settings" returns to OBJ1 value', await run('decisionControls().mops'), 5000);
await click('.reset-row [data-restore]'); await sleep(200);
expect('CR03 "Restore the reviewed snapshot" restores MOPS', await run('decisionControls().mops'), 4004.93);
expect('CR03 changed indicator clears', await run(`document.getElementById('scenario').hidden`), true);
expect('Baseline blend is B20', await text('.stage:not(.is-leaving) .verdict-blend'), 'B20');

// 5 · Rule checks still match V3
await go('obj1', 0); await slide('mops', 4800); await go('obj1', 2);
expect('OBJ1 gap after diesel RM4,800', await text('.stage:not(.is-leaving) .eq-term.result strong'), '+RM 149.06/t');
await go('obj4', 2); await click('[data-switch="b30Auth"]'); await sleep(200); await click('.node[data-go="3"]'); await sleep(900);
expect('OBJ4 positive gap + approval gives B30', await text('.stage:not(.is-leaving) .verdict-blend'), 'B30');
await shot('obj4-step4-B30');
await go('decision', 0); await slide('dec.mops', 1500); await slide('dec.pme', 2100); await click('.node[data-go="1"]'); await sleep(600); await slide('dec.fund', 0);
await click('.node[data-go="3"]'); await sleep(900);
expect('Decision deep-stress case is B15', await text('.stage:not(.is-leaving) .verdict-blend'), 'B15');
await shot('decision-step4-B15');
await click('.reset-row [data-restore]'); await sleep(300);

// 6 · CR12: untested choice is neither zero nor failure; OBJ2 numbers
await go('obj2', 2); await click('[data-set="horizon"][data-val="9"]'); await sleep(200);
await click('.node[data-go="4"]'); await sleep(900);
expect('OBJ2 9-month low-oil six-month survival', await text('.stage:not(.is-leaving) .gauge strong'), '32.0%');
await run(`set('capture', 0.5)`); await sleep(200);
expect('CR12 untested share shows "Not tested"', await text('.stage:not(.is-leaving) .gauge strong'), 'Not tested');
expect('CR12 untested share has no failure colour', await run(`document.querySelector('.stage:not(.is-leaving) .bar > i').dataset.state`), 'na');
await run(`set('capture', 1); set('horizon', '60')`);

// 7 · CR05: funding is labelled by period, never "money available"
await go('obj3', 4);
expect('OBJ3 levy + savings at RM25/t, 100%', await text('.stage:not(.is-leaving) [data-out="fundingEstimate"]'), 'RM 227.4 mn');
expect('CR05 no "Money available" wording', await run(`!document.body.innerText.includes('Money available')`), true);

// 8 · CR10: Lottie instances settle to what is mounted
await go('decision', 3); await sleep(600);
const before = await run('lottie.getRegisteredAnimations().length');
for (let i = 0; i < 10; i++) { await click('.node[data-go="2"]'); await sleep(450); await click('.node[data-go="3"]'); await sleep(450); }
await sleep(800);
expect('CR10 Lottie registrations do not grow with navigation', await run('lottie.getRegisteredAnimations().length'), before);
expect('CR10 every registered animation is mounted', await run(`lottie.getRegisteredAnimations().every(a => a.wrapper.isConnected && !a.wrapper.closest('.is-leaving'))`), true);

// 9 · CR11: tabs are a real tablist with arrow keys
await run(`document.getElementById('tab-obj1').click(); document.getElementById('tab-obj1').focus()`); await sleep(400);
await key('ArrowRight'); await sleep(300);
expect('CR11 ArrowRight on a tab selects the next tab', await run('S.tab'), 'obj2');
expect('CR11 focus follows the selected tab', await run('document.activeElement.id'), 'tab-obj2');
expect('CR11 roving tabindex', await run(`[...document.querySelectorAll('[role=tab]')].filter(t => t.tabIndex === 0).length`), 1);
expect('CR11 panel is labelled by its tab', await run(`document.getElementById('page').getAttribute('aria-labelledby')`), 'tab-obj2');
expect('CR11 stage is not a live region', await run(`document.querySelectorAll('.stage[aria-live]').length`), 0);

// 10 · Swipe: drag the step card left to advance, with momentum
await go('obj1', 0);
for (let i = 0; i < 40 && await run("document.getElementById('fold-layer').children.length + document.querySelectorAll('.stage.is-leaving').length"); i++) await sleep(100); // start from a settled page
await run("document.querySelector('.stage:not(.is-leaving)').scrollIntoView({ block: 'center' })"); await sleep(400); // the card sits below the step hall, so bring it on screen first
const box = await run(`(() => { const r = document.querySelector('.stage:not(.is-leaving) .stage-head').getBoundingClientRect(); return [r.left + r.width * 0.7, r.top + r.height / 2]; })()`);
await run("window._sw = []; ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, e => window._sw.push(t[7] + Math.round(e.clientX)), { capture: true }))");
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box[0], y: box[1], button: 'left', clickCount: 1 });
for (let k = 1; k <= 8; k++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box[0] - k * 60, y: box[1] + 2, button: 'left', buttons: 1 }); await sleep(16); }
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box[0] - 480, y: box[1] + 2, button: 'left', clickCount: 1 }); await sleep(1600);
expect('Swipe left advances one step', await run('S.step.obj1'), 1);
if (checks.at(-1).startsWith('FAIL')) checks.push('INFO swipe events ' + await run('window._sw.join(" ")') + ' fold ' + await run("document.getElementById('fold-layer').children.length"));
await shot('obj1-after-swipe', false);

// Developer · CR07: a collapsed card's inputs are not reachable
const live = sel => '.stage:not(.is-leaving) ' + sel;
const cardBy = title => "[...document.querySelectorAll('.stage:not(.is-leaving) .dcard')].find(c => c.textContent.includes('" + title + "'))";
await go('obj3', 4); await sleep(500);
await click(live('[data-stack-toggle]')); await sleep(700);
expect('CR07 WPL input inert while its card is collapsed', await run("Boolean(document.querySelector('.stage:not(.is-leaving) [data-range=\"wplCpo\"]').closest('[inert]'))"), true);
await run("document.querySelector('.stage:not(.is-leaving) [data-range=\"wplCpo\"]').focus()");
expect('CR07 focus cannot land in a collapsed card', await run("document.activeElement?.dataset?.range ?? 'none'"), 'none');
await run(cardBy('WPL · baseline') + ".querySelector('[data-card-toggle]').click()"); await sleep(700);
expect('CR07 expanding the card exposes its controls', await run("!document.querySelector('.stage:not(.is-leaving) [data-range=\"wplCpo\"]').closest('[inert]')"), true);
expect('CR07 card header reports expanded', await run(cardBy('WPL · baseline') + ".querySelector('[data-card-toggle]').getAttribute('aria-expanded')"), 'true');
await shot('dev-obj3-stack-open');
// CR13: constant shown and terms reconcile
await go('obj1', 1); await click(live('[data-stack-toggle]')); await sleep(700);
const terms = await run("[...document.querySelectorAll('.stage:not(.is-leaving) .build b')].map(b => b.textContent)");
expect('CR13 build-up lists the constant', terms?.length, 5);
const val = t => { const neg = /−|-/.test(t); const n = Number(String(t).replace(/[^0-9.]/g, '')); return neg ? -n : n; };
expect('CR13 terms reconcile to fitted PME within RM 0.02', Math.abs(terms.slice(0, 4).reduce((a, t) => a + val(t), 0) - val(terms[4])) < 0.02, true);
expect('CR13 methanol from the master input', await run('S.methanol'), 1647.041175);
// CR14: VaR and CVaR have separate definitions
await go('obj2', 4); await click(live('[data-stack-toggle]')); await sleep(600);
expect('CR14 VaR labelled as the 95th-percentile requirement', await run("document.querySelector('.stage:not(.is-leaving)').textContent.includes('95th-percentile support requirement (VaR 95%)')"), true);
expect('CR14 CVaR labelled as the tail average', await run("document.querySelector('.stage:not(.is-leaving)').textContent.includes('Average support in the worst 5% of paths (CVaR 95%)')"), true);
// CR15: source inspector
await run("document.querySelector('.foot [data-prov-open]').click()"); await sleep(500);
expect('CR15 source inspector opens', await run("document.getElementById('prov').open"), true);
await run("document.querySelector('#prov [data-prov=\"rq1_monthly\"]').click()"); await sleep(400);
expect('CR15 inspector shows the query rows', await run("document.querySelectorAll('#prov .prov-rows tbody tr').length"), 196);
expect('CR15 inspector shows the snapshot fingerprint', await run("/[0-9a-f]{64}/.test(document.getElementById('prov-body').textContent)"), true);
await shot('dev-provenance', false);
await key('Escape'); await sleep(500);
expect('CR15 Escape closes the inspector', await run("document.getElementById('prov').open"), false);
// CR16: three named runs; a missing run is never replaced
await go('obj4', 4);
expect('CR16 three geopolitical choices', await run("document.querySelectorAll('.stage:not(.is-leaving) [data-set=\"geo\"]').length"), 3);
await click('[data-set="geo"][data-val="ME spike/decay"]'); await sleep(300);
expect('CR16 run label follows the choice', (await text(live('[data-out="mRun"]')))?.includes('ME spike/decay'), true);
await run("set('energy', 'Nonexistent')"); await sleep(200);
expect('CR16 missing run shows "No saved run"', await text(live('[data-out="mMean"]')), 'No saved run');
await run("set('energy', 'Baseline'); set('geo', 'Normal')");
// CR17: keyboard chart read-out and data table
await go('obj1', 0); await click(live('[data-stack-toggle]')); await sleep(600);
await run("document.querySelector('.stage:not(.is-leaving) .dcard [data-card-toggle]').click()"); await sleep(600);
await run("document.querySelector('.stage:not(.is-leaving) [data-chart]').focus()"); await sleep(200);
await key('Home'); await sleep(150);
expect('CR17 keyboard reads the first point', await text('#tip b'), '2010-01');
await key('ArrowRight'); await sleep(150);
expect('CR17 arrow key moves one point', await text('#tip b'), '2010-02');
expect('CR17 chart has a data table', await run("document.querySelectorAll('.stage:not(.is-leaving) .chart-data tbody tr').length"), 196);
await shot('dev-chart-keyboard', false);
// No "undefined" card icons (ICON.link was missing before)
await go('decision', 0); await click(live('[data-stack-toggle]')); await sleep(500);
expect('Decision detail card icons render', await run("[...document.querySelectorAll('.stage:not(.is-leaving) .dcard-ico')].filter(e => !e.querySelector('svg')).length"), 0);

// 11 · Themes
expect('Six looks offered', await run('THEME.themes.map(t => t.id).join()'), 'system,dark,bloom,tonal,citrus,mono');
expect('No "inspired by" wording in the selector', await run(`/inspired|iphone|ipad/i.test(document.getElementById('theme-pop').textContent)`), false);
for (const t of ['dark', 'bloom', 'tonal', 'citrus', 'mono']) {
  await run(`THEME.choose('${t}')`); await sleep(700);
  await shot(`look-${t}`, false);
  const looks = await run(`(() => { const g = s => getComputedStyle(document.querySelector(s)); return [g('.stage:not(.is-leaving) .btn-primary').borderRadius, g('#page .node .ring').borderRadius, g('#page .disc svg').strokeWidth].join(' | '); })()`);
  checks.push(`INFO look ${t}: button radius | ring radius | icon stroke = ${looks}`);
}
expect('Looks change shapes, not only colour', await run(`(() => { const r = []; for (const t of ['bloom', 'citrus']) { document.documentElement.dataset.theme = t; r.push(getComputedStyle(document.querySelector('#page .node .ring')).borderRadius); } document.documentElement.dataset.theme = 'mono'; return r[0] !== r[1]; })()`), true);
await run(`THEME.choose('mono')`); await sleep(300);
expect('Theme applied to the root', await run(`document.documentElement.dataset.theme`), 'mono');
await go('home'); await sleep(600); await shot('home-mono', false);
await run(`THEME.choose('dark')`); await sleep(700); await shot('home-dark', false);
await go('obj1', 0);
await run(`THEME.choose('system')`); await sleep(500);

// 12 · Phones: status stays readable, no overlap, no horizontal scroll
for (const width of [375, 320]) {
  await size(width, 800);
  await go('obj3', 4); await sleep(600);
  await shot(`mobile-${width}-obj3-compare`);
  expect(`${width}px snapshot status visible`, await run(`(() => { const s = document.querySelector('.status .status-short'); return Boolean(s && s.offsetWidth > 0); })()`), true);
  expect(`${width}px compare cells do not overflow`, await run(`[...document.querySelectorAll('table.compare tbody td, table.compare tbody th')].filter(el => el.scrollWidth > el.clientWidth + 1).length`), 0);
  expect(`${width}px no horizontal page scroll`, await run('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await go('decision', 3); await sleep(600); await shot(`mobile-${width}-decision`);
  await go('home'); await sleep(900); await shot(`mobile-${width}-home`);
  expect(`${width}px journey header stays on one line`, await run(`document.querySelector('#page .story-top').offsetHeight < 40`), true);
  await run(`(() => { const s = document.querySelector('#page [data-story]'), r = s.getBoundingClientRect(), span = r.height - s.querySelector('.story-stage').clientHeight; scrollTo({ top: scrollY + r.top + 0.58 * span, behavior: 'instant' }); })()`); await sleep(1600);
  expect(`${width}px journey words fit below the chapter bar`, await run(`(() => { const b = document.querySelector('#page [data-ss="3"]').getBoundingClientRect(), r = document.querySelector('#page .story-rail').getBoundingClientRect(); return b.top >= r.bottom && b.bottom <= innerHeight + 1; })()`), true);
  expect(`${width}px journey has no horizontal scroll`, await run('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await shot(`mobile-${width}-journey`, false);
  await run('window.scrollTo(0, 0)'); await sleep(600);
  expect(`${width}px home has no horizontal scroll`, await run('document.documentElement.scrollWidth <= window.innerWidth'), true);
}
await size(812, 375); await go('obj1', 0); await shot('landscape-812-obj1', false);
await size(1440);

// 13 · CR20: reduced motion followed live
await media([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]); await sleep(200);
expect('CR20 reduced motion picked up mid-session', await run('MOTION.reduce'), true);
await go('home'); await sleep(1000);
expect('Reduce motion makes the journey a still picture and a column of words', await run(`HOME.scene.story.still && document.querySelector('#page [data-story]').offsetHeight < innerHeight * 5`), true);
await shot('home-story-still', false);
await go('obj1', 0);
await media([{ name: 'prefers-color-scheme', value: scheme }]); await sleep(200);

// 14 · A03: dark print uses light ink on white and carries the decision record
await run(`THEME.choose('mono')`); await sleep(600);
await go('decision', 3);
await run(`window.dispatchEvent(new Event('beforeprint'))`);
await media([{ name: 'prefers-color-scheme', value: 'dark' }], 'print'); await sleep(300);
expect('A03 print stage background is white', await run(`getComputedStyle(document.querySelector('.stage:not(.is-leaving)')).backgroundColor`), 'rgb(255, 255, 255)');
expect('A03 print summary has the blend', (await text('#print-summary .ps-result'))?.includes('B20'), true);
expect('A03 print keeps the snapshot status', await run(`getComputedStyle(document.getElementById('status')).display !== 'none'`), true);
await media([{ name: 'prefers-color-scheme', value: scheme }]); await run(`THEME.choose('system')`);

console.log(checks.join('\n'));
const failed = checks.filter(c => c.startsWith('FAIL')).length;
console.log(`${checks.length - failed} of ${checks.length} checks pass.`);
console.log(problems.length ? problems.join('\n') : 'No page exceptions or console errors.');
console.log(`Screenshots: ${outDir}`);
ws.close(); proc.kill();
process.exit(failed || problems.length ? 1 : 0);
