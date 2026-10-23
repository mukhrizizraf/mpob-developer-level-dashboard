// Builds the self-contained Developer-level studio:
//   node build.mjs   ->   ../MPOB_Mandate_Decision_Studio_developer_level.html   (inside the project)
//                    ->   index.html                                            (inside the GitHub repo copy)
// Data: the reviewed V3 snapshot, plus the last six rows of the V3 master-data trace (cell-provenance.json).
// Inside the project both come straight from V3; data/master-trace.json is refreshed so a standalone
// repo copy (with data/ and vendor/ beside this file) builds identically.
// Lottie player: the unmodified lottie-web 5.13.0 light build bundled with V3 (MIT).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { lottieIcons, lottieStack } from './src/lottie-icons.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const at = path => join(here, path);
const read = path => readFileSync(at(path), 'utf8');

const inProject = existsSync(at('../V3_DASHBOARD_APP'));
const snapshotPath = inProject ? '../../data/V3_DASHBOARD_SNAPSHOT.json' : 'data/V3_DASHBOARD_SNAPSHOT.json';
const lottieDir = inProject ? '../V3_DASHBOARD_APP/src/content/assets/lottie' : 'vendor/lottie';
const provenancePath = '../V3_DASHBOARD_APP/src/content/dashboard/cell-provenance.json';
const output = inProject ? '../MPOB_Mandate_Decision_Studio_developer_level.html' : 'index.html';

// Master-data trace: the latest monthly rows of the V3 master workbook, with their Excel row numbers.
if (inProject) {
  const cells = JSON.parse(read(provenancePath));
  const months = Object.entries(cells.monthly);
  const keep = ['D', 'E', 'F', 'H', 'I', 'J'];
  const trace = {
    masterFile: cells.masterFile,
    headers: Object.fromEntries(keep.map(col => [col, cells.monthlyHeaders[col]])),
    rows: months.slice(-6).map(([period, record]) => ({ period, row: record.row, ...Object.fromEntries(keep.map(col => [col, record.values[col]])) })),
  };
  writeFileSync(at('data/master-trace.json'), `${JSON.stringify(trace, null, 2)}\n`);
}
const trace = JSON.parse(read('data/master-trace.json'));

const snapshotText = read(snapshotPath);
const snapshot = JSON.parse(snapshotText);
if (trace.rows.at(-1).period !== snapshot.queries.decision_snapshot.rows[0].period) throw new Error('Master trace month does not match the snapshot month.');
const inlineJson = value => JSON.stringify(value).replace(/</g, '\\u003c');
const stripExports = source => source.replace(/^export\s+/gm, '');
const lottiePlayer = read(`${lottieDir}/lottie-light-5.13.0.mjs`).replace(/^export \{ lottie as default \};\s*$/m, 'window.lottie = lottie;');
if (!lottiePlayer.includes('window.lottie = lottie;')) throw new Error('Lottie export line not found; the player build changed.');

const html = read('src/index.html')
  .replace('/*__CSS__*/', () => `${read('src/styles.css')}
${read('src/shared.css')}`)
  .replace('__SNAPSHOT__', () => inlineJson({ generatedAt: snapshot.generatedAt, status: snapshot.status, releaseFingerprint: snapshot.releaseFingerprint,
    snapshotSha256: createHash('sha256').update(snapshotText).digest('hex'), builtAt: new Date().toISOString(), queries: snapshot.queries }))
  .replace('__TRACE__', () => inlineJson(trace))
  .replace('__LOTTIE_ICONS__', () => inlineJson({ ...lottieIcons, stack: lottieStack }))
  .replace('__LOTTIE_FLOW__', () => inlineJson(JSON.parse(read(`${lottieDir}/fund-flow-arrow.json`))))
  .replace('/*__LOTTIE__*/', () => `(function(){\n${lottiePlayer}\n})();`)
  .replace('/*__MODEL__*/', () => stripExports(read('src/model.js')))
  .replace('/*__MOTION__*/', () => read('src/motion.js'))
  .replace('/*__THEME__*/', () => read('src/theme.js'))
  .replace('/*__HOME__*/', () => read('src/home.js'))
  .replace('__BRAND__', () => JSON.stringify(brandLogos()).replace(/</g, '\\u003c'))
  .replace('/*__APP__*/', () => read('src/app.js'));

for (const token of ['/*__CSS__*/', '__SNAPSHOT__', '__TRACE__', '__LOTTIE_ICONS__', '__LOTTIE_FLOW__', '/*__LOTTIE__*/', '/*__MODEL__*/', '/*__MOTION__*/', '/*__THEME__*/', '/*__HOME__*/', '__BRAND__', '/*__APP__*/']) {
  if (html.includes(token)) throw new Error(`Unreplaced build token ${token}`);
}
writeFileSync(at(output), html);
console.log(`Built ${relative(process.cwd(), at(output))} (${(html.length / 1024).toFixed(0)} KB) from snapshot ${snapshot.generatedAt}`);

// Sponsor logos for the Home hero: optional files brand/mpob.(svg|png|jpg|webp) and brand/ukm.(…).
// Inside the project they live in dashboard/brand (shared by both levels); in the repo, in ./brand.
function brandLogos() {
  const dirs = [new URL('../brand/', import.meta.url), new URL('./brand/', import.meta.url)];
  const types = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
  const out = {};
  for (const key of ['mpob', 'ukm']) for (const d of dirs) for (const [ext, mime] of Object.entries(types)) {
    const file = new URL(`${key}.${ext}`, d);
    if (!out[key] && existsSync(file)) out[key] = `data:${mime};base64,${readFileSync(file).toString('base64')}`;
  }
  return out;
}
