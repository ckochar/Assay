import { isAzureConfigured, startDocumentAnalysis } from "./lib/azureDocumentIntelligence.js";
import { createPdfEvaluationFixture, getPdfEvaluationScenario } from "./lib/pdfEvaluationFixtures.js";

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

  try {
    const fixture = await createPdfEvaluationFixture(scenario.id);
    const startedAt = Date.now();
    const operation = await startDocumentAnalysis({ base64Source: fixture.base64Source, pages: "1-8" });
    return send(response, 202, {
      status: "running",
      scenario: { id: scenario.id, name: scenario.name, category: scenario.category },
      analysisId: operation.resultId,
      startedAt,
      pageCount: fixture.pageCount,
      decodedBytes: fixture.byteLength,
      provider: "Azure AI Document Intelligence",
      modelId: operation.modelId,
      apiVersion: operation.apiVersion,
    });
  } catch (error) {
    console.error("PDF evaluation start failed", error);
    return send(response, error.statusCode || 502, { error: error.message || "Unable to start PDF evaluation" });
  }
}
