const MONTHS = "(?:January|February|March|April|May|June|July|August|September|October|November|December)";

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

function evidenceFromLine(page, line, fallback = "Evidence not found") {
  return {
    page: page?.pageNumber || 1,
    excerpt: line?.content || fallback,
    polygon: line?.polygon || null,
    pageGeometry: pageGeometry(page),
  };
}

function findLine(pages, matchers = []) {
  for (const page of pages) {
    const line = (page?.lines || []).find((candidate) => matchers.some((matcher) => matcher.test(candidate.content)));
    if (line) return { page, line, evidence: evidenceFromLine(page, line) };
  }
  return null;
}

function normalizeDate(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/^(Date|Execution Date|Closing Date|Acknowledged before me on)\s*:?\s*/i, "").trim().replace(/[.]+$/, "");
  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? cleaned : parsed.toISOString().slice(0, 10);
}

function pagesForDocument(rawPages, document) {
  if (!document) return [];
  return rawPages.filter((page) => page.pageNumber >= document.startPage && page.pageNumber <= document.endPage);
}

function documentByType(documents, type) {
  return documents.find((doc) => doc.type === type);
}

function extractNoteExecutionDate(rawPages, documents) {
  const document = documentByType(documents, "Promissory Note");
  if (!document) return null;
  const pages = pagesForDocument(rawPages, document);
  const found = findLine(pages, [
    new RegExp(`Execution Date\\s*:\\s*${MONTHS}\\s+\\d{1,2},\\s+\\d{4}`, "i"),
    new RegExp(`^Date\\s*:\\s*${MONTHS}\\s+\\d{1,2},\\s+\\d{4}`, "i"),
    /^Execution Date\s*:\s*\d{1,2}\/\d{1,2}\/\d{4}/i,
  ]);
  return {
    documentType: document.type,
    value: found ? normalizeDate(found.line.content) : null,
    evidence: found?.evidence || evidenceFromLine(pages[0], null, "Note execution date not found"),
  };
}

function extractSignatureIndicators(rawPages, documents, borrowers = []) {
  const document = documentByType(documents, "Promissory Note");
  if (!document) return null;
  const pages = pagesForDocument(rawPages, document);
  const text = pages.map(pageText).join("\n");
  const indicators = borrowers.map((borrower) => {
    const escaped = borrower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const occurrenceCount = [...text.matchAll(new RegExp(escaped, "gi"))].length;
    const found = findLine(pages, [new RegExp(escaped, "i")]);
    return {
      borrower,
      indicatorDetected: occurrenceCount >= 2,
      occurrenceCount,
      evidence: found?.evidence || evidenceFromLine(pages.at(-1), null, `${borrower} signature indicator not found`),
    };
  });
  return { documentType: document.type, indicators };
}

function extractRtcEvidence(rawPages, documents) {
  const document = documentByType(documents, "Notice of Right to Cancel");
  if (!document) return null;
  const pages = pagesForDocument(rawPages, document);
  const title = findLine(pages, [/NOTICE OF RIGHT TO CANCEL/i, /RIGHT TO CANCEL/i]);
  const cancelLanguage = findLine(pages, [/You may cancel/i, /cancel this transaction/i]);
  return {
    documentType: document.type,
    titleDetected: Boolean(title),
    cancelLanguageDetected: Boolean(cancelLanguage),
    evidence: cancelLanguage?.evidence || title?.evidence || evidenceFromLine(pages[0], null, "Right-to-Cancel evidence not found"),
  };
}

function extractNotaryEvidence(rawPages, documents) {
  const document = documentByType(documents, "Notary Acknowledgment");
  if (!document) return null;
  const pages = pagesForDocument(rawPages, document);
  const venue = findLine(pages, [/^State of /i, /^County of /i]);
  const acknowledged = findLine(pages, [/acknowledged before me/i]);
  const notary = findLine(pages, [/NOTARY PUBLIC/i, /Notary Signature/i]);
  const commission = findLine(pages, [/commission expires/i, /commission expiration/i]);
  return {
    documentType: document.type,
    fields: {
      venue: Boolean(venue),
      acknowledgment: Boolean(acknowledged),
      notaryIndicator: Boolean(notary),
      commissionExpiration: Boolean(commission),
    },
    evidence: acknowledged?.evidence || notary?.evidence || venue?.evidence || evidenceFromLine(pages[0], null, "Notary acknowledgment evidence not found"),
  };
}

export function extractDocumentSpecificQc({ rawResult, packageResult }) {
  const rawPages = rawResult?.analyzeResult?.pages || [];
  const documents = packageResult?.package?.documents || [];
  const borrowers = packageResult?.context?.borrowers || [];
  return {
    noteExecutionDate: extractNoteExecutionDate(rawPages, documents),
    noteSignatureIndicators: extractSignatureIndicators(rawPages, documents, borrowers),
    rightToCancel: extractRtcEvidence(rawPages, documents),
    notaryAcknowledgment: extractNotaryEvidence(rawPages, documents),
  };
}
