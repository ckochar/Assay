import { getDocumentAnalysis, isAzureConfigured } from "../server/lib/azureDocumentIntelligence.js";
import { normalizePromissoryNoteAnalysis } from "../server/lib/normalizePromissoryNote.js";

function send(response, status, payload) {
  response.status(status).json(payload);
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
