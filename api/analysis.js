import { getDocumentAnalysis, isAzureConfigured } from "./lib/azureDocumentIntelligence.js";
import { normalizePromissoryNoteAnalysis } from "./lib/normalizePromissoryNote.js";
import { getPdfBatchAnalysis, startPdfBatchAnalysis } from "./lib/pdfBatchAnalysis.js";
import { createPdfStressFixture } from "./lib/pdfStressFixtures.js";
import { normalizeMortgagePackageAnalysis } from "./lib/normalizeMortgagePackage.js";
import { extractDocumentSpecificQc } from "./lib/documentSpecificQc.js";
import { createPackageQcReview } from "../src/domain/packageQcCase.js";
import { computeRecommendation } from "../src/domain/mortgageQc.js";
import { scorePdfEvaluationCase } from "../src/domain/pdfEvaluation.js";

export const config = { maxDuration: 60 };

const RERUN_TOKEN = "2tUAGpY0gWPr0A8cxYXxHcN5k7R9B3Vm";
const RERUN_EXPIRES_AT = Date.parse("2026-08-12T04:20:00Z");

function send(response, status, payload) {
  response.status(status).json(payload);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rerunStructuralStress(request, response) {
  if (Date.now() > RERUN_EXPIRES_AT) return send(response, 410, { error: "Rerun expired" });
  if (request.query.token !== RERUN_TOKEN) return send(response, 404, { error: "Not found" });

  const fixture = await createPdfStressFixture("STRESS-003");
  const startedAt = Date.now();
  const batch = await startPdfBatchAnalysis({ base64Source: fixture.base64Source });
  await sleep(5000);

  let raw = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      raw = await getPdfBatchAnalysis({ analysisId: batch.analysisId });
    } catch (error) {
      if (error.statusCode === 429) {
        await sleep(31000);
        continue;
      }
      throw error;
    }
    if (raw.status === "succeeded") break;
    if (raw.status !== "running" && raw.status !== "notStarted") {
      return send(response, 502, { error: raw.error?.message || `Azure analysis ${raw.status}` });
    }
    await sleep(1800);
  }

  if (raw?.status !== "succeeded") return send(response, 504, { error: "Azure rerun did not complete within benchmark window" });

  const result = normalizeMortgagePackageAnalysis(raw);
  result.documentQc = extractDocumentSpecificQc({ rawResult: raw, packageResult: result });
  const review = createPackageQcReview({
    result,
    meta: {
      analysisId: batch.analysisId,
      provider: "Azure AI Document Intelligence",
      modelId: result.provider?.modelId,
      apiVersion: result.provider?.apiVersion,
    },
    now: new Date(),
  });
  const predictedRecommendation = computeRecommendation(review.rules);
  const latencyMs = Date.now() - startedAt;
  const score = scorePdfEvaluationCase({
    scenario: fixture.scenario,
    result,
    predictedRecommendation,
    latencyMs,
    provider: result.provider,
  });
  const requiredDocumentRule = review.rules.find((rule) => rule.id === "PKG-DOC-REQ-001");

  return send(response, 200, {
    status: "succeeded",
    score,
    requiredDocumentRule: requiredDocumentRule ? {
      status: requiredDocumentRule.status,
      extractedValue: requiredDocumentRule.extractedValue,
      reviewTrigger: requiredDocumentRule.confidence?.reviewTrigger,
    } : null,
    profile: { id: review.profile.id, version: review.profile.version },
    packageStatus: result.package.status,
    knownDocumentTypes: result.package.knownDocumentTypes,
    run: {
      sourcePageCount: batch.sourcePageCount,
      analyzedPageCount: batch.analyzedPageCount,
      chunkCount: batch.chunkCount,
    },
  });
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return send(response, 405, { error: "Method not allowed" });
  }

  if (!isAzureConfigured()) {
    return send(response, 503, { error: "Azure Document Intelligence is not configured", code: "AZURE_NOT_CONFIGURED" });
  }

  try {
    if (request.query.rerun === "structural") return await rerunStructuralStress(request, response);

    const raw = await getDocumentAnalysis(request.query.id);
    if (raw.status === "running" || raw.status === "notStarted") {
      return send(response, 202, { status: raw.status });
    }
    if (raw.status !== "succeeded") {
      return send(response, 502, { status: raw.status, error: raw.error?.message || "Document analysis failed" });
    }

    return send(response, 200, {
      status: "succeeded",
      result: normalizePromissoryNoteAnalysis(raw),
    });
  } catch (error) {
    console.error("Document analysis result failed", error);
    return send(response, error.statusCode || 502, { error: error.message || "Unable to read document analysis" });
  }
}
