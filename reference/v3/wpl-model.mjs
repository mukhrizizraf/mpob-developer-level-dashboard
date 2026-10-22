export function wplImpact(price, threshold, ratePercent, enabled, volume, baselinePercent = 3) {
  const excess = Math.max(0, price - threshold);
  const baseline = excess * baselinePercent / 100;
  const selected = enabled ? excess * ratePercent / 100 : 0;
  const tonnes = volume === '' || volume === null ? null : Number(volume);
  const validVolume = tonnes !== null && Number.isFinite(tonnes) && tonnes >= 0;
  return { excess, baseline, selected, delta: selected - baseline,
    total: !enabled ? 0 : validVolume ? selected * tonnes : null,
    totalDelta: validVolume ? (selected-baseline)*tonnes : null };
}
