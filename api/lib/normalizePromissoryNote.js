const MONTHS = "(?:January|February|March|April|May|June|July|August|September|October|November|December)";

function average(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
}

function pageText(result, pageNumber) {
  const page = result?.analyzeResult?.pages?.find((item) => item.pageNumber === pageNumber);
  return (page?.lines || []).map((line) => line.content).join("\n");
}

function allText(result) {
  return result?.analyzeResult?.content || result?.analyzeResult?.pages?.flatMap((page) => page.lines || []).map((line) => line.content).join("\n") || "";
}

function lineEvidence(result, matcher) {
  for (const page of result?.analyzeResult?.pages || []) {
    const line = (page.lines || []).find((candidate) => matcher.test(candidate.content));
    if (line) {
      return {
        page: page.pageNumber,
        excerpt: line.content,
        polygon: line.polygon || null,
      };
    }
  }
  return null;
}

function matchOne(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function normalizedDate(raw) {
  if (!raw) return null;
  const parsed = new Date(raw.replace(/^(Date|Execution Date)\s*:\s*/i, "").trim());
  return Number.isNaN(parsed.getTime()) ? raw.trim() : parsed.toISOString().slice(0, 10);
}

function getOcrQuality(result) {
  const confidences = (result?.analyzeResult?.pages || []).flatMap((page) =>
    (page.words || []).map((word) => word.confidence),
  );
  const score = average(confidences);
  if (score == null) return { label: "Unknown", score: null };
  if (score >= 0.95) return { label: "High", score };
  if (score >= 0.8) return { label: "Medium", score };
  return { label: "Low", score };
}

function classifyPromissoryNote(text) {
  const signals = [
    /PROMISSORY NOTE/i.test(text),
    /FOR VALUE RECEIVED/i.test(text),
    /promise to pay/i.test(text),
    /principal sum/i.test(text),
  ];
  const matched = signals.filter(Boolean).length;
  return {
    documentType: matched >= 2 ? "Promissory Note" : "Unknown document",
    confidence: Math.min(0.99, 0.45 + matched * 0.13),
    matchedSignals: matched,
  };
}

function extractBorrowers(text) {
  const candidates = [];
  const header = text.match(/FOR VALUE RECEIVED,\s*([^\n]+?)\s*\(collectively,\s*["“]Borrower["”]\)/i);
  if (header) candidates.push(...header[1].split(/\s+and\s+|,\s*/i));

  const borrowerLines = [...text.matchAll(/Borrower\s*:\s*([^\n]+)/gi)].map((match) => match[1].trim());
  candidates.push(...borrowerLines);

  return [...new Set(candidates.map((value) => value.trim()).filter(Boolean))];
}

function extractLoanNumber(text) {
  return matchOne(text, [
    /Loan\s*(?:No\.?|Number)\s*:\s*([A-Z0-9-]+)/i,
    /\b(LN-\d{4,})\b/i,
  ])?.[1] || null;
}

function extractExecutionDate(text) {
  const match = matchOne(text, [
    new RegExp(`Execution Date\\s*:\\s*(${MONTHS}\\s+\\d{1,2},\\s+\\d{4})`, "i"),
    new RegExp(`Date\\s*:\\s*(${MONTHS}\\s+\\d{1,2},\\s+\\d{4})`, "i"),
    /Execution Date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ]);
  return normalizedDate(match?.[1] || null);
}

function detectSignatureIndicators(result, borrowers) {
  const secondPage = pageText(result, 2);
  const indicators = borrowers.map((borrower) => {
    const escaped = borrower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const occurrences = [...secondPage.matchAll(new RegExp(escaped, "gi"))].length;
    return {
      borrower,
      indicatorDetected: occurrences >= 2,
      evidence: lineEvidence(result, new RegExp(`^${escaped}$`, "i")) || lineEvidence(result, new RegExp(escaped, "i")),
    };
  });
  return indicators;
}

export function normalizePromissoryNoteAnalysis(result) {
  const text = allText(result);
  const classification = classifyPromissoryNote(text);
  const borrowers = extractBorrowers(text);
  const loanNumber = extractLoanNumber(text);
  const executionDate = extractExecutionDate(text);
  const signatures = detectSignatureIndicators(result, borrowers);
  const ocrQuality = getOcrQuality(result);
  const pageCount = result?.analyzeResult?.pages?.length || 0;

  const rules = [
    {
      id: "DOC-TYPE-001",
      name: "Document classified as Promissory Note",
      status: classification.documentType === "Promissory Note" ? "Pass" : "Needs Review",
      fundingCritical: true,
      extractedValue: classification.documentType,
      confidence: { classification: classification.confidence, extraction: null, ocrQuality: ocrQuality.label, evidenceComplete: classification.matchedSignals >= 2 },
      evidence: lineEvidence(result, /PROMISSORY NOTE/i) || { page: 1, excerpt: "Document-title evidence not found", polygon: null },
    },
    {
      id: "BORROWER-001",
      name: "Borrower names extracted",
      status: borrowers.length ? "Pass" : "Needs Review",
      fundingCritical: true,
      extractedValue: borrowers.length ? borrowers.join("; ") : "Not extracted",
      confidence: { classification: classification.confidence, extraction: borrowers.length ? 0.9 : 0.35, ocrQuality: ocrQuality.label, evidenceComplete: borrowers.length > 0 },
      evidence: lineEvidence(result, /FOR VALUE RECEIVED/i) || lineEvidence(result, /Borrower\s*:/i) || { page: 1, excerpt: "Borrower evidence not found", polygon: null },
    },
    {
      id: "DATE-001",
      name: "Execution date extracted",
      status: executionDate ? "Pass" : "Needs Review",
      fundingCritical: true,
      extractedValue: executionDate || "Not extracted",
      confidence: { classification: classification.confidence, extraction: executionDate ? 0.92 : 0.35, ocrQuality: ocrQuality.label, evidenceComplete: Boolean(executionDate) },
      evidence: lineEvidence(result, /Execution Date\s*:/i) || lineEvidence(result, /^Date\s*:/i) || { page: 1, excerpt: "Execution-date evidence not found", polygon: null },
    },
    {
      id: "SIG-IND-001",
      name: "Borrower signature indicators require human confirmation",
      status: signatures.length && signatures.every((item) => item.indicatorDetected) ? "Needs Review" : "Fail",
      fundingCritical: true,
      extractedValue: signatures.length ? signatures.map((item) => `${item.borrower}: ${item.indicatorDetected ? "indicator detected" : "not detected"}`).join("; ") : "No borrower names available for comparison",
      confidence: { classification: classification.confidence, extraction: signatures.length ? 0.68 : 0.2, ocrQuality: ocrQuality.label, evidenceComplete: false, reviewTrigger: "OCR text cannot establish legal signature validity" },
      evidence: signatures.find((item) => item.evidence)?.evidence || { page: 2, excerpt: "Signature indicator evidence not found", polygon: null },
    },
  ];

  return {
    document: {
      type: classification.documentType,
      pageCount,
      loanNumber,
      borrowers,
      executionDate,
      ocrQuality,
    },
    rules,
    provider: {
      modelId: result?.analyzeResult?.modelId || "prebuilt-layout",
      apiVersion: result?.analyzeResult?.apiVersion || "2024-11-30",
      status: result?.status || "succeeded",
    },
  };
}
