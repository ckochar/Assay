import { RECOMMENDATION } from "../domain/mortgageQc.js";

function evidence(page, excerpt) {
  return { page, excerpt, polygon: null, pageGeometry: { width: 8.5, height: 11, unit: "inch" } };
}

function document(id, type, startPage, endPage = startPage) {
  return {
    id,
    type,
    startPage,
    endPage,
    pages: endPage - startPage + 1,
    confidence: 0.94,
    evidence: evidence(startPage, type.toUpperCase()),
    pageClassifications: [],
  };
}

function basePackageResult({ includeDocumentQc = true } = {}) {
  const result = {
    package: {
      pageCount: 8,
      documents: [
        document("DOC-01", "Promissory Note", 1, 2),
        document("DOC-02", "Mortgage or Deed of Trust", 3),
        document("DOC-03", "Closing Disclosure", 4),
        document("DOC-04", "Notice of Right to Cancel", 5),
        document("DOC-05", "Occupancy Affidavit", 6),
        document("DOC-06", "Signature/Name Affidavit", 7),
        document("DOC-07", "Notary Acknowledgment", 8),
      ],
      knownDocumentTypes: [
        "Promissory Note",
        "Mortgage or Deed of Trust",
        "Closing Disclosure",
        "Notice of Right to Cancel",
        "Occupancy Affidavit",
        "Signature/Name Affidavit",
        "Notary Acknowledgment",
      ],
      unknownPages: [],
      lowConfidencePages: [],
      ocrQuality: { label: "High", score: 0.98 },
      status: "Ready for QC Evaluation",
    },
    context: {
      loanNumber: "LN-900001",
      loanNumberCandidates: ["LN-900001"],
      loanNumberConsistent: true,
      loanNumberEvidence: evidence(1, "Loan No.: LN-900001"),
      borrowers: ["Maya Patel", "Rohan Patel"],
      borrowerEvidence: evidence(1, 'FOR VALUE RECEIVED, Maya Patel and Rohan Patel (collectively, "Borrower")'),
      jurisdiction: { code: "TX", confidence: 0.96, basis: "Property address", evidence: evidence(1, "Property Address: 7408 Willow Bend Drive, Plano, TX 75024") },
      profileResolution: { status: "Candidate profile resolved", jurisdiction: "TX", requiresHumanConfirmation: false },
    },
    provider: { modelId: "prebuilt-layout", apiVersion: "2024-11-30", status: "succeeded" },
  };

  if (includeDocumentQc) {
    result.documentQc = {
      noteExecutionDate: { documentType: "Promissory Note", value: "2026-08-09", evidence: evidence(1, "Date: August 9, 2026") },
      closingDisclosure: { documentType: "Closing Disclosure", closingDate: "2026-08-09", closingDateEvidence: evidence(4, "Closing Date: August 9, 2026"), borrowers: [], borrowerEvidence: null },
      noteSignatureIndicators: {
        documentType: "Promissory Note",
        indicators: [
          { borrower: "Maya Patel", indicatorDetected: true, occurrenceCount: 3, evidence: evidence(2, "Maya Patel") },
          { borrower: "Rohan Patel", indicatorDetected: true, occurrenceCount: 3, evidence: evidence(2, "Rohan Patel") },
        ],
      },
      rightToCancel: {
        documentType: "Notice of Right to Cancel",
        titleDetected: true,
        cancelLanguageDetected: true,
        transactionDate: "2026-08-09",
        transactionDateEvidence: evidence(5, "Transaction Date: August 9, 2026"),
        cancellationDeadline: "2026-08-12",
        cancellationDeadlineEvidence: evidence(5, "Cancellation Deadline: August 12, 2026"),
        borrowers: [],
        borrowerEvidence: null,
        evidence: evidence(5, "You may cancel this transaction"),
      },
      notaryAcknowledgment: {
        documentType: "Notary Acknowledgment",
        fields: { venue: true, acknowledgment: true, notaryIndicator: true, commissionExpiration: true },
        acknowledgmentDate: "2026-08-09",
        acknowledgmentDateEvidence: evidence(8, "Acknowledged before me on August 9, 2026."),
        commissionExpirationDate: "2028-11-30",
        commissionExpirationEvidence: evidence(8, "My commission expires November 30, 2028."),
        evidence: evidence(8, "Acknowledged before me on August 9, 2026."),
      },
      borrowerConsistency: {
        packageBorrowers: ["Maya Patel", "Rohan Patel"],
        documents: [
          { documentType: "Promissory Note", borrowers: ["Maya Patel", "Rohan Patel"], evidence: evidence(1, "Borrower: Maya Patel") },
          { documentType: "Mortgage or Deed of Trust", borrowers: ["Maya Patel", "Rohan Patel"], evidence: evidence(3, "Borrower: Maya Patel") },
          { documentType: "Signature/Name Affidavit", borrowers: ["Maya Patel", "Rohan Patel"], evidence: evidence(7, "Borrower: Maya Patel") },
        ],
        mismatches: [],
      },
    };
  }

  return result;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function scenario({ id, name, category, expectedRecommendation, rationale, mutate, includeDocumentQc = true }) {
  const result = basePackageResult({ includeDocumentQc });
  mutate?.(result);
  return { id, name, category, expectedRecommendation, rationale, result };
}

export const GOLDEN_EVALUATION_CASES = Object.freeze([
  scenario({
    id: "GOLD-001",
    name: "Foundation-only clean package",
    category: "Ready control",
    expectedRecommendation: RECOMMENDATION.READY,
    rationale: "All currently evaluated package-foundation controls pass and no execution-level evidence is included in this scoped case.",
    includeDocumentQc: false,
  }),
  scenario({
    id: "GOLD-002",
    name: "Clean execution evidence requires confirmation",
    category: "Human review",
    expectedRecommendation: RECOMMENDATION.REVIEW,
    rationale: "Dates and content are consistent, but signature and notary execution indicators intentionally remain human-confirmation findings.",
  }),
  scenario({
    id: "GOLD-003",
    name: "Missing signature text indicator",
    category: "Human review",
    expectedRecommendation: RECOMMENDATION.REVIEW,
    rationale: "Missing OCR signature-location text is insufficient to claim a legally missing signature and must route to human review.",
    mutate(result) {
      result.documentQc.noteSignatureIndicators.indicators[1].indicatorDetected = false;
      result.documentQc.noteSignatureIndicators.indicators[1].occurrenceCount = 1;
    },
  }),
  scenario({
    id: "GOLD-004",
    name: "Cross-document borrower mismatch",
    category: "Human review",
    expectedRecommendation: RECOMMENDATION.REVIEW,
    rationale: "A borrower-name mismatch may be extraction or document variation and requires source review rather than an automatic exception.",
    mutate(result) {
      result.documentQc.borrowerConsistency.documents[1].borrowers = ["Maya Patel", "Rohan Patil"];
      result.documentQc.borrowerConsistency.mismatches = [{ documentType: "Mortgage or Deed of Trust", missing: ["Rohan Patel"], unexpected: ["Rohan Patil"], evidence: evidence(3, "Borrower: Rohan Patil") }];
    },
  }),
  scenario({
    id: "GOLD-005",
    name: "Note and Closing Disclosure date mismatch",
    category: "Human review",
    expectedRecommendation: RECOMMENDATION.REVIEW,
    rationale: "Different extracted dates are surfaced for analyst verification; the prototype does not infer that the chronology is legally invalid.",
    mutate(result) {
      result.documentQc.closingDisclosure.closingDate = "2026-08-10";
      result.documentQc.closingDisclosure.closingDateEvidence = evidence(4, "Closing Date: August 10, 2026");
    },
  }),
  scenario({
    id: "GOLD-006",
    name: "Unknown package page classification",
    category: "Human review",
    expectedRecommendation: RECOMMENDATION.REVIEW,
    rationale: "An unresolved page classification blocks downstream reliance on the document inventory.",
    mutate(result) {
      result.package.unknownPages = [6];
      result.package.status = "Needs Package Review";
      result.package.documents[4].type = "Unknown document";
      result.package.documents[4].confidence = 0.25;
      result.package.documents[4].evidence = evidence(6, "Unrecognized executed form");
    },
  }),
  scenario({
    id: "GOLD-007",
    name: "Unresolved jurisdiction profile",
    category: "Human review",
    expectedRecommendation: RECOMMENDATION.REVIEW,
    rationale: "Policy-specific controls must not silently select a jurisdiction profile without supported source evidence.",
    mutate(result) {
      result.context.jurisdiction = { code: null, confidence: 0.2, basis: "Not resolved", evidence: null };
      result.context.profileResolution = { status: "Needs context", jurisdiction: null, requiresHumanConfirmation: true };
      result.package.status = "Needs Package Review";
    },
  }),
  scenario({
    id: "GOLD-008",
    name: "Conflicting loan numbers",
    category: "Deterministic exception",
    expectedRecommendation: RECOMMENDATION.EXCEPTION,
    rationale: "Two loan identifiers create a deterministic package-identity conflict and block a ready disposition.",
    mutate(result) {
      result.context.loanNumber = null;
      result.context.loanNumberCandidates = ["LN-900001", "LN-900002"];
      result.context.loanNumberConsistent = false;
    },
  }),
  scenario({
    id: "GOLD-009",
    name: "RTC deadline before transaction date",
    category: "Deterministic exception",
    expectedRecommendation: RECOMMENDATION.EXCEPTION,
    rationale: "The extracted cancellation deadline precedes the extracted transaction date, an internally impossible chronology.",
    mutate(result) {
      result.documentQc.rightToCancel.cancellationDeadline = "2026-08-08";
      result.documentQc.rightToCancel.cancellationDeadlineEvidence = evidence(5, "Cancellation Deadline: August 8, 2026");
    },
  }),
  scenario({
    id: "GOLD-010",
    name: "Notary commission expired before acknowledgment",
    category: "Deterministic exception",
    expectedRecommendation: RECOMMENDATION.EXCEPTION,
    rationale: "The extracted commission-expiration date precedes the acknowledgment date, an internally impossible chronology.",
    mutate(result) {
      result.documentQc.notaryAcknowledgment.commissionExpirationDate = "2026-08-08";
      result.documentQc.notaryAcknowledgment.commissionExpirationEvidence = evidence(8, "My commission expires August 8, 2026.");
    },
  }),
].map((item) => Object.freeze({ ...item, result: clone(item.result) })));
