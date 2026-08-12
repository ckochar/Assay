import { RECOMMENDATION } from "./mortgageQc.js";

function sameScalar(actual, expected) {
  return (actual ?? null) === (expected ?? null);
}

function normalizedSet(values = []) {
  return [...new Set(values.map((value) => String(value).trim().toLowerCase()).filter(Boolean))].sort();
}

function sameSet(actual = [], expected = []) {
  const left = normalizedSet(actual);
  const right = normalizedSet(expected);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function pageTypesFromDocuments(documents = []) {
  const byPage = new Map();
  for (const document of documents) {
    for (const item of document.pageClassifications || []) byPage.set(item.page, item.type);
  }
  return byPage;
}

function fieldRows(result, label) {
  const documentQc = result?.documentQc || {};
  const rtc = documentQc.rightToCancel || {};
  const notary = documentQc.notaryAcknowledgment || {};
  const expected = label.fields || {};
  const actual = {
    loanNumber: result?.context?.loanNumber ?? null,
    loanNumberCandidates: result?.context?.loanNumberCandidates || [],
    borrowers: result?.context?.borrowers || [],
    jurisdiction: result?.context?.jurisdiction?.code ?? null,
    noteExecutionDate: documentQc.noteExecutionDate?.value ?? null,
    closingDate: documentQc.closingDate?.value ?? null,
    rtcTransactionDate: rtc.transactionDate ?? null,
    rtcCancellationDeadline: rtc.cancellationDeadline ?? null,
    notaryAcknowledgmentDate: notary.acknowledgmentDate ?? null,
    notaryCommissionExpirationDate: notary.commissionExpirationDate ?? null,
  };

  return Object.keys(expected).map((name) => {
    const isSet = name === "borrowers" || name === "loanNumberCandidates";
    return {
      name,
      expected: expected[name],
      actual: actual[name],
      correct: isSet ? sameSet(actual[name], expected[name]) : sameScalar(actual[name], expected[name]),
    };
  });
}

function evidenceRows(result, label) {
  const documentQc = result?.documentQc || {};
  const rtc = documentQc.rightToCancel || {};
  const notary = documentQc.notaryAcknowledgment || {};
  const evidence = {
    loanNumber: result?.context?.loanNumberEvidence,
    borrowers: result?.context?.borrowerEvidence,
    jurisdiction: result?.context?.jurisdiction?.evidence,
    noteExecutionDate: documentQc.noteExecutionDate?.evidence,
    closingDate: documentQc.closingDate?.evidence,
    rtcTransactionDate: rtc.transactionDateEvidence,
    rtcCancellationDeadline: rtc.cancellationDeadlineEvidence,
    notaryAcknowledgmentDate: notary.acknowledgmentDateEvidence,
    notaryCommissionExpirationDate: notary.commissionExpirationEvidence,
  };

  return Object.entries(label.evidencePages || {})
    .filter(([, expectedPage]) => expectedPage !== null && expectedPage !== undefined)
    .map(([name, expectedPage]) => ({
      name,
      expectedPage,
      actualPage: evidence[name]?.page ?? null,
      correct: evidence[name]?.page === expectedPage,
    }));
}

function classificationRows(result, label) {
  const actual = pageTypesFromDocuments(result?.package?.documents || []);
  return (label.pageTypes || []).map((expectedType, index) => ({
    page: index + 1,
    expectedType,
    actualType: actual.get(index + 1) || "Missing page",
    correct: actual.get(index + 1) === expectedType,
  }));
}

function recommendationFlags(predictedRecommendation, expectedRecommendation) {
  return {
    correct: predictedRecommendation === expectedRecommendation,
    falseReady: predictedRecommendation === RECOMMENDATION.READY && expectedRecommendation !== RECOMMENDATION.READY,
    falseException: predictedRecommendation === RECOMMENDATION.EXCEPTION && expectedRecommendation !== RECOMMENDATION.EXCEPTION,
    missedException: predictedRecommendation !== RECOMMENDATION.EXCEPTION && expectedRecommendation === RECOMMENDATION.EXCEPTION,
  };
}

export function scorePdfEvaluationCase({ scenario, result, predictedRecommendation, latencyMs = null, provider = null }) {
  if (!scenario?.label) throw new Error("PDF evaluation scenario label is required");
  const classifications = classificationRows(result, scenario.label);
  const fields = fieldRows(result, scenario.label);
  const evidence = evidenceRows(result, scenario.label);
  const recommendation = recommendationFlags(predictedRecommendation, scenario.label.expectedRecommendation);
  const countCorrect = (rows) => rows.filter((row) => row.correct).length;

  return {
    id: scenario.id,
    name: scenario.name,
    category: scenario.category,
    expectedRecommendation: scenario.label.expectedRecommendation,
    predictedRecommendation,
    classification: {
      correct: countCorrect(classifications),
      total: classifications.length,
      accuracy: classifications.length ? countCorrect(classifications) / classifications.length : 0,
      rows: classifications,
    },
    extraction: {
      correct: countCorrect(fields),
      total: fields.length,
      accuracy: fields.length ? countCorrect(fields) / fields.length : 0,
      rows: fields,
    },
    evidence: {
      correct: countCorrect(evidence),
      total: evidence.length,
      sourcePageAccuracy: evidence.length ? countCorrect(evidence) / evidence.length : 0,
      rows: evidence,
    },
    recommendation,
    latencyMs: Number.isFinite(latencyMs) ? latencyMs : null,
    pagesAnalyzed: result?.package?.pageCount ?? null,
    ocrQuality: result?.package?.ocrQuality || null,
    provider: provider || result?.provider || null,
  };
}

function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export function summarizePdfEvaluation(rows = []) {
  const totals = rows.reduce((summary, row) => {
    summary.classificationCorrect += row.classification.correct;
    summary.classificationTotal += row.classification.total;
    summary.extractionCorrect += row.extraction.correct;
    summary.extractionTotal += row.extraction.total;
    summary.evidenceCorrect += row.evidence.correct;
    summary.evidenceTotal += row.evidence.total;
    summary.recommendationCorrect += row.recommendation.correct ? 1 : 0;
    summary.falseReady += row.recommendation.falseReady ? 1 : 0;
    summary.falseException += row.recommendation.falseException ? 1 : 0;
    summary.missedException += row.recommendation.missedException ? 1 : 0;
    summary.pagesAnalyzed += Number.isFinite(row.pagesAnalyzed) ? row.pagesAnalyzed : 0;
    return summary;
  }, {
    classificationCorrect: 0,
    classificationTotal: 0,
    extractionCorrect: 0,
    extractionTotal: 0,
    evidenceCorrect: 0,
    evidenceTotal: 0,
    recommendationCorrect: 0,
    falseReady: 0,
    falseException: 0,
    missedException: 0,
    pagesAnalyzed: 0,
  });
  const latency = rows.map((row) => row.latencyMs).filter(Number.isFinite);
  const ratio = (correct, total) => total ? correct / total : 0;

  return {
    packages: rows.length,
    ...totals,
    classificationAccuracy: ratio(totals.classificationCorrect, totals.classificationTotal),
    extractionAccuracy: ratio(totals.extractionCorrect, totals.extractionTotal),
    evidenceSourcePageAccuracy: ratio(totals.evidenceCorrect, totals.evidenceTotal),
    recommendationAccuracy: ratio(totals.recommendationCorrect, rows.length),
    p50LatencyMs: percentile(latency, 0.5),
    p95LatencyMs: percentile(latency, 0.95),
    releaseGatePassed: totals.falseReady === 0,
  };
}
