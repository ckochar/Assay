import test from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  getClientIp,
  resetRateLimitsForTests,
  validatePdfPayload,
} from "../server/lib/requestGuards.js";

function pdfBase64(bytes = "%PDF-1.7\nsynthetic") {
  return Buffer.from(bytes).toString("base64");
}

test("validates the actual decoded PDF bytes rather than trusting client metadata", () => {
  const valid = validatePdfPayload({
    base64Source: pdfBase64(),
    mimeType: "application/pdf",
    maxFileBytes: 1024,
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.decodedBytes, Buffer.byteLength("%PDF-1.7\nsynthetic"));

  const oversized = validatePdfPayload({
    base64Source: pdfBase64(`%PDF-${"x".repeat(100)}`),
    mimeType: "application/pdf",
    maxFileBytes: 20,
  });
  assert.equal(oversized.ok, false);
  assert.match(oversized.error, /4 MB/i);
});

test("rejects non-PDF payloads even when the MIME type claims PDF", () => {
  const result = validatePdfPayload({
    base64Source: Buffer.from("not a pdf").toString("base64"),
    mimeType: "application/pdf",
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /valid PDF/i);
});

test("allows five analyses in the window and rejects the sixth", () => {
  resetRateLimitsForTests();
  const now = 1_000_000;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const result = checkRateLimit({ key: "analyze:127.0.0.1", now, limit: 5, windowMs: 60_000 });
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 5 - attempt);
  }

  const blocked = checkRateLimit({ key: "analyze:127.0.0.1", now, limit: 5, windowMs: 60_000 });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
});

test("rate limit resets after its window", () => {
  resetRateLimitsForTests();
  checkRateLimit({ key: "analyze:test", now: 1_000, limit: 1, windowMs: 500 });
  assert.equal(checkRateLimit({ key: "analyze:test", now: 1_100, limit: 1, windowMs: 500 }).allowed, false);
  assert.equal(checkRateLimit({ key: "analyze:test", now: 1_501, limit: 1, windowMs: 500 }).allowed, true);
});

test("uses the first x-forwarded-for address as the client IP", () => {
  const ip = getClientIp({
    headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    socket: {},
  });
  assert.equal(ip, "203.0.113.5");
});
