import { PDFDocument } from "pdf-lib";
import { getDocumentAnalysis, startDocumentAnalysis } from "./azureDocumentIntelligence.js";

const DEFAULT_CHUNK_PAGES = 2;
const DEFAULT_TOTAL_PAGES = 8;
const DEFAULT_THROTTLE_MS = 1100;
const BATCH_PREFIX = "batch_";

function clampInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getPdfBatchConfig() {
  return {
    pagesPerRequest: clampInteger(process.env.AZURE_DOCUMENT_INTELLIGENCE_MAX_PAGES_PER_REQUEST, DEFAULT_CHUNK_PAGES, 1, DEFAULT_TOTAL_PAGES),
    maxTotalPages: clampInteger(process.env.ASSAY_PACKAGE_MAX_PAGES, DEFAULT_TOTAL_PAGES, 1, DEFAULT_TOTAL_PAGES),
    throttleMs: clampInteger(process.env.AZURE_DOCUMENT_INTELLIGENCE_THROTTLE_MS, DEFAULT_THROTTLE_MS, 0, 5000),
  };
}

export async function splitPdfBase64({ base64Source, pagesPerRequest = DEFAULT_CHUNK_PAGES, maxTotalPages = DEFAULT_TOTAL_PAGES }) {
  const source = await PDFDocument.load(Buffer.from(base64Source, "base64"));
  const pageCount = Math.min(source.getPageCount(), maxTotalPages);
  const chunks = [];

  for (let startIndex = 0; startIndex < pageCount; startIndex += pagesPerRequest) {
    const endIndexExclusive = Math.min(pageCount, startIndex + pagesPerRequest);
    const target = await PDFDocument.create();
    const indices = Array.from({ length: endIndexExclusive - startIndex }, (_, offset) => startIndex + offset);
    const copied = await target.copyPages(source, indices);
    copied.forEach((page) => target.addPage(page));
    const bytes = await target.save();
    chunks.push({
      startPage: startIndex + 1,
      endPage: endIndexExclusive,
      pageCount: endIndexExclusive - startIndex,
      base64Source: Buffer.from(bytes).toString("base64"),
    });
  }

  return { sourcePageCount: source.getPageCount(), analyzedPageCount: pageCount, chunks };
}

export function encodeBatchAnalysisId({ operations, analyzedPageCount }) {
  const payload = { v: 1, analyzedPageCount, operations };
  return `${BATCH_PREFIX}${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;
}

export function decodeBatchAnalysisId(value) {
  if (!String(value || "").startsWith(BATCH_PREFIX)) return null;
  try {
    const payload = JSON.parse(Buffer.from(String(value).slice(BATCH_PREFIX.length), "base64url").toString("utf8"));
    if (payload?.v !== 1 || !Array.isArray(payload.operations) || payload.operations.length === 0) throw new Error("Invalid batch payload");
    for (const operation of payload.operations) {
      if (!/^[a-zA-Z0-9-]{8,}$/.test(operation?.resultId || "")) throw new Error("Invalid result ID");
      if (!Number.isInteger(operation.startPage) || !Number.isInteger(operation.endPage) || operation.startPage < 1 || operation.endPage < operation.startPage) throw new Error("Invalid page range");
    }
    return payload;
  } catch {
    const error = new Error("Invalid batch analysis ID");
    error.statusCode = 400;
    throw error;
  }
}

export async function startPdfBatchAnalysis({
  base64Source,
  config = getPdfBatchConfig(),
  startAnalysis = startDocumentAnalysis,
  wait = sleep,
} = {}) {
  const split = await splitPdfBase64({
    base64Source,
    pagesPerRequest: config.pagesPerRequest,
    maxTotalPages: config.maxTotalPages,
  });
  const operations = [];
  let modelId = null;
  let apiVersion = null;

  for (let index = 0; index < split.chunks.length; index += 1) {
    if (index > 0 && config.throttleMs > 0) await wait(config.throttleMs);
    const chunk = split.chunks[index];
    const operation = await startAnalysis({ base64Source: chunk.base64Source, pages: `1-${chunk.pageCount}` });
    modelId ||= operation.modelId;
    apiVersion ||= operation.apiVersion;
    operations.push({ resultId: operation.resultId, startPage: chunk.startPage, endPage: chunk.endPage });
  }

  return {
    analysisId: encodeBatchAnalysisId({ operations, analyzedPageCount: split.analyzedPageCount }),
    operations,
    sourcePageCount: split.sourcePageCount,
    analyzedPageCount: split.analyzedPageCount,
    chunkCount: operations.length,
    modelId,
    apiVersion,
  };
}

function rebasePage(page, startPage) {
  return { ...page, pageNumber: startPage + (page?.pageNumber || 1) - 1 };
}

export function combineBatchAnalysisResults(items) {
  const succeeded = items.filter((item) => item.raw?.status === "succeeded");
  const first = succeeded[0]?.raw?.analyzeResult || {};
  return {
    status: "succeeded",
    analyzeResult: {
      modelId: first.modelId || "prebuilt-layout",
      apiVersion: first.apiVersion || "2024-11-30",
      content: succeeded.map((item) => item.raw?.analyzeResult?.content || "").filter(Boolean).join("\n"),
      pages: succeeded.flatMap((item) => (item.raw?.analyzeResult?.pages || []).map((page) => rebasePage(page, item.startPage))),
    },
  };
}

export async function getPdfBatchAnalysis({
  analysisId,
  config = getPdfBatchConfig(),
  getAnalysis = getDocumentAnalysis,
  wait = sleep,
} = {}) {
  const batch = decodeBatchAnalysisId(analysisId);
  if (!batch) return getAnalysis(analysisId);

  const items = [];
  for (let index = 0; index < batch.operations.length; index += 1) {
    if (index > 0 && config.throttleMs > 0) await wait(config.throttleMs);
    const operation = batch.operations[index];
    const raw = await getAnalysis(operation.resultId);
    if (raw.status === "running" || raw.status === "notStarted") return { status: raw.status };
    if (raw.status !== "succeeded") return raw;
    items.push({ raw, startPage: operation.startPage, endPage: operation.endPage });
  }

  return combineBatchAnalysisResults(items);
}
