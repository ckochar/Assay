import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  combineBatchAnalysisResults,
  decodeBatchAnalysisId,
  encodeBatchAnalysisId,
  getPdfBatchAnalysis,
  splitPdfBase64,
  startPdfBatchAnalysis,
} from "../server/lib/pdfBatchAnalysis.js";

async function createPdf(pageCount) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage([612, 792]);
    page.drawText(`Page ${index + 1}`, { x: 50, y: 700, size: 12, font });
  }
  return Buffer.from(await pdf.save()).toString("base64");
}

function rawResult(pageTexts) {
  return {
    status: "succeeded",
    analyzeResult: {
      modelId: "prebuilt-layout",
      apiVersion: "2024-11-30",
      content: pageTexts.join("\n"),
      pages: pageTexts.map((text, index) => ({
        pageNumber: index + 1,
        width: 8.5,
        height: 11,
        unit: "inch",
        lines: [{ content: text }],
        words: [{ content: text, confidence: 0.99 }],
      })),
    },
  };
}

test("splits an eight-page package into four two-page Azure requests", async () => {
  const split = await splitPdfBase64({ base64Source: await createPdf(8), pagesPerRequest: 2, maxTotalPages: 8 });
  assert.equal(split.sourcePageCount, 8);
  assert.equal(split.analyzedPageCount, 8);
  assert.equal(split.chunks.length, 4);
  assert.deepEqual(split.chunks.map(({ startPage, endPage, pageCount }) => ({ startPage, endPage, pageCount })), [
    { startPage: 1, endPage: 2, pageCount: 2 },
    { startPage: 3, endPage: 4, pageCount: 2 },
    { startPage: 5, endPage: 6, pageCount: 2 },
    { startPage: 7, endPage: 8, pageCount: 2 },
  ]);
});

test("caps package analysis at the first eight pages", async () => {
  const split = await splitPdfBase64({ base64Source: await createPdf(10), pagesPerRequest: 2, maxTotalPages: 8 });
  assert.equal(split.sourcePageCount, 10);
  assert.equal(split.analyzedPageCount, 8);
  assert.equal(split.chunks.at(-1).endPage, 8);
});

test("batch IDs round-trip Azure result IDs and source page ranges", () => {
  const operations = [
    { resultId: "11111111-1111-1111-1111-111111111111", startPage: 1, endPage: 2 },
    { resultId: "22222222-2222-2222-2222-222222222222", startPage: 3, endPage: 4 },
  ];
  const encoded = encodeBatchAnalysisId({ operations, analyzedPageCount: 4 });
  const decoded = decodeBatchAnalysisId(encoded);
  assert.equal(decoded.analyzedPageCount, 4);
  assert.deepEqual(decoded.operations, operations);
});

test("recombines Azure chunks with original package page numbers", () => {
  const combined = combineBatchAnalysisResults([
    { startPage: 1, endPage: 2, raw: rawResult(["one", "two"]) },
    { startPage: 3, endPage: 4, raw: rawResult(["three", "four"]) },
  ]);
  assert.equal(combined.status, "succeeded");
  assert.deepEqual(combined.analyzeResult.pages.map((page) => page.pageNumber), [1, 2, 3, 4]);
  assert.equal(combined.analyzeResult.pages[2].lines[0].content, "three");
});

test("starts chunks sequentially and returns one opaque analysis ID", async () => {
  const starts = [];
  const waits = [];
  const result = await startPdfBatchAnalysis({
    base64Source: await createPdf(4),
    config: { pagesPerRequest: 2, maxTotalPages: 8, throttleMs: 1100 },
    wait: async (ms) => waits.push(ms),
    startAnalysis: async ({ pages }) => {
      const id = `${String(starts.length + 1).repeat(8)}-1111-1111-1111-111111111111`;
      starts.push(pages);
      return { resultId: id, modelId: "prebuilt-layout", apiVersion: "2024-11-30" };
    },
  });
  assert.deepEqual(starts, ["1-2", "1-2"]);
  assert.deepEqual(waits, [1100]);
  assert.equal(result.chunkCount, 2);
  assert.ok(result.analysisId.startsWith("batch_"));
});

test("polls batched results sequentially and rebases the completed package", async () => {
  const operations = [
    { resultId: "11111111-1111-1111-1111-111111111111", startPage: 1, endPage: 2 },
    { resultId: "22222222-2222-2222-2222-222222222222", startPage: 3, endPage: 4 },
  ];
  const calls = [];
  const waits = [];
  const analysisId = encodeBatchAnalysisId({ operations, analyzedPageCount: 4 });
  const rawById = new Map([
    [operations[0].resultId, rawResult(["one", "two"])],
    [operations[1].resultId, rawResult(["three", "four"])],
  ]);
  const combined = await getPdfBatchAnalysis({
    analysisId,
    config: { pagesPerRequest: 2, maxTotalPages: 8, throttleMs: 1100 },
    wait: async (ms) => waits.push(ms),
    getAnalysis: async (id) => { calls.push(id); return rawById.get(id); },
  });
  assert.deepEqual(calls, operations.map((item) => item.resultId));
  assert.deepEqual(waits, [1100]);
  assert.deepEqual(combined.analyzeResult.pages.map((page) => page.pageNumber), [1, 2, 3, 4]);
});
