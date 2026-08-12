const DEFAULT_API_VERSION = "2024-11-30";
const DEFAULT_MODEL_ID = "prebuilt-layout";

function cleanEndpoint(endpoint) {
  return endpoint?.trim().replace(/\/+$/, "") || "";
}

export function getAzureConfig() {
  return {
    endpoint: cleanEndpoint(process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT),
    key: process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY?.trim() || "",
    apiVersion: process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION?.trim() || DEFAULT_API_VERSION,
    modelId: process.env.AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID?.trim() || DEFAULT_MODEL_ID,
  };
}

export function isAzureConfigured() {
  const { endpoint, key } = getAzureConfig();
  return Boolean(endpoint && key);
}

function errorMessage(payload, fallback) {
  return payload?.error?.message || payload?.message || fallback;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function startDocumentAnalysis({ base64Source, pages = "1-2" }) {
  const config = getAzureConfig();
  if (!config.endpoint || !config.key) {
    throw new Error("Azure Document Intelligence is not configured");
  }

  const url = new URL(
    `${config.endpoint}/documentintelligence/documentModels/${encodeURIComponent(config.modelId)}:analyze`,
  );
  url.searchParams.set("_overload", "analyzeDocument");
  url.searchParams.set("api-version", config.apiVersion);
  url.searchParams.set("pages", pages);
  url.searchParams.set("stringIndexType", "unicodeCodePoint");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": config.key,
    },
    body: JSON.stringify({ base64Source }),
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(errorMessage(payload, `Azure analyze request failed with ${response.status}`));
    error.statusCode = response.status;
    throw error;
  }

  const operationLocation = response.headers.get("operation-location");
  const resultId = operationLocation?.match(/\/analyzeResults\/([^?]+)/i)?.[1];

  if (!resultId) {
    throw new Error("Azure response did not include a usable analysis operation ID");
  }

  return {
    resultId,
    modelId: config.modelId,
    apiVersion: config.apiVersion,
  };
}

export async function getDocumentAnalysis(resultId) {
  if (!/^[a-zA-Z0-9-]{8,}$/.test(resultId || "")) {
    const error = new Error("Invalid analysis ID");
    error.statusCode = 400;
    throw error;
  }

  const config = getAzureConfig();
  if (!config.endpoint || !config.key) {
    throw new Error("Azure Document Intelligence is not configured");
  }

  const url = new URL(
    `${config.endpoint}/documentintelligence/documentModels/${encodeURIComponent(config.modelId)}/analyzeResults/${encodeURIComponent(resultId)}`,
  );
  url.searchParams.set("api-version", config.apiVersion);

  const response = await fetch(url, {
    headers: { "Ocp-Apim-Subscription-Key": config.key },
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(errorMessage(payload, `Azure result request failed with ${response.status}`));
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}
