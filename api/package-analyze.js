import { isAzureConfigured } from "../server/lib/azureDocumentIntelligence.js";
import { startPdfBatchAnalysis } from "../server/lib/pdfBatchAnalysis.js";
import { checkRateLimit, getClientIp, validatePdfPayload } from "../server/lib/requestGuards.js";

function send(response, status, payload) {
  response.status(status).json(payload);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return send(response, 405, { error: "Method not allowed" });
  }

  if (!isAzureConfigured()) {
    return send(response, 503, {
      error: "Azure Document Intelligence is not configured for this deployment.",
      code: "AZURE_NOT_CONFIGURED",
    });
  }

  const { base64Source, fileName, mimeType } = request.body || {};
  const validation = validatePdfPayload({ base64Source, mimeType });
  if (!validation.ok) return send(response, validation.status, { error: validation.error });

  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit({ key: `package-analyze:${clientIp}` });
  response.setHeader("X-RateLimit-Limit", "5");
  response.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining));
  response.setHeader("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetAt / 1000)));

  if (!rateLimit.allowed) {
    response.setHeader("Retry-After", String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))));
    return send(response, 429, {
      error: "Package analysis limit reached. Please try again after the current hourly window resets.",
      code: "RATE_LIMITED",
    });
  }

  try {
    const batch = await startPdfBatchAnalysis({ base64Source });
    return send(response, 202, {
      analysisId: batch.analysisId,
      status: "running",
      fileName,
      decodedBytes: validation.decodedBytes,
      provider: "Azure AI Document Intelligence",
      modelId: batch.modelId,
      apiVersion: batch.apiVersion,
      pageScope: `1-${batch.analyzedPageCount}`,
      sourcePageCount: batch.sourcePageCount,
      analysisChunks: batch.chunkCount,
      pagesPerRequest: batch.operations.length ? batch.operations[0].endPage - batch.operations[0].startPage + 1 : 0,
      rateLimitRemaining: rateLimit.remaining,
    });
  } catch (error) {
    console.error("Package analysis start failed", error);
    return send(response, error.statusCode || 502, { error: error.message || "Unable to start package analysis" });
  }
}
