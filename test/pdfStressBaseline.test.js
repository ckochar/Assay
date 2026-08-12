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
  assert.equal(summary.packages, 3);
  assert.equal(summary.pagesAnalyzed, 24);
  assert.equal(summary.classificationCorrect, 24);
  assert.equal(summary.classificationTotal, 24);
  assert.equal(summary.extractionCorrect, 30);
  assert.equal(summary.extractionTotal, 30);
  assert.equal(summary.evidenceCorrect, 25);
  assert.equal(summary.evidencePresent, 25);
  assert.equal(summary.evidenceTotal, 25);
  assert.equal(summary.recommendationCorrect, 3);
  assert.equal(summary.falseReady, 0);
  assert.equal(summary.falseException, 0);
  assert.equal(summary.missedException, 0);
  assert.equal(summary.releaseGatePassed, true);
});

test("measured digital PDF stress baseline derives captured latency percentiles", () => {
  assert.equal(PDF_STRESS_BASELINE_SUMMARY.p50LatencyMs, 12363);
  assert.equal(PDF_STRESS_BASELINE_SUMMARY.p95LatencyMs, 12520);
});
