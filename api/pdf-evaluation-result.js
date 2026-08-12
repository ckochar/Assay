import { getDocumentAnalysis, isAzureConfigured } from "./lib/azureDocumentIntelligence.js";
import { normalizeMortgagePackageAnalysis } from "./lib/normalizeMortgagePackage.js";
import { extractDocumentSpecificQc } from "./lib/documentSpecificQc.js";
import { getPdfEvaluationScenario } from "./lib/pdfEvaluationFixtures.js";
import { createPackageQcReview } from "../src/domain/packageQcCase.js";
import { computeRecommendation } from "../src/domain/mortgageQc.js";
import { scorePdfEvaluationCase } from "../src/domain/pdfEvaluation.js";

function send(response, status, payload) {
  response.status(status).json(payload);
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return send(response, 405, { error: "Method not allowed" });
  }

  if (!isAzureConfigured()) return send(response, 503, { error: "Azure Document Intelligence is not configured" });
  const scenario = getPdfEvaluationScenario(request.query.scenario);
  if (!scenario) return send(response, 404, { error: "Unknown evaluation scenario" });

  const startedAt = Number(request.query.startedAt);
  try {
    const raw = await getDocumentAnalysis(request.query.id);
    if (raw.status === "running" || raw.status === "notStarted") return send(response, 202, { status: raw.status });
    if (raw.status !== "succeeded") return send(response, 502, { status: raw.status, error: raw.error?.message || "PDF evaluation failed" });

    const result = normalizeMortgagePackageAnalysis(raw);
    result.documentQc = extractDocumentSpecificQc({ rawResult: raw, packageResult: result });
    const review = createPackageQcReview({
      result,
      meta: { analysisId: request.query.id, provider: "Azure AI Document Intelligence", modelId: raw?.analyzeResult?.modelId, apiVersion: raw?.analyzeResult?.apiVersion },
      now: new Date(),
    });
    const predictedRecommendation = computeRecommendation(review.rules);
    const latencyMs = Number.isFinite(startedAt) ? Date.now() - startedAt : null;
    const score = scorePdfEvaluationCase({
      scenario,
      result,
      predictedRecommendation,
      latencyMs,
      provider: result.provider,
    });

    return send(response, 200, {
      status: "succeeded",
      score,
      packageStatus: result.package.status,
      unknownPages: result.package.unknownPages,
      lowConfidencePages: result.package.lowConfidencePages,
      profileResolution: result.context.profileResolution,
    });
  } catch (error) {
    console.error("PDF evaluation result failed", error);
    return send(response, error.statusCode || 502, { error: error.message || "Unable to read PDF evaluation" });
  }
}
