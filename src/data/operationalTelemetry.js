export const OPERATIONAL_TELEMETRY_V1 = {
  label: "Controlled prototype telemetry",
  capturedAt: "2026-08-15T20:30:00Z",
  source: "Synthetic benchmark and reviewer-flow scenarios",
  caveat: "This is portfolio telemetry derived from controlled synthetic scenarios. It is not production traffic, SLA monitoring, or customer-volume reporting.",
  events: [
    { id: "TEL-001", scenario: "Clean digital package", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 9810, ocrPageCoverage: 1, averageWordConfidence: 0.986, evidenceCompleteness: 1, recommendation: "Ready for Review", humanReviewRequired: false, reviewTriggers: [], falseReady: false },
    { id: "TEL-002", scenario: "Unknown page classification", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 12356, ocrPageCoverage: 1, averageWordConfidence: 0.977, evidenceCompleteness: 1, recommendation: "Needs Review", humanReviewRequired: true, reviewTriggers: ["Classification uncertainty"], falseReady: false },
    { id: "TEL-003", scenario: "Unresolved jurisdiction", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 12409, ocrPageCoverage: 1, averageWordConfidence: 0.981, evidenceCompleteness: 0.89, recommendation: "Needs Review", humanReviewRequired: true, reviewTriggers: ["Policy profile unresolved", "Evidence incomplete"], falseReady: false },
    { id: "TEL-004", scenario: "Conflicting loan IDs", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 12267, ocrPageCoverage: 1, averageWordConfidence: 0.983, evidenceCompleteness: 1, recommendation: "Exception Identified", humanReviewRequired: true, reviewTriggers: ["Cross-document conflict"], falseReady: false },
    { id: "TEL-005", scenario: "Impossible chronology", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 12709, ocrPageCoverage: 1, averageWordConfidence: 0.979, evidenceCompleteness: 1, recommendation: "Exception Identified", humanReviewRequired: true, reviewTriggers: ["Deterministic chronology failure"], falseReady: false },
    { id: "TEL-006", scenario: "Correctable borrower extraction", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 11800, ocrPageCoverage: 1, averageWordConfidence: 0.971, evidenceCompleteness: 1, recommendation: "Needs Review", humanReviewRequired: true, reviewTriggers: ["Extraction conflict"], falseReady: false },
    { id: "TEL-007", scenario: "Raster low-resolution", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 9900, ocrPageCoverage: 0.38, averageWordConfidence: 0.86, evidenceCompleteness: 0, recommendation: "Needs Review", humanReviewRequired: true, reviewTriggers: ["OCR coverage failure", "Evidence incomplete"], falseReady: false },
    { id: "TEL-008", scenario: "Raster skewed/compressed", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 42200, ocrPageCoverage: 0.5, averageWordConfidence: 0.933, evidenceCompleteness: 0, recommendation: "Needs Review", humanReviewRequired: true, reviewTriggers: ["OCR coverage failure", "Evidence incomplete"], falseReady: false },
  ],
};
