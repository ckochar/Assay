import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMortgagePackageAnalysis } from "../server/lib/normalizeMortgagePackage.js";

function page(pageNumber, lines) {
  return {
    pageNumber,
    width: 8.5,
    height: 11,
    unit: "inch",
    lines: lines.map((content, index) => ({ content, polygon: [0.5, 0.7 + index * 0.2, 7.5, 0.7 + index * 0.2, 7.5, 0.9 + index * 0.2, 0.5, 0.9 + index * 0.2] })),
    words: lines.flatMap((line) => line.split(/\s+/).map((content) => ({ content, confidence: 0.98 }))),
  };
}

function result(pages, content = null) {
  return {
    status: "succeeded",
    analyzeResult: {
      modelId: "prebuilt-layout",
      apiVersion: "2024-11-30",
      pages,
      content: content ?? pages.flatMap((item) => item.lines.map((line) => line.content)).join("\n"),
    },
  };
}

test("segments a combined mortgage package into consecutive document ranges", () => {
  const normalized = normalizeMortgagePackageAnalysis(result([
    page(1, ["PROMISSORY NOTE", "Loan No.: LN-900001", "FOR VALUE RECEIVED, Maya Patel and Rohan Patel (collectively, \"Borrower\")", "Property Address: 7408 Willow Bend Drive, Plano, TX 75024", "Borrower: Maya Patel"]),
    page(2, ["PROMISSORY NOTE", "promise to pay", "principal sum", "Borrower: Rohan Patel"]),
    page(3, ["DEED OF TRUST", "This security instrument", "Borrower: Maya Patel"]),
    page(4, ["CLOSING DISCLOSURE", "Loan Terms", "Projected Payments", "Cash to Close", "Loan No.: LN-900001"]),
  ]));

  assert.equal(normalized.package.documents.length, 3);
  assert.deepEqual(normalized.package.documents.map((doc) => [doc.type, doc.startPage, doc.endPage]), [
    ["Promissory Note", 1, 2],
    ["Mortgage or Deed of Trust", 3, 3],
    ["Closing Disclosure", 4, 4],
  ]);
  assert.equal(normalized.context.loanNumber, "LN-900001");
  assert.equal(normalized.context.jurisdiction.code, "TX");
  assert.equal(normalized.context.jurisdiction.evidence.page, 1);
  assert.match(normalized.context.jurisdiction.evidence.excerpt, /Property Address/i);
  assert.equal(normalized.context.profileResolution.status, "Candidate profile resolved");
  assert.equal(normalized.package.status, "Ready for QC Evaluation");
});

test("links jurisdiction evidence by the source label even when aggregate OCR spacing differs", () => {
  const pages = [
    page(1, ["PROMISSORY NOTE", "Loan No .: LN-900001", "Property Address : 7408 Willow Bend Drive, Plano, TX 75024"]),
  ];
  const aggregateContent = [
    "PROMISSORY NOTE",
    "Loan No.: LN-900001",
    "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
  ].join("\n");
  const normalized = normalizeMortgagePackageAnalysis(result(pages, aggregateContent));

  assert.equal(normalized.context.jurisdiction.code, "TX");
  assert.equal(normalized.context.jurisdiction.evidence.page, 1);
  assert.equal(normalized.context.jurisdiction.evidence.excerpt, "Property Address : 7408 Willow Bend Drive, Plano, TX 75024");
  assert.ok(Array.isArray(normalized.context.jurisdiction.evidence.polygon));
});

test("keeps unresolved package context explicit instead of inventing a profile", () => {
  const normalized = normalizeMortgagePackageAnalysis(result([
    page(1, ["PROMISSORY NOTE", "Loan No.: LN-100001", "promise to pay"]),
    page(2, ["MISCELLANEOUS ATTACHMENT", "Unrecognized package content"]),
  ]));

  assert.equal(normalized.package.documents[1].type, "Unknown document");
  assert.deepEqual(normalized.package.unknownPages, [2]);
  assert.equal(normalized.context.jurisdiction.code, null);
  assert.equal(normalized.context.profileResolution.status, "Needs context");
  assert.equal(normalized.context.profileResolution.requiresHumanConfirmation, true);
  assert.equal(normalized.package.status, "Needs Package Review");
});
