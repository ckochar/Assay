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
        { type: "Closing Disclosure", startPage: 3, endPage: 3 },
        { type: "Notice of Right to Cancel", startPage: 4, endPage: 4 },
        { type: "Notary Acknowledgment", startPage: 5, endPage: 5 },
      ],
    },
    context: { borrowers: ["Maya Patel", "Rohan Patel"] },
  };
}

test("extracts document dates, execution indicators, notary dates, and borrower consistency with page evidence", () => {
  const rawResult = {
    analyzeResult: {
      pages: [
        page(1, ["PROMISSORY NOTE", "Date: August 9, 2026", "Borrower: Maya Patel", "Borrower: Rohan Patel"]),
        page(2, ["PROMISSORY NOTE", "Signature: Maya Patel", "Signature: Rohan Patel"]),
        page(3, ["CLOSING DISCLOSURE", "Closing Date: August 9, 2026", "Borrower: Maya Patel", "Borrower: Rohan Patel"]),
        page(4, ["NOTICE OF RIGHT TO CANCEL", "Transaction Date: August 9, 2026", "Cancellation Deadline: August 12, 2026", "You may cancel this transaction within the applicable period.", "Borrower: Maya Patel", "Borrower: Rohan Patel"]),
        page(5, ["State of Texas", "Acknowledged before me on August 9, 2026.", "NOTARY PUBLIC", "My commission expires November 30, 2028."]),
      ],
    },
  };

  const qc = extractDocumentSpecificQc({ rawResult, packageResult: packageResult() });
  assert.equal(qc.noteExecutionDate.value, "2026-08-09");
  assert.equal(qc.closingDate.value, "2026-08-09");
  assert.equal(qc.noteExecutionDate.evidence.page, 1);
  assert.equal(qc.noteSignatureIndicators.indicators.length, 2);
  assert.ok(qc.noteSignatureIndicators.indicators.every((item) => item.indicatorDetected));
  assert.ok(qc.noteSignatureIndicators.indicators.every((item) => item.indicatorBasis === "Explicit signature text indicator"));
  assert.equal(qc.rightToCancel.titleDetected, true);
  assert.equal(qc.rightToCancel.cancelLanguageDetected, true);
  assert.equal(qc.rightToCancel.transactionDate, "2026-08-09");
  assert.equal(qc.rightToCancel.cancellationDeadline, "2026-08-12");
  assert.ok(qc.rightToCancel.borrowerIndicators.every((item) => item.detected));
  assert.deepEqual(qc.notaryAcknowledgment.fields, {
    venue: true,
    acknowledgment: true,
    notaryIndicator: true,
    commissionExpiration: true,
  });
  assert.equal(qc.notaryAcknowledgment.acknowledgmentDate, "2026-08-09");
  assert.equal(qc.notaryAcknowledgment.commissionExpirationDate, "2028-11-30");
  assert.equal(qc.borrowerConsistency.comparable, true);
  assert.equal(qc.borrowerConsistency.consistent, true);
});

test("surfaces cross-document borrower mismatches rather than normalizing them away", () => {
  const rawResult = {
    analyzeResult: {
      pages: [
        page(1, ["PROMISSORY NOTE", "Borrower: Maya Patel", "Borrower: Rohan Patel"]),
        page(2, ["PROMISSORY NOTE", "Signature: Maya Patel", "Signature: Rohan Patel"]),
        page(3, ["CLOSING DISCLOSURE", "Borrower: Maya Patel"]),
        page(4, ["NOTICE OF RIGHT TO CANCEL"]),
        page(5, ["State of Texas"]),
      ],
    },
  };
  const qc = extractDocumentSpecificQc({ rawResult, packageResult: packageResult() });
  assert.equal(qc.borrowerConsistency.comparable, true);
  assert.equal(qc.borrowerConsistency.consistent, false);
  assert.equal(qc.borrowerConsistency.inconsistentDocuments[0].documentType, "Closing Disclosure");
});

test("does not invent document-specific checks when the document type is absent", () => {
  const rawResult = { analyzeResult: { pages: [page(1, ["CLOSING DISCLOSURE", "Loan Terms"])] } };
  const packageOnly = { package: { documents: [{ type: "Closing Disclosure", startPage: 1, endPage: 1 }] }, context: { borrowers: [] } };
  const qc = extractDocumentSpecificQc({ rawResult, packageResult: packageOnly });
  assert.equal(qc.noteExecutionDate, null);
  assert.equal(qc.closingDate.value, null);
  assert.equal(qc.noteSignatureIndicators, null);
  assert.equal(qc.rightToCancel, null);
  assert.equal(qc.notaryAcknowledgment, null);
  assert.equal(qc.borrowerConsistency, null);
});
