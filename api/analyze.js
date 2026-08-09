import { isAzureConfigured, startDocumentAnalysis } from "./lib/azureDocumentIntelligence.js";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

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
      setup: [
        "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT",
        "AZURE_DOCUMENT_INTELLIGENCE_KEY",
      ],
    });
  }

  const { base64Source, fileName, mimeType, size } = request.body || {};
  if (!base64Source || typeof base64Source !== "string") {
    return send(response, 400, { error: "A base64-encoded PDF is required" });
  }
  if (mimeType !== "application/pdf") {
    return send(response, 400, { error: "Only PDF files are supported in the first live workflow" });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) {
    return send(response, 400, { error: "PDF must be between 1 byte and 4 MB" });
  }

  const header = Buffer.from(base64Source.slice(0, 12), "base64").toString("ascii");
  if (!header.startsWith("%PDF")) {
    return send(response, 400, { error: "The uploaded file does not appear to be a valid PDF" });
  }

  try {
    const operation = await startDocumentAnalysis({ base64Source, pages: "1-2" });
    return send(response, 202, {
      analysisId: operation.resultId,
      status: "running",
      fileName,
      provider: "Azure AI Document Intelligence",
      modelId: operation.modelId,
      apiVersion: operation.apiVersion,
      pageScope: "1-2",
    });
  } catch (error) {
    console.error("Document analysis start failed", error);
    return send(response, error.statusCode || 502, { error: error.message || "Unable to start document analysis" });
  }
}
