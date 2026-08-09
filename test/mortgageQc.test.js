import test from "node:test";
import assert from "node:assert/strict";

import {
  RECOMMENDATION,
  RULE_STATUS,
  canRecordReadyDisposition,
  computeRecommendation,
  pinEvaluationContext,
  validateOverride,
} from "../src/domain/mortgageQc.js";

test("any unresolved fail creates an exception recommendation", () => {
  const result = computeRecommendation([
    { id: "DOC-001", status: RULE_STATUS.PASS },
    { id: "SIG-001", status: RULE_STATUS.FAIL },
  ]);

  assert.equal(result, RECOMMENDATION.EXCEPTION);
});

test("funding-critical needs-review blocks a ready disposition", () => {
  const result = canRecordReadyDisposition([
    {
      id: "SIG-001",
      status: RULE_STATUS.NEEDS_REVIEW,
      fundingCritical: true,
    },
  ]);

  assert.equal(result.allowed, false);
  assert.equal(result.blockers[0].id, "SIG-001");
});

test("an authorized exception removes the funding blocker", () => {
  const result = canRecordReadyDisposition([
    {
      id: "DATE-002",
      status: RULE_STATUS.FAIL,
      fundingCritical: true,
      authorizedException: {
        approvedBy: "manager-1",
        reason: "Documented policy exception",
      },
    },
  ]);

  assert.equal(result.allowed, true);
});

test("override requires authorization, reason, and page evidence", () => {
  const result = validateOverride({
    actor: { id: "analyst-1", permissions: [] },
    rule: { id: "SIG-001" },
    reason: "",
    evidence: {},
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 3);
});

test("evaluation context pins profile and extractor versions", () => {
  const context = pinEvaluationContext({
    documentHash: "sha256:demo",
    profile: {
      id: "mortgage-post-close-tx",
      version: "1.0.0",
      effectiveAt: "2026-08-09T00:00:00.000Z",
      status: "published",
      rules: [{ id: "DOC-001" }],
    },
    extractor: {
      provider: "azure-document-intelligence",
      version: "2024-11-30",
    },
    evaluatedAt: "2026-08-09T12:00:00.000Z",
  });

  assert.equal(context.profileVersion, "1.0.0");
  assert.equal(context.extractorProvider, "azure-document-intelligence");
  assert.equal(Object.isFrozen(context), true);
});
