const DOCUMENT_DEFINITIONS = [
  {
    type: "Promissory Note",
    signals: [/PROMISSORY NOTE/i, /promise to pay/i, /principal sum/i, /FOR VALUE RECEIVED/i],
  },
  {
    type: "Mortgage or Deed of Trust",
    signals: [/DEED OF TRUST/i, /\bMORTGAGE\b/i, /security instrument/i, /grants? and conveys?/i],
  },
  {
    type: "Closing Disclosure",
    signals: [/CLOSING DISCLOSURE/i, /Loan Terms/i, /Projected Payments/i, /Cash to Close/i],
  },
  {
    type: "Notice of Right to Cancel",
    signals: [/NOTICE OF RIGHT TO CANCEL/i, /RIGHT TO CANCEL/i, /You may cancel/i, /cancel this transaction/i],
  },
  {
    type: "Occupancy Affidavit",
    signals: [/OCCUPANCY AFFIDAVIT/i, /principal residence/i, /occupy the property/i, /owner.?occupied/i],
  },
  {
    type: "Signature/Name Affidavit",
    signals: [/SIGNATURE.*NAME AFFIDAVIT/i, /NAME AFFIDAVIT/i, /SIGNATURE AFFIDAVIT/i, /same person/i],
  },
  {
    type: "Notary Acknowledgment",
    signals: [/NOTARY ACKNOWLEDGMENT/i, /acknowledged before me/i, /NOTARY PUBLIC/i, /my commission expires/i],
  },
];

const STATE_NAMES = {
  TEXAS: "TX",
  CALIFORNIA: "CA",
  FLORIDA: "FL",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pageText(page) {
  return (page?.lines || []).map((line) => line.content).join("\n");
}

function pageGeometry(page) {
  return {
    width: Number.isFinite(page?.width) ? page.width : null,
    height: Number.isFinite(page?.height) ? page.height : null,
    unit: page?.unit || null,
  };
}

function evidenceFromPage(page, matchers = []) {
  const lines = page?.lines || [];
  const line = lines.find((candidate) => matchers.some((matcher) => matcher.test(candidate.content))) || lines[0];
  return {
    page: page?.pageNumber || 1,
    excerpt: line?.content || "No page evidence found",
    polygon: line?.polygon || null,
    pageGeometry: pageGeometry(page),
  };
}

function classifyPage(page) {
  const text = pageText(page);
  let best = { type: "Unknown document", matched: 0, signals: [] };

  for (const definition of DOCUMENT_DEFINITIONS) {
    const matchedSignals = definition.signals.filter((signal) => signal.test(text));
    if (matchedSignals.length > best.matched) {
      best = { type: definition.type, matched: matchedSignals.length, signals: definition.signals };
    }
  }

  const confidence = best.matched === 0 ? 0.25 : clamp(0.52 + best.matched * 0.12, 0.52, 0.99);
  return {
    page: page?.pageNumber || 1,
    type: best.type,
    confidence,
    evidence: evidenceFromPage(page, best.signals),
  };
}

function segmentPages(classifiedPages) {
  const segments = [];
  for (const item of classifiedPages) {
    const previous = segments[segments.length - 1];
    if (previous && previous.type === item.type && previous.endPage === item.page - 1) {
      previous.endPage = item.page;
      previous.pages += 1;
      previous.confidence = Math.min(previous.confidence, item.confidence);
      previous.pageClassifications.push(item);
      continue;
    }
    segments.push({
      id: `DOC-${String(segments.length + 1).padStart(2, "0")}`,
      type: item.type,
      startPage: item.page,
      endPage: item.page,
      pages: 1,
      confidence: item.confidence,
      evidence: item.evidence,
      pageClassifications: [item],
    });
  }
  return segments;
}

function uniqueMatches(text, pattern, group = 1) {
  return [...text.matchAll(pattern)].map((match) => match[group]?.trim()).filter(Boolean).filter((value, index, items) => items.indexOf(value) === index);
}

function extractLoanNumbers(text) {
  const values = uniqueMatches(text, /Loan\s*(?:No\.?|Number)\s*:\s*([A-Z0-9-]+)/gi);
  if (!values.length) values.push(...uniqueMatches(text, /\b(LN-\d{4,})\b/gi));
  return [...new Set(values)];
}

function extractBorrowers(text) {
  const values = uniqueMatches(text, /Borrower\s*:\s*([^\n]+)/gi);
  const received = text.match(/FOR VALUE RECEIVED,\s*([^\n]+?)\s*\(collectively,\s*["“]Borrower["”]\)/i)?.[1];
  if (received) values.push(...received.split(/\s+and\s+|,\s*/i).map((value) => value.trim()).filter(Boolean));
  return [...new Set(values)];
}

function extractJurisdiction(text, pages) {
  const addressLine = text.match(/Property Address\s*:\s*([^\n]+)/i)?.[1] || "";
  const postal = addressLine.match(/,\s*(TX|CA|FL)\b/i)?.[1]?.toUpperCase();
  if (postal) {
    const page = pages.find((item) => pageText(item).includes(addressLine));
    return { code: postal, confidence: 0.96, basis: "Property address", evidence: evidenceFromPage(page, [/Property Address/i]) };
  }

  for (const [name, code] of Object.entries(STATE_NAMES)) {
    const matcher = new RegExp(`\\b${name}\\b`, "i");
    const page = pages.find((item) => matcher.test(pageText(item)));
    if (page) return { code, confidence: 0.72, basis: "State text in package", evidence: evidenceFromPage(page, [matcher]) };
  }

  return { code: null, confidence: 0.2, basis: "Not resolved", evidence: null };
}

function ocrQuality(result) {
  const values = (result?.analyzeResult?.pages || []).flatMap((page) => (page.words || []).map((word) => word.confidence)).filter(Number.isFinite);
  if (!values.length) return { label: "Unknown", score: null };
  const score = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (score >= 0.95) return { label: "High", score };
  if (score >= 0.8) return { label: "Medium", score };
  return { label: "Low", score };
}

export function normalizeMortgagePackageAnalysis(result) {
  const pages = result?.analyzeResult?.pages || [];
  const content = result?.analyzeResult?.content || pages.map(pageText).join("\n");
  const classifiedPages = pages.map(classifyPage);
  const documents = segmentPages(classifiedPages);
  const loanNumbers = extractLoanNumbers(content);
  const borrowers = extractBorrowers(content);
  const jurisdiction = extractJurisdiction(content, pages);
  const unknownPages = classifiedPages.filter((item) => item.type === "Unknown document").map((item) => item.page);
  const lowConfidencePages = classifiedPages.filter((item) => item.confidence < 0.7).map((item) => item.page);
  const knownDocumentTypes = [...new Set(documents.filter((item) => item.type !== "Unknown document").map((item) => item.type))];

  const contextReady = Boolean(jurisdiction.code) && loanNumbers.length === 1;
  const inventoryReady = unknownPages.length === 0 && lowConfidencePages.length === 0;

  return {
    package: {
      pageCount: pages.length,
      documents,
      knownDocumentTypes,
      unknownPages,
      lowConfidencePages,
      ocrQuality: ocrQuality(result),
      status: contextReady && inventoryReady ? "Ready for QC Evaluation" : "Needs Package Review",
    },
    context: {
      loanNumber: loanNumbers.length === 1 ? loanNumbers[0] : null,
      loanNumberCandidates: loanNumbers,
      loanNumberConsistent: loanNumbers.length === 1,
      borrowers,
      jurisdiction,
      profileResolution: jurisdiction.code
        ? { status: "Candidate profile resolved", jurisdiction: jurisdiction.code, requiresHumanConfirmation: jurisdiction.confidence < 0.9 }
        : { status: "Needs context", jurisdiction: null, requiresHumanConfirmation: true },
    },
    provider: {
      modelId: result?.analyzeResult?.modelId || "prebuilt-layout",
      apiVersion: result?.analyzeResult?.apiVersion || "2024-11-30",
      status: result?.status || "succeeded",
    },
  };
}

export { DOCUMENT_DEFINITIONS };
