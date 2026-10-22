// Display-only selectors. Never interpolate or round a requested research case.
export function rq2Horizons(queries) {
  return Object.keys(queries).filter(key => /^rq2_scenarios_\d+m$/.test(key))
    .map(key => Number(key.match(/_(\d+)m$/)[1])).sort((a, b) => a - b);
}

export function rq2CaptureChoices(queries, horizon, baselineCapture = 1) {
  const values = (queries.rq2_capture?.rows ?? [])
    .filter(row => Number(row['Horizon (months)']) === Number(horizon))
    .map(row => Number(row['Savings capture']));
  if (queries[`rq2_scenarios_${horizon}m`]?.rows?.length) values.push(baselineCapture);
  return [...new Set(values)].sort((a, b) => a - b);
}

export function selectRq2(queries, horizon, scenario, capture, baselineCapture = 1) {
  const baselineId = `rq2_scenarios_${horizon}m`;
  const sameScenario = row => String(row.Scenario).trim().startsWith(scenario);
  if (Math.abs(Number(capture) - Number(baselineCapture)) < 1e-8) {
    const row = queries[baselineId]?.rows?.find(sameScenario);
    return { queryId: baselineId, row, solvency: row?.solvency_prob, survival6m: row?.p6_months,
      cvar: row?.cvar95_rm_m, median: row?.median_end };
  }
  const row = queries.rq2_capture?.rows?.find(row => sameScenario(row)
    && Number(row['Horizon (months)']) === Number(horizon)
    && Math.abs(Number(row['Savings capture']) - Number(capture)) < 1e-8);
  return { queryId: 'rq2_capture', row, solvency: row?.['Solvency prob'], survival6m: row?.['P(survive ≥6m)'],
    cvar: row?.cvar95_rm_m, median: row?.median_end };
}

export function policyState({ mops, pme, fund, b30Auth }, assumptions) {
  const gap = Number(mops) - Number(pme);
  const fundThreshold = Number(assumptions.fundSafetyMultiple) * Number(assumptions.rolling12AvgB20DrawdownRmMn);
  const fundSafe = Number(fund) > fundThreshold;
  const pricePass = gap > Number(assumptions.b30GapThreshold);
  let mandate = 'B20';
  let decisionReason = 'Keep B20: one or more B30 checks fail.';
  if (pricePass && fundSafe && b30Auth) {
    mandate = 'B30'; decisionReason = 'B30: price, fund and assumed approval checks all pass.';
  } else if (gap < Number(assumptions.b15GapFloor) && !fundSafe) {
    mandate = 'B15'; decisionReason = 'B15 is proposed because the price gap and fund balance are below their limits. Government approval is still needed.';
  } else if (pricePass && fundSafe && !b30Auth) {
    decisionReason = 'Keep B20: price and fund checks pass, but B30 approval is not assumed.';
  } else if (!pricePass) {
    decisionReason = 'Keep B20: the price gap is not above the B30 limit.';
  }
  return { gap, fundThreshold, fundSafe, pricePass, mandate, decisionReason };
}
