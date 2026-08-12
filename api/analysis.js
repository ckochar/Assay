import { getDocumentAnalysis, isAzureConfigured } from "../server/lib/azureDocumentIntelligence.js";
import { normalizePromissoryNoteAnalysis } from "../server/lib/normalizePromissoryNote.js";
import { createPdfRasterStressFixture, getPdfRasterStressScenario } from "../server/fixtures/pdfRasterStressFixtures.js";
import { startPdfBatchAnalysis, getPdfBatchAnalysis } from "../server/lib/pdfBatchAnalysis.js";
import { normalizeMortgagePackageAnalysis } from "../server/lib/normalizeMortgagePackage.js";
import { extractDocumentSpecificQc } from "../server/lib/documentSpecificQc.js";
import { createPackageQcReview } from "../src/domain/packageQcCase.js";
import { computeRecommendation } from "../src/domain/mortgageQc.js";
import { scorePdfEvaluationCase } from "../src/domain/pdfEvaluation.js";

const RASTER_VALIDATION_TOKEN = "raster-postfix-7f3a91c2";
const RASTER_VALIDATION_EXPIRES_AT = Date.parse("2026-08-12T22:00:00Z");
const RASTER_CASES = new Set(["RASTER-001", "RASTER-002"]);

function send(response, status, payload) {
  response.status(status).json(payload);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRasterValidation(id) {
  const scenario = getPdfRasterStressScenario(id);
  const fixture = await createPdfRasterStressFixture(id);
  const startedAt = Date.now();
  const batch = await startPdfBatchAnalysis({ base64Source: fixture.base64Source });
  let raw = null;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      raw = await getPdfBatchAnalysis({ analysisId: batch.analysisId });
    } catch (error) {
      if (error?.statusCode === 429) {
        await sleep(2500);
        continue;
      }
      throw error;
    }

    if (raw?.status === "succeeded") break;
    if (raw?.status !== "running" && raw?.status !== "notStarted") {
      throw new Error(`Azure raster validation ${id} failed with ${raw?.status || "unknown"}`);
    }
    await sleep(1250);
  }

  if (raw?.status !== "succeeded") throw new Error(`Azure raster validation ${id} timed out`);

  const result = normalizeMortgagePackageAnalysis(raw);
  result.documentQc = extractDocumentSpecificQc({ rawResult: raw, packageResult: result });
  const qcCase = createPackageQcReview({
    result,
    meta: { analysisId: batch.analysisId, modelId: batch.modelId, apiVersion: batch.apiVersion },
  });
  const predictedRecommendation = computeRecommendation(qcCase.rules);
  const score = scorePdfEvaluationCase({
    scenario,
    result,
    predictedRecommendation,
    latencyMs: Date.now() - startedAt,
    provider: result.provider,
  });

  return {
    id: score.id,
    predictedRecommendation: score.predictedRecommendation,
    expectedRecommendation: score.expectedRecommendation,
    classification: { correct: score.classification.correct, total: score.classification.total, rows: score.classification.rows },
    extraction: { correct: score.extraction.correct, total: score.extraction.total, rows: score.extraction.rows },
    evidence: { correct: score.evidence.correct, present: score.evidence.present, total: score.evidence.total, rows: score.evidence.rows },
    recommendation: score.recommendation,
    latencyMs: score.latencyMs,
    pagesAnalyzed: score.pagesAnalyzed,
    ocrQuality: score.ocrQuality,
    fixture: {
      dpi: scenario.dpi,
      jpegQuality: scenario.jpegQuality,
      blurSigma: scenario.blurSigma,
      rotateDegrees: scenario.rotateDegrees,
      imageOnly: fixture.imageOnly,
    },
  };
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return send(response, 405, { error: "Method not allowed" });
  }

  if (!isAzureConfigured()) {
    return send(response, 503, { error: "Azure Document Intelligence is not configured", code: "AZURE_NOT_CONFIGURED" });
  }

  if (request.query.rasterValidation === "postfix") {
    const id = String(request.query.case || "");
    if (Date.now() > RASTER_VALIDATION_EXPIRES_AT) return send(response, 410, { error: "Raster validation window expired" });
    if (request.query.token !== RASTER_VALIDATION_TOKEN) return send(response, 403, { error: "Invalid raster validation token" });
    if (!RASTER_CASES.has(id)) return send(response, 400, { error: "Unknown raster validation case" });

    try {
      return send(response, 200, await runRasterValidation(id));
    } catch (error) {
      console.error("Post-fix raster validation failed", error);
      return send(response, error.statusCode || 502, { error: error.message || "Post-fix raster validation failed" });
    }
  }

  try {
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
