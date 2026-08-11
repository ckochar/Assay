import test from "node:test";
import assert from "node:assert/strict";

import { createLiveQcReview } from "../src/domain/liveQcCase.js";

const result = {
  document: {
    type: "Promissory Note",
    pageCount: 2,
    loanNumber: "LN-900001",
    borrowers: ["Maya Patel", "Rohan Patel"],
    executionDate: "2026-08-09",
    ocrQuality: { label: "High" },
  },
  rules: [
    {
      id: "DATE-001",
      name: "Execution date extracted",
      status: "Pass",
      fundingCritical: true,
      extractedValue: "2026-08-09",
      confidence: { classification: 0.99, extraction: 0.92, ocrQuality: "High", evidenceComplete: true },
      evidence: { page: 2, excerpt: "Execution Date: August 9, 2026", polygon: [1, 1, 2, 1, 2, 2, 1, 2], pageWidth: 8.5, pageHeight: 11, unit: "inch" },
    },
  ],
  provider: { modelId: "prebuilt-layout", apiVersion: "2024-11-30" },
};

test("maps a completed live analysis into the package review model", () => {
  const review = createLiveQcReview({
    result,
    meta: { analysisId: "analysis-12345678", modelId: "prebuilt-layout", apiVersion: "2024-11-30", pageScope: "1-2" },
    channel: "RON",
    documentHash: "sha256:demo-live",
    now: new Date("2026-08-11T20:00:00.000Z"),
  });

  assert.equal(review.id, "QC-LIVE-12345678");
  assert.equal(review.borrower, "Maya Patel & Rohan Patel");
  assert.equal(review.loanId, "LN-900001");
  assert.equal(review.channel, "RON");
  assert.equal(review.source, "live");
  assert.equal(review.documents[0].pages, 2);
  assert.equal(review.profile.id, "LIVE-NOTE-BASELINE");
  assert.equal(review.rules[0].severity, "Critical");
  assert.match(review.rules[0].requirement, /execution date/i);
  assert.equal(review.rules[0].evidence.sourceDocument, "Promissory Note");
  assert.equal(review.evaluationContext.documentHash, "sha256:demo-live");
});

test("rejects incomplete live analysis results", () => {
  assert.throws(() => createLiveQcReview({ result: null }), /completed live analysis/i);
});
