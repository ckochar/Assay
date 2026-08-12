import test from "node:test";
import assert from "node:assert/strict";
import {
  PDF_EVALUATION_BASELINE_META,
  PDF_EVALUATION_BASELINE_ROWS,
  PDF_EVALUATION_BASELINE_SUMMARY,
} from "../src/data/pdfEvaluationBaseline.js";

test("measured PDF baseline preserves the published counts and safety gate", () => {
  const summary = PDF_EVALUATION_BASELINE_SUMMARY;
  assert.equal(PDF_EVALUATION_BASELINE_ROWS.length, 5);
  assert.equal(PDF_EVALUATION_BASELINE_META.totalPages, 40);
  assert.equal(summary.pagesAnalyzed, 40);
  assert.equal(summary.classificationCorrect, 40);
  assert.equal(summary.classificationTotal, 40);
  assert.equal(summary.extractionCorrect, 50);
  assert.equal(summary.extractionTotal, 50);
  assert.equal(summary.evidenceCorrect, 44);
  assert.equal(summary.evidencePresent, 44);
  assert.equal(summary.evidenceTotal, 44);
  assert.equal(summary.recommendationCorrect, 5);
  assert.equal(summary.falseReady, 0);
  assert.equal(summary.falseException, 0);
  assert.equal(summary.missedException, 0);
  assert.equal(summary.releaseGatePassed, true);
});

test("measured PDF baseline derives the captured P50 and P95 latency", () => {
  assert.equal(PDF_EVALUATION_BASELINE_SUMMARY.p50LatencyMs, 12356);
  assert.equal(PDF_EVALUATION_BASELINE_SUMMARY.p95LatencyMs, 12709);
});
