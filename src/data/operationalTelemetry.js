export const OPERATIONAL_TELEMETRY_V1 = {
  label: "Controlled benchmark telemetry",
  capturedAt: "2026-08-15T20:30:00Z",
  source: "Previously measured synthetic PDF and raster benchmark runs",
  caveat: "This is portfolio telemetry from controlled synthetic benchmarks, not production traffic or SLA monitoring. Fields that were not captured in the original run remain null instead of being estimated.",
  events: [
    { id: "TEL-001", scenario: "Clean digital package", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 9810, ocrPageCoverage: null, averageWordConfidence: null, evidenceCompleteness: 1, recommendation: "Needs Review", humanReviewRequired: true, reviewTriggers: ["Human confirmation required"], falseReady: false },
    { id: "TEL-002", scenario: "Unknown page classification", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 12356, ocrPageCoverage: null, averageWordConfidence: null, evidenceCompleteness: 1, recommendation: "Needs Review", humanReviewRequired: true, reviewTriggers: ["Classification uncertainty"], falseReady: false },
    { id: "TEL-003", scenario: "Unresolved jurisdiction", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 12409, ocrPageCoverage: null, averageWordConfidence: null, evidenceCompleteness: 1, recommendation: "Needs Review", humanReviewRequired: true, reviewTriggers: ["Policy profile unresolved"], falseReady: false },
    { id: "TEL-004", scenario: "Conflicting loan IDs", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 12267, ocrPageCoverage: null, averageWordConfidence: null, evidenceCompleteness: 1, recommendation: "Exception Identified", humanReviewRequired: true, reviewTriggers: ["Cross-document conflict"], falseReady: false },
    { id: "TEL-005", scenario: "Impossible chronology", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 12709, ocrPageCoverage: null, averageWordConfidence: null, evidenceCompleteness: 1, recommendation: "Exception Identified", humanReviewRequired: true, reviewTriggers: ["Deterministic chronology failure"], falseReady: false },
    { id: "TEL-006", scenario: "Raster low-resolution", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 9900, ocrPageCoverage: null, averageWordConfidence: 0.860, evidenceCompleteness: 0, recommendation: "Needs Review", humanReviewRequired: true, reviewTriggers: ["OCR coverage not instrumented", "Evidence incomplete"], falseReady: false },
    { id: "TEL-007", scenario: "Raster skewed/compressed", pagesAnalyzed: 8, providerCalls: 4, latencyMs: 42200, ocrPageCoverage: null, averageWordConfidence: 0.933, evidenceCompleteness: 0, recommendation: "Needs Review", humanReviewRequired: true, reviewTriggers: ["OCR coverage not instrumented", "Evidence incomplete"], falseReady: false },
  ],
};
