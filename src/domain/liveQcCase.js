const RULE_REQUIREMENTS = Object.freeze({
  "DOC-TYPE-001": "The uploaded document must be identified as a Promissory Note before downstream QC can rely on it.",
  "BORROWER-001": "Borrower names must be extracted from the source document and linked to page-level evidence.",
  "DATE-001": "An execution date must be present, parseable, and linked to source evidence.",
  "SIG-IND-001": "Borrower execution evidence must be reviewed by a human; OCR text indicators alone do not establish legal signature validity.",
});

function displayBorrowers(borrowers = []) {
  if (!borrowers.length) return "Borrower not extracted";
  if (borrowers.length === 1) return borrowers[0];
  return `${borrowers.slice(0, -1).join(", ")} & ${borrowers.at(-1)}`;
}

function nowTime(now) {
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function createLiveQcReview({
  result,
  meta = {},
  channel = "QC_ONLY",
  documentHash = "Session source",
  now = new Date(),
} = {}) {
  if (!result?.document || !Array.isArray(result?.rules)) {
    throw new TypeError("A completed live analysis result is required");
  }

  const idSeed = String(meta.analysisId || now.getTime()).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  const caseId = `QC-LIVE-${idSeed || "SESSION"}`;
  const pageCount = Number(result.document.pageCount || 0);
  const apiVersion = meta.apiVersion || result.provider?.apiVersion || "2024-11-30";
  const modelId = meta.modelId || result.provider?.modelId || "prebuilt-layout";

  const rules = result.rules.map((rule) => ({
    ...rule,
    severity: rule.severity || "Critical",
    requirement: rule.requirement || RULE_REQUIREMENTS[rule.id] || "Review the extracted result against the pinned source evidence.",
    evidence: {
      sourceDocument: rule.evidence?.sourceDocument || result.document.type || "Promissory Note",
      ...rule.evidence,
    },
  }));

  return {
    id: caseId,
    loanId: result.document.loanNumber || "Loan ID not extracted",
    borrower: displayBorrowers(result.document.borrowers),
    property: "Property not extracted in current live scope",
    jurisdiction: "Baseline",
    channel,
    createdAt: nowTime(now),
    workflow: "In Review",
    disposition: null,
    scenario: "Live analysis",
    documents: [
      {
        name: result.document.type || "Promissory Note",
        pages: pageCount,
        status: "Classified live",
      },
    ],
    rules,
    profile: {
      id: "LIVE-NOTE-BASELINE",
      version: "1.0.0",
      effectiveAt: now.toISOString().slice(0, 10),
      status: "Published",
      jurisdiction: "Baseline",
      rules: rules.length,
    },
    evaluationContext: {
      documentHash,
      extractorProvider: "Azure Document Intelligence",
      extractorVersion: `${modelId} · ${apiVersion}`,
      evaluatedAt: now.toISOString(),
    },
    processing: {
      mode: "Live Azure analysis",
      provider: meta.provider || "azure-document-intelligence",
      pageScope: meta.pageScope || `1-${Math.max(pageCount, 1)}`,
    },
    source: "live",
    audit: [
      {
        at: nowTime(now),
        actor: "System",
        action: "Live document analyzed",
        detail: `${result.document.type || "Document"} · ${pageCount} pages · Azure ${modelId}`,
      },
      {
        at: nowTime(now),
        actor: "System",
        action: "QC case created",
        detail: `LIVE-NOTE-BASELINE v1.0.0 · ${rules.length} controls · ${channel}`,
      },
    ],
  };
}
