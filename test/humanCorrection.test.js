import test from "node:test";
import assert from "node:assert/strict";
import { applyBorrowerNameCorrection, applyEvidenceCorrection } from "../src/domain/humanCorrection.js";
import { computeRecommendation } from "../src/domain/mortgageQc.js";

const fixture = ({ field = "borrowerNames" } = {}) => ({
  id: "QC-HITL-001",
  rules: [{
    id: field === "borrowerNames" ? "NAME-001" : field === "executionDate" ? "DATE-001" : "DOC-CLASS-001",
    severity: "Critical",
    fundingCritical: true,
    status: "Needs Review",
    extractedValue: field === "borrowerNames" ? "Maya Pate1; Rohan Patel" : field === "executionDate" ? "2026-08-08" : "Closing Disclosure",
    evidence: { sourceDocument: "Source document", page: 1, excerpt: "Pinned source evidence" },
    confidence: { extraction: 0.71, evidenceComplete: true, reviewTrigger: "Mismatch" },
    correctableField: field,
    correctionContext: {
      referenceValue: field === "borrowerNames" ? "Maya Patel; Rohan Patel" : field === "executionDate" ? "2026-08-06" : "Promissory Note",
    },
  }],
  audit: [],
});

test("matching borrower correction reruns the borrower rule", () => {
  const original = fixture();
  assert.equal(computeRecommendation(original.rules), "Needs Review");
  const { review, result } = applyBorrowerNameCorrection(original, { ruleId: "NAME-001", correctedValue: "Rohan Patel; Maya Patel", at: "10:15" });
  assert.equal(review.rules[0].status, "Pass");
  assert.equal(review.rules[0].aiExtractedValue, "Maya Pate1; Rohan Patel");
  assert.equal(result.recommendationAfter, "Ready for Review");
  assert.equal(original.rules[0].extractedValue, "Maya Pate1; Rohan Patel");
});

test("non-matching correction stays in review", () => {
  const { review, result } = applyEvidenceCorrection(fixture(), { ruleId: "NAME-001", correctedValue: "Maya Pate; Rohan Patel", at: "10:16" });
  assert.equal(review.rules[0].status, "Needs Review");
  assert.equal(result.recommendationAfter, "Needs Review");
});

test("date correction uses normalized date comparison and reruns the rule", () => {
  const { review, result } = applyEvidenceCorrection(fixture({ field: "executionDate" }), { ruleId: "DATE-001", correctedValue: "2026-08-06", at: "10:17" });
  assert.equal(review.rules[0].status, "Pass");
  assert.equal(result.field, "executionDate");
  assert.equal(result.recommendationAfter, "Ready for Review");
});

test("document-classification correction reruns against the pinned document type", () => {
  const { review, result } = applyEvidenceCorrection(fixture({ field: "documentClassification" }), { ruleId: "DOC-CLASS-001", correctedValue: "Promissory Note", at: "10:18" });
  assert.equal(review.rules[0].status, "Pass");
  assert.equal(result.fieldLabel, "Document classification");
});

test("correction history preserves the original AI value across repeated edits", () => {
  const first = applyEvidenceCorrection(fixture(), { ruleId: "NAME-001", correctedValue: "Maya Pate; Rohan Patel", at: "10:16" }).review;
  const second = applyEvidenceCorrection(first, { ruleId: "NAME-001", correctedValue: "Maya Patel; Rohan Patel", at: "10:17" }).review;
  assert.equal(second.rules[0].aiExtractedValue, "Maya Pate1; Rohan Patel");
  assert.equal(second.rules[0].corrections.length, 2);
  assert.equal(second.rules[0].status, "Pass");
});
