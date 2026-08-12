import { ocrLinesForPage, ocrPageText } from "./azureTextLayout.js";

const MONTHS = "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
const MONTH_NUMBERS = Object.freeze({
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
});

function pageText(page) {
  return ocrPageText(page);
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
    source: line?.source || null,
  };
}

function findLine(pages, matchers = []) {
  for (const page of pages) {
    const line = ocrLinesForPage(page).find((candidate) => matchers.some((matcher) => matcher.test(candidate.content)));
    if (line) return { page, line, evidence: evidenceFromLine(page, line) };
  }
  return null;
}

function findLastLine(pages, matchers = []) {
  for (const page of [...pages].reverse()) {
    const line = [...ocrLinesForPage(page)].reverse().find((candidate) => matchers.some((matcher) => matcher.test(candidate.content)));
    if (line) return { page, line, evidence: evidenceFromLine(page, line) };
  }
  return null;
}

function parseDateFromText(text) {
  if (!text) return null;
  const numeric = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (numeric) return `${numeric[3]}-${String(Number(numeric[1])).padStart(2, "0")}-${String(Number(numeric[2])).padStart(2, "0")}`;

  const named = text.match(new RegExp(`\\b(${MONTHS})\\s+(\\d{1,2}),\\s+(\\d{4})\\b`, "i"));
  if (!named) return null;
  const month = MONTH_NUMBERS[named[1].toLowerCase()];
  return month ? `${named[3]}-${month}-${String(Number(named[2])).padStart(2, "0")}` : null;
}

function pagesForDocument(rawPages, document) {
  if (!document) return [];
  return rawPages.filter((page) => page.pageNumber >= document.startPage && page.pageNumber <= document.endPage);
}

function documentByType(documents, type) {
  return documents.find((doc) => doc.type === type);
}

function extractDateField(rawPages, documents, type, matchers, fallback) {
  const document = documentByType(documents, type);
  if (!document) return null;
  const pages = pagesForDocument(rawPages, document);
  const found = findLine(pages, matchers);
  return {
    documentType: document.type,
    value: parseDateFromText(found?.line?.content),
    evidence: found?.evidence || evidenceFromLine(pages[0], null, fallback),
  };
}

function extractNoteExecutionDate(rawPages, documents) {
  return extractDateField(rawPages, documents, "Promissory Note", [
    new RegExp(`Execution Date\\s*:\\s*${MONTHS}\\s+\\d{1,2},\\s+\\d{4}`, "i"),
    new RegExp(`^Date\\s*:\\s*${MONTHS}\\s+\\d{1,2},\\s+\\d{4}`, "i"),
    /^Execution Date\s*:\s*\d{1,2}\/\d{1,2}\/\d{4}/i,
    /^Date\s*:\s*\d{1,2}\/\d{1,2}\/\d{4}/i,
  ], "Note execution date not found");
}

function extractClosingDate(rawPages, documents) {
  return extractDateField(rawPages, documents, "Closing Disclosure", [
    new RegExp(`Closing Date\\s*:\\s*${MONTHS}\\s+\\d{1,2},\\s+\\d{4}`, "i"),
    /^Closing Date\s*:\s*\d{1,2}\/\d{1,2}\/\d{4}/i,
    new RegExp(`Date of Closing\\s*:\\s*${MONTHS}\\s+\\d{1,2},\\s+\\d{4}`, "i"),
  ], "Closing Disclosure closing date not found");
}

function extractSignatureIndicators(rawPages, documents, borrowers = []) {
  const document = documentByType(documents, "Promissory Note");
  if (!document) return null;
  const pages = pagesForDocument(rawPages, document);
  const text = pages.map(pageText).join("\n");
  const indicators = borrowers.map((borrower) => {
    const escaped = borrower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const explicit = findLastLine(pages, [
      new RegExp(`(?:borrower\\s+)?signature\\s*:?\\s*${escaped}`, "i"),
      new RegExp(`signed\\s+by\\s*:?\\s*${escaped}`, "i"),
      new RegExp(`${escaped}.{0,20}(?:signature|signed)`, "i"),
    ]);
    const occurrenceCount = [...text.matchAll(new RegExp(escaped, "gi"))].length;
    const fallback = findLastLine(pages, [new RegExp(escaped, "i")]);
    const indicatorDetected = Boolean(explicit) || occurrenceCount >= 2;
    return {
      borrower,
      indicatorDetected,
      indicatorBasis: explicit ? "Explicit signature text indicator" : indicatorDetected ? "Repeated borrower text indicator" : "No signature text indicator",
      occurrenceCount,
      evidence: explicit?.evidence || fallback?.evidence || evidenceFromLine(pages.at(-1), null, `${borrower} signature indicator not found`),
    };
  });
  return { documentType: document.type, indicators };
}

function extractRtcEvidence(rawPages, documents, borrowers = []) {
  const document = documentByType(documents, "Notice of Right to Cancel");
  if (!document) return null;
  const pages = pagesForDocument(rawPages, document);
  const title = findLine(pages, [/NOTICE OF RIGHT TO CANCEL/i, /RIGHT TO CANCEL/i]);
  const cancelLanguage = findLine(pages, [/You may cancel/i, /cancel this transaction/i]);
  const transactionDate = findLine(pages, [/(?:Transaction|Execution|Receipt) Date\s*:/i]);
  const cancellationDeadline = findLine(pages, [/Cancellation Deadline\s*:/i, /Cancel(?:lation)? By\s*:/i, /midnight of\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)/i]);
  const borrowerIndicators = borrowers.map((borrower) => {
    const escaped = borrower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const found = findLine(pages, [new RegExp(escaped, "i")]);
    return { borrower, detected: Boolean(found), evidence: found?.evidence || null };
  });
  return {
    documentType: document.type,
    titleDetected: Boolean(title),
    cancelLanguageDetected: Boolean(cancelLanguage),
    transactionDate: parseDateFromText(transactionDate?.line?.content),
    transactionDateEvidence: transactionDate?.evidence || null,
    cancellationDeadline: parseDateFromText(cancellationDeadline?.line?.content),
    cancellationDeadlineEvidence: cancellationDeadline?.evidence || null,
    borrowerIndicators,
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
    acknowledgmentDate: parseDateFromText(acknowledged?.line?.content),
    acknowledgmentDateEvidence: acknowledged?.evidence || null,
    commissionExpirationDate: parseDateFromText(commission?.line?.content),
    commissionExpirationEvidence: commission?.evidence || null,
    evidence: acknowledged?.evidence || notary?.evidence || venue?.evidence || evidenceFromLine(pages[0], null, "Notary acknowledgment evidence not found"),
  };
}

function extractBorrowerConsistency(rawPages, documents, borrowers = []) {
  if (!borrowers.length) return null;
  const byDocument = documents.map((document) => {
    const pages = pagesForDocument(rawPages, document);
    const text = pages.map(pageText).join("\n");
    const detected = borrowers.filter((borrower) => new RegExp(borrower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text));
    const evidence = detected.length
      ? findLine(pages, detected.map((borrower) => new RegExp(borrower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")))?.evidence || null
      : null;
    return {
      documentType: document.type,
      startPage: document.startPage,
      endPage: document.endPage,
      borrowers: detected,
      evidence,
    };
  }).filter((item) => item.borrowers.length > 0);

  if (byDocument.length < 2) return { comparable: false, consistent: null, referenceBorrowers: borrowers, byDocument };
  const canonical = [...borrowers].map((item) => item.toLowerCase()).sort().join("|");
  const inconsistentDocuments = byDocument.filter((item) => [...item.borrowers].map((value) => value.toLowerCase()).sort().join("|") !== canonical);
  return {
    comparable: true,
    consistent: inconsistentDocuments.length === 0,
    referenceBorrowers: borrowers,
    byDocument,
    inconsistentDocuments,
  };
}

export function extractDocumentSpecificQc({ rawResult, packageResult }) {
  const rawPages = rawResult?.analyzeResult?.pages || [];
  const documents = packageResult?.package?.documents || [];
  const borrowers = packageResult?.context?.borrowers || [];
  return {
    noteExecutionDate: extractNoteExecutionDate(rawPages, documents),
    closingDate: extractClosingDate(rawPages, documents),
    noteSignatureIndicators: extractSignatureIndicators(rawPages, documents, borrowers),
    rightToCancel: extractRtcEvidence(rawPages, documents, borrowers),
    notaryAcknowledgment: extractNotaryEvidence(rawPages, documents),
    borrowerConsistency: extractBorrowerConsistency(rawPages, documents, borrowers),
  };
}
