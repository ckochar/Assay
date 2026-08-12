const QC_ONLY_REQUIRED_DOCUMENT_TYPES = Object.freeze([
  "Promissory Note",
  "Mortgage or Deed of Trust",
  "Closing Disclosure",
  "Notice of Right to Cancel",
  "Occupancy Affidavit",
  "Signature/Name Affidavit",
  "Notary Acknowledgment",
]);

const PROFILE_CANDIDATES = Object.freeze({
  TX: {
    id: "MORTGAGE-QC-TX",
    version: "2.2.0",
    effectiveAt: "2026-08-12",
    jurisdiction: "Texas",
    requiredDocumentTypesByChannel: Object.freeze({ QC_ONLY: QC_ONLY_REQUIRED_DOCUMENT_TYPES }),
  },
  CA: {
    id: "MORTGAGE-QC-CA",
    version: "1.5.0",
    effectiveAt: "2026-08-12",
    jurisdiction: "California",
    requiredDocumentTypesByChannel: Object.freeze({ QC_ONLY: QC_ONLY_REQUIRED_DOCUMENT_TYPES }),
  },
  FL: {
    id: "MORTGAGE-QC-FL",
    version: "3.1.0",
    effectiveAt: "2026-08-12",
    jurisdiction: "Florida",
    requiredDocumentTypesByChannel: Object.freeze({ QC_ONLY: QC_ONLY_REQUIRED_DOCUMENT_TYPES }),
  },
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

function requiredDocumentInventoryRule({ result, candidate, channel, inventoryNeedsReview, ocrLabel }) {
  const required = candidate?.requiredDocumentTypesByChannel?.[channel] || [];
  if (!required.length) return null;

  const detected = [...new Set(
    result.package.documents
      .map((doc) => doc.type)
      .filter((type) => type && type !== "Unknown document")
  )];
  const detectedSet = new Set(detected);
  const missing = required.filter((type) => !detectedSet.has(type));
  const complete = missing.length === 0;
  const status = complete ? "Pass" : inventoryNeedsReview ? "Needs Review" : "Fail";
  const firstPage = result.package.documents[0]?.startPage || 1;

  return {
    id: "PKG-DOC-REQ-001",
    name: "Profile-required document inventory complete",
    severity: "Critical",
    fundingCritical: true,
    status,
    requirement: "For this fictional portfolio profile and intake channel, configured required document types must be present in the classified package inventory. A confidently absent configured document is a deterministic inventory exception; uncertain classification routes to human review. These sample requirements are not legal, investor, or lender guidance.",
    extractedValue: complete
      ? `${required.length} of ${required.length} configured document types detected`
      : `Missing: ${missing.join("; ")} · detected ${detected.length} of ${required.length}`,
    confidence: {
      classification: inventoryNeedsReview ? 0.65 : Math.min(...result.package.documents.map((doc) => doc.confidence || 1)),
      extraction: null,
      ocrQuality: ocrLabel,
      evidenceComplete: complete || !inventoryNeedsReview,
      reviewTrigger: complete
        ? null
        : inventoryNeedsReview
          ? "Required-document completeness is uncertain because one or more pages need classification review"
          : `Configured required document missing: ${missing.join("; ")}`,
    },
    evidence: {
      scope: "package",
      sourceDocument: "Package inventory",
      page: firstPage,
      excerpt: `Profile ${candidate.id} v${candidate.version} · ${channel} · required: ${required.join("; ")} · detected: ${detected.join("; ") || "none"}${missing.length ? ` · missing: ${missing.join("; ")}` : " · complete"}`,
      polygon: null,
      pageGeometry: { width: null, height: null, unit: null },
    },
  };
}

function isOnOrAfter(later, earlier) {
  return Boolean(later && earlier && later >= earlier);
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

  if (qc.noteExecutionDate && qc.closingDate) {
    const noteDate = qc.noteExecutionDate.value;
    const closingDate = qc.closingDate.value;
    const complete = Boolean(noteDate && closingDate);
    const consistent = complete && noteDate === closingDate;
    rules.push({
      id: "XDATE-001",
      name: "Note and Closing Disclosure dates are consistent",
      severity: "Major",
      fundingCritical: true,
      status: complete && consistent ? "Pass" : "Needs Review",
      requirement: "Assay compares the extracted Note execution date with the Closing Disclosure closing date as a cross-document consistency signal. A mismatch routes to review; this prototype does not assert that same-day execution is legally required in every transaction.",
      extractedValue: `Note: ${noteDate || "not extracted"}; Closing Disclosure: ${closingDate || "not extracted"}`,
      confidence: {
        classification: null,
        extraction: complete ? 0.9 : 0.45,
        ocrQuality: ocrLabel,
        evidenceComplete: complete,
        reviewTrigger: !complete ? "One or both package dates were not extracted" : consistent ? null : "Cross-document date mismatch requires review",
      },
      evidence: evidenceFor(result.package.documents, qc.closingDate.evidence || qc.noteExecutionDate.evidence, "Closing-date comparison evidence not found"),
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
      status: "Needs Review",
      requirement: "OCR/layout indicators may help locate borrower execution evidence, but a human must confirm the source document; Assay does not treat OCR text or the absence of OCR text as legal signature validation.",
      extractedValue: indicators.length
        ? indicators.map((item) => `${item.borrower}: ${item.indicatorDetected ? item.indicatorBasis || "indicator detected" : "indicator not detected"}`).join("; ")
        : "No borrower identities available for signature comparison",
      confidence: {
        classification: null,
        extraction: allDetected ? 0.68 : 0.35,
        ocrQuality: ocrLabel,
        evidenceComplete: false,
        reviewTrigger: allDetected ? "Signature indicators require human confirmation" : "Signature text indicators are incomplete; inspect the source page",
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

    const transactionDate = qc.rightToCancel.transactionDate;
    const deadline = qc.rightToCancel.cancellationDeadline;
    const dateComplete = Boolean(transactionDate && deadline);
    const sequenceValid = dateComplete && isOnOrAfter(deadline, transactionDate);
    rules.push({
      id: "RTC-DATE-001",
      name: "Right-to-Cancel date sequence is chronologically valid",
      severity: "Critical",
      fundingCritical: true,
      status: dateComplete ? (sequenceValid ? "Pass" : "Fail") : "Needs Review",
      requirement: "When transaction and cancellation-deadline dates are extractable, the stated cancellation deadline must not precede the transaction date. This is a chronology check only; Assay does not calculate legal rescission eligibility or the required rescission period in this prototype.",
      extractedValue: `Transaction: ${transactionDate || "not extracted"}; deadline: ${deadline || "not extracted"}`,
      confidence: {
        classification: null,
        extraction: dateComplete ? 0.9 : 0.45,
        ocrQuality: ocrLabel,
        evidenceComplete: dateComplete,
        reviewTrigger: !dateComplete ? "RTC date evidence is incomplete" : sequenceValid ? null : "Cancellation deadline precedes transaction date",
      },
      evidence: evidenceFor(result.package.documents, qc.rightToCancel.cancellationDeadlineEvidence || qc.rightToCancel.transactionDateEvidence || qc.rightToCancel.evidence, "RTC date evidence not found"),
    });

    const borrowerIndicators = qc.rightToCancel.borrowerIndicators || [];
    if (borrowerIndicators.length) {
      const allBorrowersDetected = borrowerIndicators.every((item) => item.detected);
      const evidence = borrowerIndicators.find((item) => item.evidence)?.evidence || qc.rightToCancel.evidence;
      rules.push({
        id: "RTC-EXEC-001",
        name: "Right-to-Cancel borrower execution indicators require confirmation",
        severity: "Critical",
        fundingCritical: true,
        status: "Needs Review",
        requirement: "Borrower-name text can help locate execution evidence, but a human reviewer must confirm signatures, dates, receipt, and transaction applicability on the source document.",
        extractedValue: borrowerIndicators.map((item) => `${item.borrower}: ${item.detected ? "name indicator detected" : "not detected"}`).join("; "),
        confidence: {
          classification: null,
          extraction: allBorrowersDetected ? 0.7 : 0.4,
          ocrQuality: ocrLabel,
          evidenceComplete: false,
          reviewTrigger: allBorrowersDetected ? "RTC execution requires human confirmation" : "One or more borrower execution indicators were not detected",
        },
        evidence: evidenceFor(result.package.documents, evidence, "RTC borrower execution evidence not found"),
      });
    }
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

    const acknowledgedAt = qc.notaryAcknowledgment.acknowledgmentDate;
    const expiresAt = qc.notaryAcknowledgment.commissionExpirationDate;
    const dateComplete = Boolean(acknowledgedAt && expiresAt);
    const sequenceValid = dateComplete && isOnOrAfter(expiresAt, acknowledgedAt);
    rules.push({
      id: "NOT-DATE-001",
      name: "Notary commission date is chronologically valid",
      severity: "Critical",
      fundingCritical: true,
      status: dateComplete ? (sequenceValid ? "Pass" : "Fail") : "Needs Review",
      requirement: "When both dates are extractable, the stated commission-expiration date must not precede the acknowledgment date. This deterministic chronology check does not establish notary identity, authorization, seal validity, or legal sufficiency.",
      extractedValue: `Acknowledgment: ${acknowledgedAt || "not extracted"}; commission expiration: ${expiresAt || "not extracted"}`,
      confidence: {
        classification: null,
        extraction: dateComplete ? 0.91 : 0.45,
        ocrQuality: ocrLabel,
        evidenceComplete: dateComplete,
        reviewTrigger: !dateComplete ? "Notary date evidence is incomplete" : sequenceValid ? null : "Commission expiration precedes acknowledgment date",
      },
      evidence: evidenceFor(result.package.documents, qc.notaryAcknowledgment.commissionExpirationEvidence || qc.notaryAcknowledgment.acknowledgmentDateEvidence || qc.notaryAcknowledgment.evidence, "Notary date evidence not found"),
    });
  }

  if (qc.borrowerConsistency?.comparable) {
    const consistent = qc.borrowerConsistency.consistent === true;
    const firstMismatch = qc.borrowerConsistency.inconsistentDocuments?.[0];
    const evidence = firstMismatch?.evidence || qc.borrowerConsistency.byDocument?.[0]?.evidence;
    rules.push({
      id: "XNAME-001",
      name: "Borrower names are consistent across analyzed documents",
      severity: "Critical",
      fundingCritical: true,
      status: consistent ? "Pass" : "Needs Review",
      requirement: "For documents where borrower identity is actually detected, Assay compares the detected borrower set with the package borrower set. Differences route to human review rather than being silently normalized.",
      extractedValue: qc.borrowerConsistency.byDocument.map((item) => `${item.documentType}: ${item.borrowers.join("; ")}`).join(" | "),
      confidence: {
        classification: null,
        extraction: consistent ? 0.9 : 0.55,
        ocrQuality: ocrLabel,
        evidenceComplete: consistent,
        reviewTrigger: consistent ? null : "Cross-document borrower-name mismatch requires review",
      },
      evidence: evidenceFor(result.package.documents, evidence, "Cross-document borrower evidence not found"),
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
  const requiredInventoryRule = requiredDocumentInventoryRule({ result, candidate, channel, inventoryNeedsReview, ocrLabel });

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
    ...(requiredInventoryRule ? [requiredInventoryRule] : []),
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
