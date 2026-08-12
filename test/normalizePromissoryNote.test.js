import test from "node:test";
import assert from "node:assert/strict";
import { normalizePromissoryNoteAnalysis } from "../server/lib/normalizePromissoryNote.js";

const mockResult = {
  status: "succeeded",
  analyzeResult: {
    modelId: "prebuilt-layout",
    apiVersion: "2024-11-30",
    content: [
      "PROMISSORY NOTE",
      "Loan No.: LN-900001",
      "Date: August 9, 2026",
      'FOR VALUE RECEIVED, Maya Patel and Rohan Patel (collectively, "Borrower")',
      "BORROWER EXECUTION",
      "Execution Date: August 9, 2026",
      "Borrower: Maya Patel",
      "Maya Patel",
      "Borrower: Rohan Patel",
      "Rohan Patel",
    ].join("\n"),
    pages: [
      {
        pageNumber: 1,
        width: 8.5,
        height: 11,
        unit: "inch",
        lines: [
          { content: "PROMISSORY NOTE", polygon: [1, 1, 2, 1, 2, 2, 1, 2] },
          { content: "Loan No.: LN-900001" },
          { content: "Date: August 9, 2026" },
          { content: 'FOR VALUE RECEIVED, Maya Patel and Rohan Patel (collectively, "Borrower")' },
        ],
        words: [{ content: "PROMISSORY", confidence: 0.99 }, { content: "NOTE", confidence: 0.99 }],
      },
      {
        pageNumber: 2,
        width: 8.5,
        height: 11,
        unit: "inch",
        lines: [
          { content: "BORROWER EXECUTION" },
          { content: "Execution Date: August 9, 2026", polygon: [{ x: 0.75, y: 1.45 }, { x: 3.4, y: 1.45 }, { x: 3.4, y: 1.65 }, { x: 0.75, y: 1.65 }] },
          { content: "Borrower: Maya Patel" },
          { content: "Maya Patel" },
          { content: "Borrower: Rohan Patel" },
          { content: "Rohan Patel" },
        ],
        words: [{ content: "Maya", confidence: 0.98 }, { content: "Rohan", confidence: 0.98 }],
      },
    ],
  },
};

test("normalizes classification, loan number, borrowers and execution date", () => {
  const result = normalizePromissoryNoteAnalysis(mockResult);
  assert.equal(result.document.type, "Promissory Note");
  assert.equal(result.document.loanNumber, "LN-900001");
  assert.deepEqual(result.document.borrowers, ["Maya Patel", "Rohan Patel"]);
  assert.equal(result.document.executionDate, "2026-08-09");
});

test("preserves Azure page geometry with evidence polygons", () => {
  const result = normalizePromissoryNoteAnalysis(mockResult);
  const dateRule = result.rules.find((rule) => rule.id === "DATE-001");
  assert.equal(dateRule.evidence.page, 2);
  assert.equal(dateRule.evidence.pageGeometry.width, 8.5);
  assert.equal(dateRule.evidence.pageGeometry.height, 11);
  assert.equal(dateRule.evidence.pageGeometry.unit, "inch");
  assert.equal(dateRule.evidence.polygon.length, 4);
});

test("routes signature indicators to human review rather than claiming validation", () => {
  const result = normalizePromissoryNoteAnalysis(mockResult);
  const signatureRule = result.rules.find((rule) => rule.id === "SIG-IND-001");
  assert.equal(signatureRule.status, "Needs Review");
  assert.equal(signatureRule.confidence.evidenceComplete, false);
  assert.match(signatureRule.confidence.reviewTrigger, /cannot establish legal signature validity/i);
});
