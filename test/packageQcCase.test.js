import test from "node:test";
import assert from "node:assert/strict";
import { createPackageQcReview } from "../src/domain/packageQcCase.js";

function baseResult() {
  return {
    package: {
      pageCount: 8,
      documents: [
        { id: "DOC-01", type: "Promissory Note", startPage: 1, endPage: 2, pages: 2, confidence: 0.9, evidence: { page: 1, excerpt: "PROMISSORY NOTE" }, pageClassifications: [] },
        { id: "DOC-02", type: "Mortgage or Deed of Trust", startPage: 3, endPage: 3, pages: 1, confidence: 0.9, evidence: { page: 3, excerpt: "DEED OF TRUST" }, pageClassifications: [] },
        { id: "DOC-03", type: "Closing Disclosure", startPage: 4, endPage: 4, pages: 1, confidence: 0.9, evidence: { page: 4, excerpt: "CLOSING DISCLOSURE" }, pageClassifications: [] },
        { id: "DOC-04", type: "Notice of Right to Cancel", startPage: 5, endPage: 5, pages: 1, confidence: 0.9, evidence: { page: 5, excerpt: "NOTICE OF RIGHT TO CANCEL" }, pageClassifications: [] },
        { id: "DOC-05", type: "Occupancy Affidavit", startPage: 6, endPage: 6, pages: 1, confidence: 0.9, evidence: { page: 6, excerpt: "OCCUPANCY AFFIDAVIT" }, pageClassifications: [] },
        { id: "DOC-06", type: "Signature/Name Affidavit", startPage: 7, endPage: 7, pages: 1, confidence: 0.9, evidence: { page: 7, excerpt: "SIGNATURE / NAME AFFIDAVIT" }, pageClassifications: [] },
        { id: "DOC-07", type: "Notary Acknowledgment", startPage: 8, endPage: 8, pages: 1, confidence: 0.9, evidence: { page: 8, excerpt: "NOTARY ACKNOWLEDGMENT" }, pageClassifications: [] },
      ],
      knownDocumentTypes: [],
      unknownPages: [],
      lowConfidencePages: [],
      ocrQuality: { label: "High", score: 0.98 },
      status: "Ready for QC Evaluation",
    },
    context: {
      loanNumber: "LN-900001",
      loanNumberCandidates: ["LN-900001"],
      loanNumberConsistent: true,
      loanNumberEvidence: { page: 1, excerpt: "Loan No.: LN-900001" },
      borrowers: ["Maya Patel", "Rohan Patel"],
      borrowerEvidence: { page: 1, excerpt: 'FOR VALUE RECEIVED, Maya Patel and Rohan Patel (collectively, "Borrower")' },
      jurisdiction: { code: "TX", confidence: 0.96, basis: "Property address", evidence: { page: 1, excerpt: "Property Address: 7408 Willow Bend Drive, Plano, TX 75024" } },
      profileResolution: { status: "Candidate profile resolved", jurisdiction: "TX", requiresHumanConfirmation: false },
    },
    provider: { modelId: "prebuilt-layout", apiVersion: "2024-11-30", status: "succeeded" },
  };
}

test("creates a package QC case with pinned profile and evidence-backed foundation controls", () => {
  const review = createPackageQcReview({
    result: baseResult(),
    meta: { analysisId: "abc-12345678", pageScope: "1-8" },
    now: new Date("2026-08-11T20:30:00-04:00"),
  });

  assert.equal(review.id, "QC-PKG-12345678");
  assert.equal(review.profile.id, "MORTGAGE-QC-TX");
  assert.equal(review.profile.version, "2.1.0");
  assert.equal(review.documents.length, 7);
  assert.equal(review.rules.length, 5);
  assert.ok(review.rules.every((rule) => rule.status === "Pass"));
  assert.equal(review.rules.find((rule) => rule.id === "PKG-LOAN-001").evidence.page, 1);
  assert.equal(review.rules.find((rule) => rule.id === "PKG-PROFILE-001").evidence.sourceDocument, "Promissory Note");
  assert.equal(review.sourceKind, "package");
});

test("keeps unresolved package identity and profile context as blocking review findings", () => {
  const result = baseResult();
  result.context.loanNumber = null;
  result.context.loanNumberCandidates = ["LN-900001", "LN-900002"];
  result.context.loanNumberConsistent = false;
  result.context.jurisdiction = { code: null, confidence: 0.2, basis: "Not resolved", evidence: null };
  result.context.profileResolution = { status: "Needs context", jurisdiction: null, requiresHumanConfirmation: true };
  result.package.status = "Needs Package Review";

  const review = createPackageQcReview({ result, now: new Date("2026-08-11T20:30:00-04:00") });
  assert.equal(review.profile.id, "PACKAGE-CONTEXT-UNRESOLVED");
  assert.equal(review.rules.find((rule) => rule.id === "PKG-LOAN-001").status, "Fail");
  assert.equal(review.rules.find((rule) => rule.id === "PKG-PROFILE-001").status, "Needs Review");
  assert.equal(review.jurisdiction, "Unresolved");
});
