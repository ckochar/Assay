import { isAzureConfigured } from "./lib/azureDocumentIntelligence.js";
import { startPdfBatchAnalysis } from "./lib/pdfBatchAnalysis.js";
import { createPdfEvaluationFixture, getPdfEvaluationScenario } from "./lib/pdfEvaluationFixtures.js";

const TOKEN = "eKVUexBftAzL7rttdqY9M69rISjLlvC1i3Kan-feNkU";
const EXPIRES_AT = Date.parse("2026-08-12T03:20:00Z");

function send(response, status, payload) { response.status(status).json(payload); }

export default async function handler(request, response) {
  if (request.method !== "GET") return send(response, 405, { error: "Method not allowed" });
  if (Date.now() > EXPIRES_AT) return send(response, 410, { error: "Benchmark starter expired" });
  if (request.query.token !== TOKEN) return send(response, 404, { error: "Not found" });
  const scenario = getPdfEvaluationScenario(request.query.scenario);
  if (!scenario) return send(response, 404, { error: "Unknown scenario" });
  if (!isAzureConfigured()) return send(response, 503, { error: "Azure is not configured" });
  try {
    const fixture = await createPdfEvaluationFixture(scenario.id);
    const startedAt = Date.now();
    const batch = await startPdfBatchAnalysis({ base64Source: fixture.base64Source });
    return send(response, 202, {
      scenario: scenario.id,
      analysisId: batch.analysisId,
      startedAt,
      sourcePageCount: batch.sourcePageCount,
      analyzedPageCount: batch.analyzedPageCount,
      chunkCount: batch.chunkCount,
      modelId: batch.modelId,
      apiVersion: batch.apiVersion,
    });
  } catch (error) {
    return send(response, error.statusCode || 502, { error: error.message || "Unable to start benchmark" });
  }
}
