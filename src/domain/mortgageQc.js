export const MORTGAGE_DOCUMENT_TYPES = Object.freeze([
  "Promissory Note",
  "Mortgage or Deed of Trust",
  "Closing Disclosure",
  "Notice of Right to Cancel",
  "Occupancy Affidavit",
  "Signature/Name Affidavit",
  "Notary Acknowledgment",
]);

export const INTAKE_CHANNELS = Object.freeze({
  RON: "Remote online notarization",
  MOBILE_NOTARY: "Mobile notary",
  QC_ONLY: "QC only",
});

export const RULE_STATUS = Object.freeze({
  PASS: "Pass",
  FAIL: "Fail",
  NEEDS_REVIEW: "Needs Review",
  NOT_APPLICABLE: "N/A",
});

export const RECOMMENDATION = Object.freeze({
  READY: "Ready for Confirmation",
  EXCEPTION: "Exception Identified",
  REVIEW: "Needs Review",
  UNABLE: "Unable to Process",
});

export function createConfidenceSignals({
  classification = null,
  extraction = null,
  ocrQuality = null,
  evidenceComplete = false,
  reviewTrigger = null,
} = {}) {
  return {
    classification,
    extraction,
    ocrQuality,
    evidenceComplete: Boolean(evidenceComplete),
    reviewTrigger,
  };
}

export function validateRuleProfile(profile) {
  if (!profile || typeof profile !== "object") {
    throw new TypeError("Rule profile is required");
  }

  const required = ["id", "version", "effectiveAt", "status"];
  const missing = required.filter((key) => !profile[key]);

  if (missing.length) {
    throw new Error(`Rule profile missing required fields: ${missing.join(", ")}`);
  }

  if (!Array.isArray(profile.rules) || profile.rules.length === 0) {
    throw new Error("Rule profile must contain at least one rule");
  }

  return true;
}

export function pinEvaluationContext({
  documentHash,
  profile,
  extractor,
  evaluatedAt = new Date().toISOString(),
}) {
  validateRuleProfile(profile);

  if (!documentHash) throw new Error("Document hash is required");
  if (!extractor?.provider || !extractor?.version) {
    throw new Error("Extractor provider and version are required");
  }

  return Object.freeze({
    documentHash,
    profileId: profile.id,
    profileVersion: profile.version,
    profileEffectiveAt: profile.effectiveAt,
    extractorProvider: extractor.provider,
    extractorVersion: extractor.version,
    evaluatedAt,
  });
}

export function computeRecommendation(rules, { unableToProcess = false } = {}) {
  if (unableToProcess) return RECOMMENDATION.UNABLE;

  const active = rules.filter((rule) => rule.status !== RULE_STATUS.NOT_APPLICABLE);

  if (active.some((rule) => rule.status === RULE_STATUS.FAIL)) {
    return RECOMMENDATION.EXCEPTION;
  }

  if (active.some((rule) => rule.status === RULE_STATUS.NEEDS_REVIEW)) {
    return RECOMMENDATION.REVIEW;
  }

  return RECOMMENDATION.READY;
}

export function getFundingBlockers(rules) {
  return rules.filter((rule) => {
    if (rule.status === RULE_STATUS.FAIL && !rule.authorizedException) return true;

    return (
      rule.status === RULE_STATUS.NEEDS_REVIEW &&
      rule.fundingCritical === true &&
      !rule.authorizedException
    );
  });
}

export function canRecordReadyDisposition(rules) {
  const blockers = getFundingBlockers(rules);

  return {
    allowed: blockers.length === 0,
    blockers,
  };
}

export function validateOverride({
  actor,
  rule,
  reason,
  evidence,
  secondApproval,
}) {
  const errors = [];

  if (!actor?.id) errors.push("Actor identity is required");
  if (!actor?.permissions?.includes("rule:override")) {
    errors.push("Actor is not authorized to override rules");
  }
  if (!rule?.id) errors.push("Rule is required");
  if (!reason) errors.push("Override reason is required");
  if (!evidence?.sourceDocument || !evidence?.page) {
    errors.push("Supporting document and page evidence are required");
  }
  if (rule?.requiresSecondApproval && !secondApproval?.approvedBy) {
    errors.push("Second approval is required for this rule");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createAuditEvent({
  actor,
  action,
  subjectId,
  context,
  at = new Date().toISOString(),
}) {
  if (!actor || !action || !subjectId) {
    throw new Error("Actor, action, and subjectId are required");
  }

  return {
    at,
    actor,
    action,
    subjectId,
    context: context ?? {},
  };
}
