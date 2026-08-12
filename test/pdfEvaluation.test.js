import test from "node:test";
import assert from "node:assert/strict";
import { scorePdfEvaluationCase, summarizePdfEvaluation } from "../src/domain/pdfEvaluation.js";

function evidence(page) {
  return { page, excerpt: `page ${page}` };
}

function sampleResult() {
  const pageTypes = [
    "Promissory Note",
    "Promissory Note",
    "Mortgage or Deed of Trust",
    "Closing Disclosure",
    "Notice of Right to Cancel",
    "Occupancy Affidavit",
    "Signature/Name Affidavit",
    "Notary Acknowledgment",
  ];
  return {
    package: {
      pageCount: 8,
      ocrQuality: { label: "High", score: 0.99 },
      documents: pageTypes.map((type, index) => ({
        type,
        pageClassifications: [{ page: index + 1, type }],
      })),
    },
    context: {
      loanNumber: "LN-900001",
      loanNumberCandidates: ["LN-900001"],
      loanNumberEvidence: evidence(1),
      borrowers: ["Maya Patel", "Rohan Patel"],
      borrowerEvidence: evidence(1),
      jurisdiction: { code: "TX", evidence: evidence(1) },
    },
    documentQc: {
      noteExecutionDate: { value: "2026-08-09", evidence: evidence(1) },
      closingDate: { value: "2026-08-09", evidence: evidence(4) },
      rightToCancel: {
        transactionDate: "2026-08-09",
        transactionDateEvidence: evidence(5),
        cancellationDeadline: "2026-08-12",
        cancellationDeadlineEvidence: evidence(5),
      },
      notaryAcknowledgment: {
        acknowledgmentDate: "2026-08-09",
        acknowledgmentDateEvidence: evidence(8),
        commissionExpirationDate: "2028-11-30",
        commissionExpirationEvidence: evidence(8),
      },
    },
  };
}

const scenario = {
  id: "PDF-T01",
  name: "Perfect fixture",
  category: "test",
  label: {
    expectedRecommendation: "Needs Review",
    pageTypes: [
      "Promissory Note",
      "Promissory Note",
      "Mortgage or Deed of Trust",
      "Closing Disclosure",
      "Notice of Right to Cancel",
      "Occupancy Affidavit",
      "Signature/Name Affidavit",
      "Notary Acknowledgment",
    ],
    fields: {
      loanNumber: "LN-900001",
      loanNumberCandidates: ["LN-900001"],
      borrowers: ["Maya Patel", "Rohan Patel"],
      jurisdiction: "TX",
      noteExecutionDate: "2026-08-09",
      closingDate: "2026-08-09",
      rtcTransactionDate: "2026-08-09",
      rtcCancellationDeadline: "2026-08-12",
      notaryAcknowledgmentDate: "2026-08-09",
      notaryCommissionExpirationDate: "2028-11-30",
    },
    evidencePages: {
      loanNumber: 1,
      borrowers: 1,
      jurisdiction: 1,
      noteExecutionDate: 1,
      closingDate: 4,
      rtcTransactionDate: 5,
      rtcCancellationDeadline: 5,
      notaryAcknowledgmentDate: 8,
      notaryCommissionExpirationDate: 8,
    },
  },
};

test("scores a perfect PDF evaluation case across independent layers", () => {
  const row = scorePdfEvaluationCase({ scenario, result: sampleResult(), predictedRecommendation: "Needs Review", latencyMs: 1200 });
  assert.equal(row.classification.correct, 8);
  assert.equal(row.extraction.correct, 10);
  assert.equal(row.evidence.correct, 9);
  assert.equal(row.recommendation.correct, true);
  assert.equal(row.recommendation.falseReady, false);
});

test("surfaces upstream misses separately from recommendation safety", () => {
  const result = sampleResult();
  result.package.documents[5].pageClassifications[0].type = "Unknown document";
  result.context.jurisdiction.code = null;
  result.documentQc.closingDate.evidence = evidence(5);
  const row = scorePdfEvaluationCase({ scenario, result, predictedRecommendation: "Needs Review", latencyMs: 2000 });
  assert.equal(row.classification.correct, 7);
  assert.equal(row.extraction.correct, 9);
  assert.equal(row.evidence.correct, 8);
  assert.equal(row.recommendation.correct, true);
});

test("summary keeps false-ready as the release gate and computes latency percentiles", () => {
  const good = scorePdfEvaluationCase({ scenario, result: sampleResult(), predictedRecommendation: "Needs Review", latencyMs: 1000 });
  const unsafeScenario = { ...scenario, id: "PDF-T02", label: { ...scenario.label, expectedRecommendation: "Exception Identified" } };
  const unsafe = scorePdfEvaluationCase({ scenario: unsafeScenario, result: sampleResult(), predictedRecommendation: "Ready for Review", latencyMs: 3000 });
  const summary = summarizePdfEvaluation([good, unsafe]);
  assert.equal(summary.falseReady, 1);
  assert.equal(summary.releaseGatePassed, false);
  assert.equal(summary.p50LatencyMs, 1000);
  assert.equal(summary.p95LatencyMs, 3000);
});
