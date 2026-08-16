import { isAzureConfigured } from "../server/lib/azureDocumentIntelligence.js";
import { getPdfBatchAnalysis } from "../server/lib/pdfBatchAnalysis.js";
import { normalizeMortgagePackageAnalysis } from "../server/lib/normalizeMortgagePackage.js";
import { extractDocumentSpecificQc } from "../server/lib/documentSpecificQc.js";
import { buildDocumentIntelligenceDiagnostics } from "../server/lib/documentIntelligenceDiagnostics.js";

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
    const raw = await getPdfBatchAnalysis({ analysisId: request.query.id });
    if (raw.status === "running" || raw.status === "notStarted") return send(response, 202, { status: raw.status });
    if (raw.status !== "succeeded") return send(response, 502, { status: raw.status, error: raw.error?.message || "Package analysis failed" });

    const result = normalizeMortgagePackageAnalysis(raw);
    result.documentQc = extractDocumentSpecificQc({ rawResult: raw, packageResult: result });
    result.observability = {
      provider: buildDocumentIntelligenceDiagnostics(raw),
    };

    return send(response, 200, {
      status: "succeeded",
      result,
    });
  } catch (error) {
    console.error("Package analysis result failed", error);
    return send(response, error.statusCode || 502, { error: error.message || "Unable to read package analysis" });
  }
}
