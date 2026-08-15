import test from "node:test";
import assert from "node:assert/strict";
import { CORRECTABLE_QC_REVIEW } from "../src/data/humanReviewQcDemo.js";
import { applyEvidenceCorrection, isCorrectableExtraction } from "../src/domain/humanCorrection.js";
import { computeRecommendation } from "../src/domain/mortgageQc.js";

test("QC queue sample exposes a bounded evidence correction instead of a generic edit", () => {
  const rule = CORRECTABLE_QC_REVIEW.rules[0];
  assert.equal(CORRECTABLE_QC_REVIEW.workflow, "In Review");
  assert.equal(rule.status, "Needs Review");
  assert.equal(rule.correctableField, "borrowerNames");
  assert.equal(isCorrectableExtraction(rule), true);
  assert.equal(computeRecommendation(CORRECTABLE_QC_REVIEW.rules), "Needs Review");
});

test("in-card borrower correction can clear the blocker only after deterministic re-evaluation", () => {
  const { review, result } = applyEvidenceCorrection(CORRECTABLE_QC_REVIEW, {
    ruleId: "NAME-001",
    correctedValue: "Maya Patel; Rohan Patel",
    actor: "Analyst",
    note: "Verified against page evidence",
    at: "10:30",
  });

  assert.equal(result.statusBefore, "Needs Review");
  assert.equal(result.statusAfter, "Pass");
  assert.equal(result.recommendationAfter, "Ready for Review");
  assert.equal(review.rules[0].aiExtractedValue, "Maya Pate1; Rohan Patel");
  assert.equal(review.rules[0].correctedByHuman, true);
  assert.match(review.audit.at(-1).detail, /AI value/);
});
