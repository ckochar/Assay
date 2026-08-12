const PROFILE_CANDIDATES = Object.freeze({
  TX: { id: "MORTGAGE-QC-TX", version: "2.1.0", effectiveAt: "2026-08-01", jurisdiction: "Texas" },
  CA: { id: "MORTGAGE-QC-CA", version: "1.4.0", effectiveAt: "2026-07-15", jurisdiction: "California" },
  FL: { id: "MORTGAGE-QC-FL", version: "3.0.0", effectiveAt: "2026-08-05", jurisdiction: "Florida" },
});

function displayBorrowers(borrowers = []) {
  if (!borrowers.length) return "Borrower not extracted";
  if (borrowers.length === 1) return borrowers[0];
  return `${borrowers.slice(0, -1).join(", ")} & ${borrowers.at(-1)}`;
}

function nowTime(now) {
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function documentForPage(documents, page) {
  return documents.find((doc) => page >= doc.startPage && page <= doc.endPage)?.type || "Package source";
}

function evidenceFor(documents, evidence, fallback = "Package evidence not found") {
  const page = evidence?.page || 1;
  return {
    sourceDocument: documentForPage(documents, page),
    page,
    excerpt: evidence?.excerpt || fallback,
    polygon: evidence?.polygon || null,
    pageGeometry: evidence?.pageGeometry || { width: null, height: null, unit: null },
  };
}

function classificationEvidence(result) {
  const reviewPage = result.package.unknownPages[0] || result.package.lowConfidencePages[0];
  if (reviewPage) {
    const doc = result.package.documents.find((item) => reviewPage >= item.startPage && reviewPage <= item.endPage);
    const pageItem = doc?.pageClassifications?.find((item) => item.page === reviewPage);
    return evidenceFor(result.package.documents, pageItem?.evidence, `Page ${reviewPage} requires classification review`);
  }
  const first = result.package.documents[0];
  return evidenceFor(result.package.documents, first?.evidence, "All analyzed pages classified");
}

function documentSpecificRules(result, ocrLabel) {
  const qc = result.documentQc || {};
  const rules = [];

  if (qc.noteExecutionDate) {
    rules.push({
      id: "NOTE-DATE-001",
      name: "Promissory Note execution date extracted",
      severity: "Major",
      fundingCritical: true,
      status: qc.noteExecutionDate.value ? "Pass" : "Needs Review",
      requirement: "The analyzed Promissory Note should contain a readable execution date linked to source evidence.",
      extractedValue: qc.noteExecutionDate.value || "Execution date not extracted",
      confidence: {
        classification: null,
        extraction: qc.noteExecutionDate.value ? 0.92 : 0.4,
        ocrQuality: ocrLabel,
        evidenceComplete: Boolean(qc.noteExecutionDate.value),
        reviewTrigger: qc.noteExecutionDate.value ? null : "Note execution date not extracted",
      },
      evidence: evidenceFor(result.package.documents, qc.noteExecutionDate.evidence, "Note execution-date evidence not found"),
    });
  }

  if (qc.noteSignatureIndicators) {
    const indicators = qc.noteSignatureIndicators.indicators || [];
    const allDetected = indicators.length > 0 && indicators.every((item) => item.indicatorDetected);
    const firstEvidence = indicators.find((item) => item.evidence)?.evidence;
    rules.push({
      id: "NOTE-SIG-001",
      name: "Promissory Note borrower signature indicators require confirmation",
      severity: "Critical",
      fundingCritical: true,
      status: allDetected ? "Needs Review" : "Fail",
      requirement: "OCR/layout indicators may help locate borrower execution evidence, but a human must confirm the source document; Assay does not treat OCR text as legal signature validation.",
      extractedValue: indicators.length
        ? indicators.map((item) => `${item.borrower}: ${item.indicatorDetected ? "indicator detected" : "indicator not detected"}`).join("; ")
        : "No borrower identities available for signature comparison",
      confidence: {
        classification: null,
        extraction: allDetected ? 0.68 : 0.35,
        ocrQuality: ocrLabel,
        evidenceComplete: false,
        reviewTrigger: allDetected ? "Signature indicators require human confirmation" : "One or more borrower signature indicators were not detected",
      },
      evidence: evidenceFor(result.package.documents, firstEvidence, "Promissory Note signature indicator evidence not found"),
    });
  }

  if (qc.rightToCancel) {
    const complete = qc.rightToCancel.titleDetected && qc.rightToCancel.cancelLanguageDetected;
    rules.push({
      id: "RTC-CONTENT-001",
      name: "Right-to-Cancel document content detected",
      severity: "Critical",
      fundingCritical: true,
      status: complete ? "Pass" : "Needs Review",
      requirement: "When a Right-to-Cancel document is present, the analyzed page should contain recognizable rescission title and cancellation-language evidence. This control does not determine transaction eligibility or legal sufficiency.",
      extractedValue: `Title ${qc.rightToCancel.titleDetected ? "detected" : "not detected"}; cancellation language ${qc.rightToCancel.cancelLanguageDetected ? "detected" : "not detected"}`,
      confidence: {
        classification: null,
        extraction: complete ? 0.91 : 0.5,
        ocrQuality: ocrLabel,
        evidenceComplete: complete,
        reviewTrigger: complete ? null : "Right-to-Cancel content evidence is incomplete",
      },
      evidence: evidenceFor(result.package.documents, qc.rightToCancel.evidence, "Right-to-Cancel evidence not found"),
    });
  }

  if (qc.notaryAcknowledgment) {
    const fields = qc.notaryAcknowledgment.fields || {};
    const present = Object.values(fields).filter(Boolean).length;
    const total = Object.keys(fields).length;
    const complete = total > 0 && present === total;
    rules.push({
      id: "NOT-FIELDS-001",
      name: "Notary acknowledgment field indicators present",
      severity: "Critical",
      fundingCritical: true,
      status: complete ? "Needs Review" : "Fail",
      requirement: "Assay checks for text/layout indicators for venue, acknowledgment language, a notary indicator, and commission-expiration language. Human review remains required for actual execution, seal, identity, and legal sufficiency.",
      extractedValue: `${present} of ${total} notary field indicators detected`,
      confidence: {
        classification: null,
        extraction: complete ? 0.74 : 0.45,
        ocrQuality: ocrLabel,
        evidenceComplete: false,
        reviewTrigger: complete ? "Notary field indicators require human confirmation" : "One or more notary field indicators were not detected",
      },
      evidence: evidenceFor(result.package.documents, qc.notaryAcknowledgment.evidence, "Notary acknowledgment evidence not found"),
    });
  }

  return rules;
}

export function createPackageQcReview({
  result,
  meta = {},
  channel = "QC_ONLY",
  documentHash = "Session source",
  now = new Date(),
} = {}) {
  if (!result?.package || !result?.context || !Array.isArray(result.package.documents)) {
    throw new TypeError("A completed package analysis result is required");
  }

  const idSeed = String(meta.analysisId || now.getTime()).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  const caseId = `QC-PKG-${idSeed || "SESSION"}`;
  const jurisdictionCode = result.context.jurisdiction?.code;
  const candidate = PROFILE_CANDIDATES[jurisdictionCode] || null;
  const profileNeedsReview = !candidate || Boolean(result.context.profileResolution?.requiresHumanConfirmation);
  const inventoryNeedsReview = result.package.unknownPages.length > 0 || result.package.lowConfidencePages.length > 0;
  const loanCandidates = result.context.loanNumberCandidates || [];
  const ocrLabel = result.package.ocrQuality?.label || "Unknown";
  const ocrNeedsReview = ocrLabel === "Low" || ocrLabel === "Unknown";

  const rules = [
    {
      id: "PKG-DOC-001",
      name: "Analyzed package pages classified",
      severity: "Critical",
      fundingCritical: true,
      status: inventoryNeedsReview ? "Needs Review" : "Pass",
      requirement: "Every analyzed package page must have a usable document classification before downstream QC relies on the inventory.",
      extractedValue: inventoryNeedsReview
        ? `Review pages ${[...new Set([...result.package.unknownPages, ...result.package.lowConfidencePages])].join(", ")}`
        : `${result.package.documents.length} document segments across ${result.package.pageCount} analyzed pages`,
      confidence: {
        classification: inventoryNeedsReview ? 0.65 : Math.min(...result.package.documents.map((doc) => doc.confidence || 1)),
        extraction: null,
        ocrQuality: ocrLabel,
        evidenceComplete: !inventoryNeedsReview,
        reviewTrigger: inventoryNeedsReview ? "Unknown or low-confidence page classification" : null,
      },
      evidence: classificationEvidence(result),
    },
    {
      id: "PKG-LOAN-001",
      name: "Loan number consistent across analyzed package",
      severity: "Critical",
      fundingCritical: true,
      status: loanCandidates.length === 1 ? "Pass" : loanCandidates.length > 1 ? "Fail" : "Needs Review",
      requirement: "The analyzed package must resolve to one loan number before package-level QC can be attributed to a loan.",
      extractedValue: loanCandidates.length ? loanCandidates.join("; ") : "Loan number not extracted",
      confidence: {
        classification: null,
        extraction: loanCandidates.length === 1 ? 0.94 : 0.45,
        ocrQuality: ocrLabel,
        evidenceComplete: loanCandidates.length === 1,
        reviewTrigger: loanCandidates.length === 1 ? null : "Loan identity is missing or inconsistent",
      },
      evidence: evidenceFor(result.package.documents, result.context.loanNumberEvidence, "Loan-number evidence not found"),
    },
    {
      id: "PKG-BORROWER-001",
      name: "Borrower identity extracted",
      severity: "Critical",
      fundingCritical: true,
      status: result.context.borrowers?.length ? "Pass" : "Needs Review",
      requirement: "At least one borrower identity must be extracted and linked to source evidence before borrower-level controls run.",
      extractedValue: result.context.borrowers?.length ? result.context.borrowers.join("; ") : "Borrower not extracted",
      confidence: {
        classification: null,
        extraction: result.context.borrowers?.length ? 0.9 : 0.4,
        ocrQuality: ocrLabel,
        evidenceComplete: Boolean(result.context.borrowers?.length),
        reviewTrigger: result.context.borrowers?.length ? null : "Borrower identity not extracted",
      },
      evidence: evidenceFor(result.package.documents, result.context.borrowerEvidence, "Borrower evidence not found"),
    },
    {
      id: "PKG-PROFILE-001",
      name: "Rule-profile context resolved",
      severity: "Critical",
      fundingCritical: true,
      status: profileNeedsReview ? "Needs Review" : "Pass",
      requirement: "Jurisdiction evidence must resolve to a supported published profile with sufficient confidence before policy-specific controls run.",
      extractedValue: candidate
        ? `${candidate.id} v${candidate.version}${profileNeedsReview ? " · confirmation required" : ""}`
        : "Profile context unresolved",
      confidence: {
        classification: null,
        extraction: result.context.jurisdiction?.confidence ?? 0.2,
        ocrQuality: ocrLabel,
        evidenceComplete: Boolean(candidate) && !profileNeedsReview,
        reviewTrigger: profileNeedsReview ? "Jurisdiction/profile context requires human confirmation" : null,
      },
      evidence: evidenceFor(result.package.documents, result.context.jurisdiction?.evidence, "Jurisdiction evidence not found"),
    },
    {
      id: "PKG-OCR-001",
      name: "OCR quality supports automated extraction",
      severity: "Major",
      fundingCritical: false,
      status: ocrNeedsReview ? "Needs Review" : "Pass",
      requirement: "Package OCR quality must be sufficient for automated extraction; low or unavailable quality routes the package to human review.",
      extractedValue: ocrLabel,
      confidence: {
        classification: null,
        extraction: result.package.ocrQuality?.score ?? null,
        ocrQuality: ocrLabel,
        evidenceComplete: !ocrNeedsReview,
        reviewTrigger: ocrNeedsReview ? "OCR quality is low or unavailable" : null,
      },
      evidence: classificationEvidence(result),
    },
    ...documentSpecificRules(result, ocrLabel),
  ];

  const profile = candidate
    ? { ...candidate, status: "Published", rules: rules.length }
    : {
        id: "PACKAGE-CONTEXT-UNRESOLVED",
        version: "1.0.0",
        effectiveAt: now.toISOString().slice(0, 10),
        status: "Candidate",
        jurisdiction: "Unresolved",
        rules: rules.length,
      };

  const apiVersion = meta.apiVersion || result.provider?.apiVersion || "2024-11-30";
  const modelId = meta.modelId || result.provider?.modelId || "prebuilt-layout";

  return {
    id: caseId,
    loanId: result.context.loanNumber || "Loan ID not resolved",
    borrower: displayBorrowers(result.context.borrowers),
    property: result.context.jurisdiction?.evidence?.excerpt?.replace(/^Property Address\s*:\s*/i, "") || "Property not extracted",
    jurisdiction: jurisdictionCode || "Unresolved",
    channel,
    createdAt: nowTime(now),
    workflow: "In Review",
    disposition: null,
    scenario: "Live package analysis",
    documents: result.package.documents.map((doc) => ({
      name: doc.type,
      pages: doc.pages,
      status: doc.confidence < 0.7 || doc.type === "Unknown document" ? "Needs classification review" : "Classified live",
      startPage: doc.startPage,
      endPage: doc.endPage,
      confidence: doc.confidence,
    })),
    rules,
    profile,
    evaluationContext: {
      documentHash,
      extractorProvider: "Azure Document Intelligence",
      extractorVersion: `${modelId} · ${apiVersion}`,
      evaluatedAt: now.toISOString(),
    },
    processing: {
      mode: "Live Azure package analysis",
      provider: meta.provider || "azure-document-intelligence",
      pageScope: meta.pageScope || `1-${Math.max(result.package.pageCount, 1)}`,
    },
    source: "live",
    sourceKind: "package",
    audit: [
      {
        at: nowTime(now),
        actor: "System",
        action: "Mortgage package analyzed",
        detail: `${result.package.pageCount} pages · ${result.package.documents.length} document segments · Azure ${modelId}`,
      },
      {
        at: nowTime(now),
        actor: "System",
        action: candidate ? "Rule profile candidate pinned" : "Rule profile unresolved",
        detail: candidate ? `${candidate.id} v${candidate.version} · ${jurisdictionCode}${profileNeedsReview ? " · human confirmation required" : ""}` : "Package context requires human review",
      },
      {
        at: nowTime(now),
        actor: "System",
        action: "QC case created",
        detail: `${rules.length} package and document-specific controls · ${channel}`,
      },
    ],
  };
}

export { PROFILE_CANDIDATES };
