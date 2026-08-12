import test from "node:test";
import assert from "node:assert/strict";
import {
  PDF_STRESS_BASELINE_META,
  PDF_STRESS_BASELINE_ROWS,
  PDF_STRESS_BASELINE_SUMMARY,
} from "../src/data/pdfStressBaseline.js";

test("measured digital PDF stress baseline preserves published counts and safety gate", () => {
  const summary = PDF_STRESS_BASELINE_SUMMARY;
  assert.equal(PDF_STRESS_BASELINE_META.packages, 3);
  assert.equal(PDF_STRESS_BASELINE_META.totalPages, 24);
  assert.equal(PDF_STRESS_BASELINE_ROWS.length, 3);
  assert.equal(summary.classification.correct, 24);
  assert.equal(summary.classification.total, 24);
  assert.equal(summary.extraction.correct, 30);
  assert.equal(summary.extraction.total, 30);
  assert.equal(summary.evidence.correct, 25);
  assert.equal(summary.evidence.present, 25);
  assert.equal(summary.evidence.total, 25);
  assert.equal(summary.recommendation.correct, 3);
  assert.equal(summary.recommendation.total, 3);
  assert.equal(summary.recommendation.falseReady, 0);
  assert.equal(summary.recommendation.falseException, 0);
  assert.equal(summary.recommendation.missedException, 0);
  assert.equal(summary.releaseGatePassed, true);
});

test("measured digital PDF stress baseline derives captured latency percentiles", () => {
  assert.equal(PDF_STRESS_BASELINE_SUMMARY.latency.p50Ms, 12363);
  assert.equal(PDF_STRESS_BASELINE_SUMMARY.latency.p95Ms, 12520);
});
