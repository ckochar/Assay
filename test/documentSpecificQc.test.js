import test from "node:test";
import assert from "node:assert/strict";
import { extractDocumentSpecificQc } from "../api/lib/documentSpecificQc.js";

function page(pageNumber, lines) {
  return {
    pageNumber,
    width: 8.5,
    height: 11,
    unit: "inch",
    lines: lines.map((content, index) => ({ content, polygon: [0.5, 0.7 + index * 0.2, 7.5, 0.7 + index * 0.2, 7.5, 0.9 + index * 0.2, 0.5, 0.9 + index * 0.2] })),
  };
}

function packageResult() {
  return {
    package: {
      documents: [
        { type: "Promissory Note", startPage: 1, endPage: 2 },
        { type: "Notice of Right to Cancel", startPage: 3, endPage: 3 },
        { type: "Notary Acknowledgment", startPage: 4, endPage: 4 },
      ],
    },
    context: { borrowers: ["Maya Patel", "Rohan Patel"] },
  };
}

test("extracts document-specific date, rescission, notary, and signature indicators with page evidence", () => {
  const rawResult = {
    analyzeResult: {
      pages: [
        page(1, ["PROMISSORY NOTE", "Date: August 9, 2026", "Borrower: Maya Patel", "Borrower: Rohan Patel"]),
        page(2, ["PROMISSORY NOTE", "Maya Patel", "Rohan Patel"]),
        page(3, ["NOTICE OF RIGHT TO CANCEL", "You may cancel this transaction within the applicable period."]),
        page(4, ["State of Texas", "Acknowledged before me on August 9, 2026.", "NOTARY PUBLIC", "My commission expires November 30, 2028."]),
      ],
    },
  };

  const qc = extractDocumentSpecificQc({ rawResult, packageResult: packageResult() });
  assert.equal(qc.noteExecutionDate.value, "2026-08-09");
  assert.equal(qc.noteExecutionDate.evidence.page, 1);
  assert.equal(qc.noteSignatureIndicators.indicators.length, 2);
  assert.ok(qc.noteSignatureIndicators.indicators.every((item) => item.indicatorDetected));
  assert.equal(qc.rightToCancel.titleDetected, true);
  assert.equal(qc.rightToCancel.cancelLanguageDetected, true);
  assert.deepEqual(qc.notaryAcknowledgment.fields, {
    venue: true,
    acknowledgment: true,
    notaryIndicator: true,
    commissionExpiration: true,
  });
});

test("does not invent document-specific checks when the document type is absent", () => {
  const rawResult = { analyzeResult: { pages: [page(1, ["CLOSING DISCLOSURE", "Loan Terms"])] } };
  const packageOnly = { package: { documents: [{ type: "Closing Disclosure", startPage: 1, endPage: 1 }] }, context: { borrowers: [] } };
  const qc = extractDocumentSpecificQc({ rawResult, packageResult: packageOnly });
  assert.equal(qc.noteExecutionDate, null);
  assert.equal(qc.noteSignatureIndicators, null);
  assert.equal(qc.rightToCancel, null);
  assert.equal(qc.notaryAcknowledgment, null);
});
