import { computeRecommendation } from "./mortgageQc.js";

function normalizeNames(value = "") {
  return String(value)
    .split(/[;,]/)
    .map((item) => item.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " "))
    .filter(Boolean)
    .sort();
}

function sameNameSet(left, right) {
  const a = normalizeNames(left);
  const b = normalizeNames(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function isCorrectableExtraction(rule = {}) {
  return rule.correctableField === "borrowerNames" && Boolean(rule.correctionContext?.referenceValue);
}

export function applyBorrowerNameCorrection(review, { ruleId, correctedValue, actor = "Analyst", note = "", at = null } = {}) {
  if (!review?.rules?.length) throw new Error("Review with rules is required");
  const rule = review.rules.find((item) => item.id === ruleId);
  if (!rule) throw new Error(`Rule ${ruleId} was not found`);
  if (!isCorrectableExtraction(rule)) throw new Error(`Rule ${ruleId} is not configured for borrower correction`);
  if (!String(correctedValue || "").trim()) throw new Error("Corrected borrower value is required");

  const beforeRecommendation = computeRecommendation(review.rules);
  const originalAiValue = rule.aiExtractedValue || rule.originalExtractedValue || rule.extractedValue;
  const previousValue = rule.extractedValue;
  const previousStatus = rule.status;
  const passes = sameNameSet(correctedValue, rule.correctionContext.referenceValue);

  const next = structuredClone(review);
  next.rules = next.rules.map((item) => {
    if (item.id !== ruleId) return item;
    const history = Array.isArray(item.corrections) ? [...item.corrections] : [];
    history.push({
      actor,
      at,
      from: previousValue,
      to: correctedValue,
      note,
      evidence: item.evidence,
      statusBefore: previousStatus,
      statusAfter: passes ? "Pass" : "Needs Review",
    });
    return {
      ...item,
      aiExtractedValue: originalAiValue,
      extractedValue: correctedValue,
      status: passes ? "Pass" : "Needs Review",
      correctedByHuman: true,
      correctionNote: note,
      corrections: history,
      confidence: {
        ...item.confidence,
        evidenceComplete: true,
        reviewTrigger: passes ? null : "Human correction does not match the pinned borrower reference",
      },
    };
  });

  const afterRecommendation = computeRecommendation(next.rules);
  next.audit = Array.isArray(next.audit) ? [...next.audit] : [];
  next.audit.push({
    at,
    actor,
    action: "Extracted borrower value corrected",
    detail: `${ruleId} · AI value \"${originalAiValue}\" → human value \"${correctedValue}\" · rule ${previousStatus} → ${passes ? "Pass" : "Needs Review"} · recommendation ${beforeRecommendation} → ${afterRecommendation}${note ? ` · ${note}` : ""}`,
  });

  return {
    review: next,
    result: {
      ruleId,
      originalAiValue,
      correctedValue,
      statusBefore: previousStatus,
      statusAfter: passes ? "Pass" : "Needs Review",
      recommendationBefore: beforeRecommendation,
      recommendationAfter: afterRecommendation,
      matchedReference: passes,
    },
  };
}
