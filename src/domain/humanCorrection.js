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

function normalizeDate(value = "") {
  const raw = String(value).trim();
  if (!raw) return "";
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return raw.toLowerCase();
  return parsed.toISOString().slice(0, 10);
}

function normalizeLabel(value = "") {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
}

const FIELD_CONFIG = {
  borrowerNames: {
    label: "Borrower names",
    mismatchMessage: "Human correction does not match the pinned borrower reference",
    matches: sameNameSet,
  },
  executionDate: {
    label: "Execution date",
    mismatchMessage: "Human correction does not match the pinned execution-date reference",
    matches: (left, right) => normalizeDate(left) === normalizeDate(right),
  },
  documentClassification: {
    label: "Document classification",
    mismatchMessage: "Human correction does not match the pinned document-type reference",
    matches: (left, right) => normalizeLabel(left) === normalizeLabel(right),
  },
};

export function getCorrectionFieldConfig(rule = {}) {
  return FIELD_CONFIG[rule.correctableField] || null;
}

export function isCorrectableExtraction(rule = {}) {
  return Boolean(getCorrectionFieldConfig(rule) && rule.correctionContext?.referenceValue);
}

export function applyEvidenceCorrection(review, { ruleId, correctedValue, actor = "Analyst", note = "", at = null } = {}) {
  if (!review?.rules?.length) throw new Error("Review with rules is required");
  const rule = review.rules.find((item) => item.id === ruleId);
  if (!rule) throw new Error(`Rule ${ruleId} was not found`);
  const field = getCorrectionFieldConfig(rule);
  if (!field || !isCorrectableExtraction(rule)) throw new Error(`Rule ${ruleId} is not configured for evidence correction`);
  if (!String(correctedValue || "").trim()) throw new Error(`Corrected ${field.label.toLowerCase()} value is required`);

  const beforeRecommendation = computeRecommendation(review.rules);
  const originalAiValue = rule.aiExtractedValue || rule.originalExtractedValue || rule.extractedValue;
  const previousValue = rule.extractedValue;
  const previousStatus = rule.status;
  const passes = field.matches(correctedValue, rule.correctionContext.referenceValue);

  const next = structuredClone(review);
  next.rules = next.rules.map((item) => {
    if (item.id !== ruleId) return item;
    const history = Array.isArray(item.corrections) ? [...item.corrections] : [];
    history.push({
      actor,
      at,
      field: item.correctableField,
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
        reviewTrigger: passes ? null : field.mismatchMessage,
      },
    };
  });

  const afterRecommendation = computeRecommendation(next.rules);
  next.audit = Array.isArray(next.audit) ? [...next.audit] : [];
  next.audit.push({
    at,
    actor,
    action: `${field.label} corrected`,
    detail: `${ruleId} · AI value \"${originalAiValue}\" → human value \"${correctedValue}\" · rule ${previousStatus} → ${passes ? "Pass" : "Needs Review"} · recommendation ${beforeRecommendation} → ${afterRecommendation}${note ? ` · ${note}` : ""}`,
  });

  return {
    review: next,
    result: {
      ruleId,
      field: rule.correctableField,
      fieldLabel: field.label,
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

export function applyBorrowerNameCorrection(review, args = {}) {
  return applyEvidenceCorrection(review, args);
}
