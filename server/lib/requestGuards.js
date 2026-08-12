const DEFAULT_MAX_FILE_BYTES = 4 * 1024 * 1024;
const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000;

const buckets = new Map();

export function getClientIp(request) {
  const forwarded = request.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers?.["x-real-ip"] || request.socket?.remoteAddress || "unknown";
}

export function validatePdfPayload({ base64Source, mimeType, maxFileBytes = DEFAULT_MAX_FILE_BYTES }) {
  if (!base64Source || typeof base64Source !== "string") {
    return { ok: false, status: 400, error: "A base64-encoded PDF is required" };
  }

  if (mimeType && mimeType !== "application/pdf") {
    return { ok: false, status: 400, error: "Only PDF files are supported in the first live workflow" };
  }

  let decoded;
  try {
    decoded = Buffer.from(base64Source, "base64");
  } catch {
    return { ok: false, status: 400, error: "The PDF payload could not be decoded" };
  }

  if (!decoded.length || decoded.length > maxFileBytes) {
    return { ok: false, status: 400, error: "PDF must be between 1 byte and 4 MB" };
  }

  if (decoded.subarray(0, 4).toString("ascii") !== "%PDF") {
    return { ok: false, status: 400, error: "The uploaded file does not appear to be a valid PDF" };
  }

  return { ok: true, decodedBytes: decoded.length };
}

export function checkRateLimit({ key, now = Date.now(), limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS }) {
  const current = buckets.get(key);

  if (!current || now >= current.resetAt) {
    const next = { count: 1, resetAt: now + windowMs };
    buckets.set(key, next);
    return { allowed: true, remaining: limit - 1, resetAt: next.resetAt };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { allowed: true, remaining: limit - current.count, resetAt: current.resetAt };
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
