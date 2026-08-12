import test from "node:test";
import assert from "node:assert/strict";
import { GOLDEN_EVALUATION_CASES } from "../src/data/goldenEvaluationCases.js";
import { evaluateGoldenCases } from "../src/domain/goldenEvaluation.js";
import { RECOMMENDATION } from "../src/domain/mortgageQc.js";

test("golden decision set preserves the zero-false-ready release gate", () => {
  const evaluation = evaluateGoldenCases(GOLDEN_EVALUATION_CASES);

  assert.equal(evaluation.metrics.totalCases, 10);
  assert.equal(evaluation.metrics.falseReady, 0);
  assert.equal(evaluation.metrics.releaseGatePassed, true);
  assert.equal(evaluation.metrics.expectedReady, 1);
  assert.equal(evaluation.metrics.predictedReady, 1);
});

test("golden decision set catches deterministic exceptions without creating false exceptions", () => {
  const evaluation = evaluateGoldenCases(GOLDEN_EVALUATION_CASES);

  assert.equal(evaluation.metrics.expectedExceptions, 3);
  assert.equal(evaluation.metrics.predictedExceptions, 3);
  assert.equal(evaluation.metrics.falseException, 0);
  assert.equal(evaluation.metrics.missedException, 0);
  assert.equal(evaluation.metrics.recommendationAccuracy, 1);

  const rtc = evaluation.rows.find((row) => row.id === "GOLD-009");
  const notary = evaluation.rows.find((row) => row.id === "GOLD-010");
  assert.equal(rtc.predictedRecommendation, RECOMMENDATION.EXCEPTION);
  assert.equal(notary.predictedRecommendation, RECOMMENDATION.EXCEPTION);
});

test("human-judgment scenarios stay out of the ready and deterministic-exception buckets", () => {
  const evaluation = evaluateGoldenCases(GOLDEN_EVALUATION_CASES);
  const humanReviewRows = evaluation.rows.filter((row) => row.category === "Human review");

  assert.ok(humanReviewRows.length > 0);
  assert.ok(humanReviewRows.every((row) => row.predictedRecommendation === RECOMMENDATION.REVIEW));
});
