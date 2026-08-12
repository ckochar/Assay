import test from "node:test";
import assert from "node:assert/strict";
import { ocrLinesForPage } from "../server/lib/azureTextLayout.js";
import { normalizeMortgagePackageAnalysis } from "../server/lib/normalizeMortgagePackage.js";
import { extractDocumentSpecificQc } from "../server/lib/documentSpecificQc.js";

function word(content, x, y, confidence = 0.93) {
  const width = Math.max(0.12, content.length * 0.055);
  return {
    content,
    confidence,
    polygon: [x, y, x + width, y, x + width, y + 0.08, x, y + 0.08],
  };
}

function wordsForLine(text, y) {
  let x = 0.55;
  return text.split(/\s+/).map((token) => {
    const item = word(token, x, y);
    x += Math.max(0.18, token.length * 0.06 + 0.08);
    return item;
  });
}

function wordsOnlyPage(pageNumber, lines) {
  return {
    pageNumber,
    width: 8.5,
    height: 11,
    unit: "inch",
    lines: [],
    words: lines.flatMap((line, index) => wordsForLine(line, 0.7 + index * 0.3)),
  };
}

test("reconstructs readable lines from word geometry when Azure lines are absent", () => {
  const page = wordsOnlyPage(1, [
    "PROMISSORY NOTE",
    "Loan No.: LN-900001",
    "Date: August 9, 2026",
  ]);
  const lines = ocrLinesForPage(page);
  assert.equal(lines.length, 3);
  assert.equal(lines[0].content, "PROMISSORY NOTE");
  assert.equal(lines[1].source, "word-fallback");
  assert.ok(Array.isArray(lines[1].polygon));
});

test("package normalization recovers classification and context from words-only OCR", () => {
  const pages = [
    wordsOnlyPage(1, [
      "PROMISSORY NOTE",
      "Loan No.: LN-900001",
      "Date: August 9, 2026",
      'FOR VALUE RECEIVED, Maya Patel and Rohan Patel (collectively, "Borrower")',
      "promise to pay the principal sum",
      "Property Address: 7408 Willow Bend Drive, Plano, TX 75024",
      "Borrower: Maya Patel",
      "Borrower: Rohan Patel",
    ]),
    wordsOnlyPage(2, ["PROMISSORY NOTE", "Signature: Maya Patel", "Signature: Rohan Patel"]),
    wordsOnlyPage(3, ["DEED OF TRUST", "This security instrument covers the property", "Loan No.: LN-900001"]),
    wordsOnlyPage(4, ["CLOSING DISCLOSURE", "Loan Terms", "Projected Payments", "Cash to Close", "Closing Date: August 9, 2026"]),
    wordsOnlyPage(5, ["NOTICE OF RIGHT TO CANCEL", "Transaction Date: August 9, 2026", "Cancellation Deadline: August 12, 2026", "You may cancel this transaction"]),
    wordsOnlyPage(6, ["OCCUPANCY AFFIDAVIT", "Borrower intends to occupy the property as a principal residence"]),
    wordsOnlyPage(7, ["SIGNATURE NAME AFFIDAVIT", "Maya Patel and Rohan Patel certify they are the same person"]),
    wordsOnlyPage(8, ["NOTARY ACKNOWLEDGMENT", "State of Texas", "Acknowledged before me on August 9, 2026", "NOTARY PUBLIC", "My commission expires November 30, 2028"]),
  ];

  const raw = { status: "succeeded", analyzeResult: { modelId: "prebuilt-layout", apiVersion: "2024-11-30", content: "", pages } };
  const normalized = normalizeMortgagePackageAnalysis(raw);
  assert.equal(normalized.package.unknownPages.length, 0);
  assert.equal(normalized.context.loanNumber, "LN-900001");
  assert.deepEqual(normalized.context.borrowers, ["Maya Patel", "Rohan Patel"]);
  assert.equal(normalized.context.jurisdiction.code, "TX");
  assert.equal(normalized.context.loanNumberEvidence.source, "word-fallback");

  normalized.documentQc = extractDocumentSpecificQc({ rawResult: raw, packageResult: normalized });
  assert.equal(normalized.documentQc.noteExecutionDate.value, "2026-08-09");
  assert.equal(normalized.documentQc.closingDate.value, "2026-08-09");
  assert.equal(normalized.documentQc.rightToCancel.cancellationDeadline, "2026-08-12");
  assert.equal(normalized.documentQc.notaryAcknowledgment.acknowledgmentDate, "2026-08-09");
  assert.equal(normalized.documentQc.notaryAcknowledgment.commissionExpirationDate, "2028-11-30");
  assert.equal(normalized.documentQc.notaryAcknowledgment.acknowledgmentDateEvidence.source, "word-fallback");
});
