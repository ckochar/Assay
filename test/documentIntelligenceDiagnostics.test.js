import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDocumentIntelligenceDiagnostics,
  classifyDocumentIntelligenceHealth,
  summarizeDocumentIntelligenceHealth,
} from "../server/lib/documentIntelligenceDiagnostics.js";

function word(content, confidence = 0.94) {
  return { content, confidence, polygon: [0, 0, 1, 0, 1, 0.2, 0, 0.2] };
}

test("diagnostics distinguish confidence from OCR coverage", () => {
  const raw = {
    analyzeResult: {
      pages: [
        { pageNumber: 1, words: [word("PROMISSORY"), word("NOTE")], lines: [] },
        { pageNumber: 2, words: [], lines: [] },
      ],
    },
  };

  const summary = summarizeDocumentIntelligenceHealth(raw);
  assert.equal(summary.pageCount, 2);
  assert.equal(summary.pagesWithWords, 1);
  assert.equal(summary.wordCoverageByPage, 0.5);
  assert.equal(summary.averageWordConfidence, 0.94);
  assert.equal(classifyDocumentIntelligenceHealth(summary), "PARTIAL_PAGE_COVERAGE");
});

test("diagnostics identify words-only provider shape", () => {
  const raw = {
    analyzeResult: {
      pages: [
        { pageNumber: 1, words: [word("PROMISSORY"), word("NOTE")], lines: [] },
        { pageNumber: 2, words: [word("Loan"), word("Number")], lines: [] },
      ],
    },
  };

  const summary = summarizeDocumentIntelligenceHealth(raw);
  assert.equal(summary.wordCoverageByPage, 1);
  assert.equal(summary.lineAvailabilityByPage, 0);
  assert.equal(summary.textAvailabilityByPage, 1);
  assert.equal(classifyDocumentIntelligenceHealth(summary), "WORDS_WITHOUT_LINES");
});

test("diagnostics classify no OCR text separately from empty package", () => {
  const noText = summarizeDocumentIntelligenceHealth({ analyzeResult: { pages: [{ pageNumber: 1, words: [], lines: [] }] } });
  assert.equal(classifyDocumentIntelligenceHealth(noText), "NO_OCR_TEXT");

  const noPages = summarizeDocumentIntelligenceHealth({ analyzeResult: { pages: [] } });
  assert.equal(classifyDocumentIntelligenceHealth(noPages), "NO_PAGES");
});

test("reusable diagnostics payload preserves page rows and health classification", () => {
  const diagnostics = buildDocumentIntelligenceDiagnostics({
    analyzeResult: {
      pages: [
        { pageNumber: 1, words: [word("PROMISSORY", 0.91)], lines: [] },
        { pageNumber: 2, words: [], lines: [] },
      ],
    },
  });

  assert.equal(diagnostics.health, "PARTIAL_PAGE_COVERAGE");
  assert.equal(diagnostics.pageCount, 2);
  assert.equal(diagnostics.pageRows.length, 2);
  assert.equal(diagnostics.pageRows[0].words, 1);
  assert.equal(diagnostics.pageRows[1].words, 0);
  assert.equal(diagnostics.averageWordConfidence, 0.91);
});
