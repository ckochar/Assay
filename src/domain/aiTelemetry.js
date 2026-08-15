function percentile(values = [], p = 0.5) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function average(values = []) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

export function summarizeAiTelemetry(events = []) {
  const rows = events.filter(Boolean);
  const total = rows.length;
  const count = (predicate) => rows.filter(predicate).length;
  const rate = (value) => total ? value / total : 0;
  const straightThrough = count((row) => row.recommendation === "Ready for Review" && !row.humanReviewRequired);
  const humanReview = count((row) => Boolean(row.humanReviewRequired));
  const exceptions = count((row) => row.recommendation === "Exception Identified");
  const unable = count((row) => row.recommendation === "Unable to Evaluate");
  const falseReady = count((row) => Boolean(row.falseReady));

  const triggers = new Map();
  for (const row of rows) {
    for (const trigger of row.reviewTriggers || []) {
      triggers.set(trigger, (triggers.get(trigger) || 0) + 1);
    }
  }

  return {
    totalPackages: total,
    totalPages: rows.reduce((sum, row) => sum + (Number(row.pagesAnalyzed) || 0), 0),
    totalProviderCalls: rows.reduce((sum, row) => sum + (Number(row.providerCalls) || 0), 0),
    straightThroughRate: rate(straightThrough),
    humanReviewRate: rate(humanReview),
    exceptionRate: rate(exceptions),
    unableRate: rate(unable),
    falseReady,
    averagePagesPerPackage: average(rows.map((row) => row.pagesAnalyzed)),
    averageProviderCallsPerPackage: average(rows.map((row) => row.providerCalls)),
    averageOcrPageCoverage: average(rows.map((row) => row.ocrPageCoverage)),
    averageEvidenceCompleteness: average(rows.map((row) => row.evidenceCompleteness)),
    averageWordConfidence: average(rows.map((row) => row.averageWordConfidence)),
    p50LatencyMs: percentile(rows.map((row) => row.latencyMs), 0.5),
    p95LatencyMs: percentile(rows.map((row) => row.latencyMs), 0.95),
    topReviewTriggers: [...triggers.entries()]
      .map(([trigger, countValue]) => ({ trigger, count: countValue }))
      .sort((a, b) => b.count - a.count || a.trigger.localeCompare(b.trigger)),
  };
}
