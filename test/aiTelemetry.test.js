import test from "node:test";
import assert from "node:assert/strict";
import { OPERATIONAL_TELEMETRY_V1 } from "../src/data/operationalTelemetry.js";
import { summarizeAiTelemetry } from "../src/domain/aiTelemetry.js";

test("operational telemetry derives workload, latency, and safety metrics without inventing missing OCR coverage", () => {
  const summary = summarizeAiTelemetry(OPERATIONAL_TELEMETRY_V1.events);

  assert.equal(summary.totalPackages, 7);
  assert.equal(summary.totalPages, 56);
  assert.equal(summary.totalProviderCalls, 28);
  assert.equal(summary.humanReviewRate, 1);
  assert.equal(summary.straightThroughRate, 0);
  assert.equal(summary.exceptionRate, 2 / 7);
  assert.equal(summary.falseReady, 0);
  assert.equal(summary.p50LatencyMs, 12356);
  assert.equal(summary.p95LatencyMs, 42200);
  assert.equal(summary.averageOcrPageCoverage, null);
  assert.ok(Math.abs(summary.averageWordConfidence - 0.8965) < 0.000001);
});

test("review-trigger aggregation makes repeated observability gaps visible", () => {
  const summary = summarizeAiTelemetry(OPERATIONAL_TELEMETRY_V1.events);
  const triggerCounts = Object.fromEntries(summary.topReviewTriggers.map((item) => [item.trigger, item.count]));

  assert.equal(triggerCounts["OCR coverage not instrumented"], 2);
  assert.equal(triggerCounts["Evidence incomplete"], 2);
  assert.equal(triggerCounts["Classification uncertainty"], 1);
});
