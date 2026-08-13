import test from "node:test";
import assert from "node:assert/strict";
import { applyBorrowerNameCorrection } from "../src/domain/humanCorrection.js";
import { computeRecommendation } from "../src/domain/mortgageQc.js";

const fixture = () => ({
  id: "QC-HITL-001",
  rules: [{
    id: "NAME-001",
    severity: "Critical",
    fundingCritical: true,
    status: "Needs Review",
    extractedValue: "Maya Pate1; Rohan Patel",
    evidence: { sourceDocument: "Signature/Name Affidavit", page: 1, excerpt: "Maya Patel and Rohan Patel" },
    confidence: { extraction: 0.71, evidenceComplete: true, reviewTrigger: "Borrower mismatch" },
    correctableField: "borrowerNames",
    correctionContext: { referenceValue: "Maya Patel; Rohan Patel" },
  }],
  audit: [],
});

test("matching correction reruns the borrower rule", () => {
  const original = fixture();
  assert.equal(computeRecommendation(original.rules), "Needs Review");
  const { review, result } = applyBorrowerNameCorrection(original, { ruleId: "NAME-001", correctedValue: "Rohan Patel; Maya Patel", at: "10:15" });
  assert.equal(review.rules[0].status, "Pass");
  assert.equal(review.rules[0].aiExtractedValue, "Maya Pate1; Rohan Patel");
  assert.equal(result.recommendationAfter, "Ready for Review");
  assert.equal(original.rules[0].extractedValue, "Maya Pate1; Rohan Patel");
});

test("non-matching correction stays in review", () => {
  const { review, result } = applyBorrowerNameCorrection(fixture(), { ruleId: "NAME-001", correctedValue: "Maya Pate; Rohan Patel", at: "10:16" });
  assert.equal(review.rules[0].status, "Needs Review");
  assert.equal(result.recommendationAfter, "Needs Review");
});

test("correction history preserves the original AI value", () => {
  const first = applyBorrowerNameCorrection(fixture(), { ruleId: "NAME-001", correctedValue: "Maya Pate; Rohan Patel", at: "10:16" }).review;
  const second = applyBorrowerNameCorrection(first, { ruleId: "NAME-001", correctedValue: "Maya Patel; Rohan Patel", at: "10:17" }).review;
  assert.equal(second.rules[0].aiExtractedValue, "Maya Pate1; Rohan Patel");
  assert.equal(second.rules[0].corrections.length, 2);
  assert.equal(second.rules[0].status, "Pass");
});
