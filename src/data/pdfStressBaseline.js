import { summarizePdfEvaluation } from "../domain/pdfEvaluation.js";

export const PDF_STRESS_BASELINE_META = Object.freeze({
  capturedAt: "2026-08-12T04:04:41Z",
  scope: "3 controlled synthetic digital mortgage stress packages",
  packages: 3,
  pagesPerPackage: 8,
  totalPages: 24,
  provider: "Azure AI Document Intelligence",
  modelId: "prebuilt-layout",
  apiVersion: "2024-11-30",
  configuredTier: "F0",
  pagesPerRequest: 2,
  chunksPerPackage: 4,
  profile: "MORTGAGE-QC-TX v2.2.0",
  costStatus: "Not instrumented",
  limitations: Object.freeze([
    "Rotation and compact-layout cases are generated digital PDFs, not rasterized scan tests.",
    "Does not measure handwriting, blur, noise, scan compression, low-DPI rasterization, or severe image degradation.",
    "Small three-package stress set; not a production accuracy or generalization claim.",
    "Processing cost was not instrumented for this run.",
  ]),
});

export const PDF_STRESS_BASELINE_ROWS = Object.freeze([
  {
    id: "STRESS-001",
    name: "Mixed page rotation",
    category: "Orientation stress",
    expectedRecommendation: "Needs Review",
    predictedRecommendation: "Needs Review",
    classification: { correct: 8, total: 8 },
    extraction: { correct: 10, total: 10 },
    evidence: { correct: 9, present: 9, total: 9 },
    recommendation: { correct: true, falseReady: false, falseException: false, missedException: false },
    latencyMs: 12323,
    pagesAnalyzed: 8,
    ocrQuality: { label: "High", score: 0.9937088235294146 },
    observation: "Mixed 90°/270° page rotation metadata did not change the labeled classification, extraction, evidence, or recommendation results in this controlled digital fixture.",
  },
  {
    id: "STRESS-002",
    name: "Low-contrast compact layout",
    category: "Typography and layout stress",
    expectedRecommendation: "Needs Review",
    predictedRecommendation: "Needs Review",
    classification: { correct: 8, total: 8 },
    extraction: { correct: 10, total: 10 },
    evidence: { correct: 9, present: 9, total: 9 },
    recommendation: { correct: true, falseReady: false, falseException: false, missedException: false },
    latencyMs: 12363,
    pagesAnalyzed: 8,
    ocrQuality: { label: "High", score: 0.9936529411764714 },
    observation: "Smaller, lighter two-column digital text remained extractable; one borrower evidence excerpt was truncated, while the labeled borrower set was still recovered from redundant source lines.",
  },
  {
    id: "STRESS-003",
    name: "Duplicated closing page / missing notary",
    category: "Package structure stress",
    expectedRecommendation: "Exception Identified",
    predictedRecommendation: "Exception Identified",
    classification: { correct: 8, total: 8 },
    extraction: { correct: 10, total: 10 },
    evidence: { correct: 7, present: 7, total: 7 },
    recommendation: { correct: true, falseReady: false, falseException: false, missedException: false },
    latencyMs: 12520,
    pagesAnalyzed: 8,
    ocrQuality: { label: "High", score: 0.9935524079320134 },
    observation: "Azure correctly omitted Notary evidence. The versioned QC-only sample profile then failed PKG-DOC-REQ-001 because the configured Notary Acknowledgment was absent.",
  },
]);

export const PDF_STRESS_BASELINE_SUMMARY = Object.freeze(
  summarizePdfEvaluation(PDF_STRESS_BASELINE_ROWS)
);
