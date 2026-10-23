// node --test test.mjs
// Confirms the Developer-level rules give exactly the V3 results on the same reviewed snapshot.
// Inside the project it compares against V3's own files; in the standalone repo, against reference/v3/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import * as user from './src/model.js';

const inProject = existsSync(new URL('../V3_DASHBOARD_APP', import.meta.url));
const v3Dir = inProject ? '../V3_DASHBOARD_APP/src/content/dashboard/' : './reference/v3/';
const v3 = await import(`${v3Dir}evidence-model.mjs`);
const { fundingAmounts: v3Funding } = await import(`${v3Dir}funding-arithmetic.mjs`);
const { wplImpact: v3Wpl } = await import(`${v3Dir}wpl-model.mjs`);
const page = inProject ? '../MPOB_Mandate_Decision_Studio_developer_level.html' : './index.html';
const snapshot = JSON.parse(readFileSync(new URL(inProject ? '../../data/V3_DASHBOARD_SNAPSHOT.json' : './data/V3_DASHBOARD_SNAPSHOT.json', import.meta.url)));
const q = snapshot.queries;
const a = q.model_assumptions.rows[0];
const base = q.decision_snapshot.rows[0];

test('policy rule matches V3 across a price × fund × approval grid', () => {
  for (let mops = 1500; mops <= 6000; mops += 250) for (let pme = 1500; pme <= 6000; pme += 250)
    for (const fund of [0, 300, 641.88, 641.89, 1000, 6000]) for (const b30Auth of [false, true]) {
      assert.deepEqual(user.policyState({ mops, pme, fund, b30Auth }, a), v3.policyState({ mops, pme, fund, b30Auth }, a));
    }
});
test('latest snapshot gives B20 with gap −646.01 and fund limit 641.88', () => {
  const r = user.policyState({ mops: base.mopsRmT, pme: base.pmeRmT, fund: base.fundRmMn, b30Auth: false }, a);
  assert.equal(r.mandate, 'B20');
  assert.ok(Math.abs(r.gap - -646.01) < 1e-9);
  assert.ok(Math.abs(r.fundThreshold - 641.8833) < 1e-6);
  assert.equal(r.decisionReason, 'Keep B20: the price gap is not above the B30 limit.');
});
test('B15 appears only as the V3 deep-stress case', () => {
  assert.equal(user.policyState({ mops: 1500, pme: 2100, fund: 0, b30Auth: false }, a).mandate, 'B15');
  assert.equal(user.policyState({ mops: 1500, pme: 2000, fund: 0, b30Auth: false }, a).mandate, 'B20');
});
test('funding arithmetic matches V3 and the nine saved BSL points', () => {
  for (const productionPct of [90, 100, 110]) for (const bslRate of [0, 20, 25, 30, 100]) for (const share of [0, 0.25, 1]) {
    const args = { baseProductionMt: a.annualCpoProductionMt, productionPct, bslRate, savingsEstimate: 80.72, savingsShare: share, startingMoney: 100 };
    assert.deepEqual(user.fundingAmounts(args), v3Funding(args));
  }
  for (const row of q.rq3_bsl.rows) {
    const pct = row['Production scenario'].startsWith('Low') ? 90 : row['Production scenario'].startsWith('High') ? 110 : 100;
    const r = user.fundingAmounts({ baseProductionMt: a.annualCpoProductionMt, productionPct: pct, bslRate: row['BSL rate (RM/t)'], savingsEstimate: 0, savingsShare: 0, startingMoney: 0 });
    assert.ok(Math.abs(r.bslRevenue - row['Annual revenue (RM mn)']) <= 0.011);
  }
});
test('fund-survival selection matches V3 for every whole-percent share', () => {
  for (const h of ['9', '60']) for (const s of ['A', 'B', 'C', 'D']) for (let p = 0; p <= 100; p++) {
    assert.deepEqual(user.selectRq2(q, h, s, p / 100), v3.selectRq2(q, h, s, p / 100));
  }
  assert.deepEqual(user.rq2CaptureChoices(q, '9'), [1]);
  assert.deepEqual(user.rq2CaptureChoices(q, '60'), [0.25, 0.5, 0.75, 1]);
});
test('fitted cost from the reviewed master inputs reproduces the saved diagnostic within coefficient rounding', () => {
  const trace = JSON.parse(readFileSync(new URL('./data/master-trace.json', import.meta.url), 'utf8'));
  const last = trace.rows.at(-1);
  assert.equal(last.period, base.period);
  const fitted = user.fittedPme(q.rq1_coefficients.rows, { cpoLag: q.rq1_monthly.rows.at(-2).cpoRmT, methanol: last.E, glycerol: last.F });
  const saved = q.rq1_apmbio_diagnostic.rows.find(r => r.component.startsWith('Fitted PME')).rmTonne;
  assert.ok(Math.abs(fitted - saved) < 0.5, `fitted ${fitted} vs saved ${saved}`);
});
test('WPL baseline arithmetic matches V3', () => {
  const w = q.rq3_wpl.rows[0];
  for (const price of [2000, 3150, 3650, 4567.5, 8000]) for (const rate of [0, 1.5, 3, 6]) for (const threshold of [w.WPL_THRESHOLD_PEN_RM_T, w.WPL_THRESHOLD_EAST_RM_T]) {
    assert.deepEqual(user.wplImpact(price, threshold, rate, true, null, 3), v3Wpl(price, threshold, rate, true, null, 3));
    assert.deepEqual(user.wplImpact(price, threshold, rate, true, 1000, 3), v3Wpl(price, threshold, rate, true, 1000, 3));
  }
});
test('master-data trace matches the snapshot series', () => {
  const trace = JSON.parse(readFileSync(new URL('./data/master-trace.json', import.meta.url), 'utf8'));
  for (const row of trace.rows) {
    const monthly = q.rq1_monthly.rows.find(r => r.period === row.period);
    assert.ok(Math.abs(row.H - monthly.mopsRmT) < 0.01 && Math.abs(row.I - monthly.pmeRmT) < 0.01 && Math.abs(row.D - monthly.cpoRmT) < 0.01, row.period);
  }
});
test('built page embeds the same snapshot queries', () => {
  const html = readFileSync(new URL(page, import.meta.url), 'utf8');
  const json = html.match(/<script type="application\/json" id="mpob-snapshot">([\s\S]*?)<\/script>/)[1];
  const embedded = JSON.parse(json);
  assert.deepEqual(embedded.queries, q);
  assert.match(embedded.snapshotSha256, /^[0-9a-f]{64}$/);
  assert.equal(embedded.releaseFingerprint, snapshot.releaseFingerprint);
  assert.ok(!/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html), 'page must load nothing from the network');
});
test('the snapshot check accepts the reviewed snapshot and rejects a broken one', () => {
  const app = readFileSync(new URL('./src/app.js', import.meta.url), 'utf8');
  const block = app.slice(app.indexOf('const REQUIRED = {'), app.indexOf('const PROBLEMS'));
  const snapshotProblems = new Function(`${block}; return snapshotProblems;`)();
  assert.deepEqual(snapshotProblems(snapshot), []);
  const broken = structuredClone(snapshot);
  delete broken.queries.rq4_matrix; broken.queries.decision_snapshot.rows[0].mopsRmT = 'n/a';
  assert.ok(snapshotProblems(broken).length >= 2);
});
test('equality is not a pass: gap 0 and fund at the limit both fail B30', () => {
  const r = user.policyState({ mops: 4000, pme: 4000, fund: 3 * 213.9611, b30Auth: true }, a);
  assert.equal(r.pricePass, false); assert.equal(r.fundSafe, false); assert.equal(r.mandate, 'B20');
});
