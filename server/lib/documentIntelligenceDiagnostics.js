function finiteConfidences(pages = []) {
  return pages.flatMap((page) => (page?.words || []).map((word) => word?.confidence)).filter(Number.isFinite);
}

function pageTextLength(page) {
  const lineText = (page?.lines || []).map((line) => String(line?.content || "")).join(" ").trim();
  if (lineText) return lineText.length;
  return (page?.words || []).map((word) => String(word?.content || "")).join(" ").trim().length;
}

export function summarizeDocumentIntelligenceHealth(rawResult = {}) {
  const pages = rawResult?.analyzeResult?.pages || [];
  const confidences = finiteConfidences(pages);
  const wordCounts = pages.map((page) => (page?.words || []).filter((word) => String(word?.content || "").trim()).length);
  const lineCounts = pages.map((page) => (page?.lines || []).filter((line) => String(line?.content || "").trim()).length);
  const textLengths = pages.map(pageTextLength);
  const total = (values) => values.reduce((sum, value) => sum + value, 0);
  const pageCount = pages.length;
  const ratio = (count) => pageCount ? count / pageCount : 0;

  return {
    pageCount,
    wordCount: total(wordCounts),
    lineCount: total(lineCounts),
    textCharacters: total(textLengths),
    pagesWithWords: wordCounts.filter((count) => count > 0).length,
    pagesWithLines: lineCounts.filter((count) => count > 0).length,
    pagesWithText: textLengths.filter((count) => count > 0).length,
    wordCoverageByPage: ratio(wordCounts.filter((count) => count > 0).length),
    lineAvailabilityByPage: ratio(lineCounts.filter((count) => count > 0).length),
    textAvailabilityByPage: ratio(textLengths.filter((count) => count > 0).length),
    wordsPerPage: pageCount ? total(wordCounts) / pageCount : 0,
    averageWordConfidence: confidences.length ? total(confidences) / confidences.length : null,
    minWordConfidence: confidences.length ? Math.min(...confidences) : null,
    maxWordConfidence: confidences.length ? Math.max(...confidences) : null,
    pageRows: pages.map((page, index) => ({
      page: Number.isInteger(page?.pageNumber) ? page.pageNumber : index + 1,
      words: wordCounts[index],
      lines: lineCounts[index],
      textCharacters: textLengths[index],
      width: Number.isFinite(page?.width) ? page.width : null,
      height: Number.isFinite(page?.height) ? page.height : null,
      unit: page?.unit || null,
    })),
  };
}

export function classifyDocumentIntelligenceHealth(summary = {}) {
  if (!summary.pageCount) return "NO_PAGES";
  if (summary.pagesWithWords === 0 && summary.pagesWithLines === 0) return "NO_OCR_TEXT";
  if (summary.wordCoverageByPage < 1 || summary.textAvailabilityByPage < 1) return "PARTIAL_PAGE_COVERAGE";
  if (summary.pagesWithLines === 0 && summary.pagesWithWords > 0) return "WORDS_WITHOUT_LINES";
  return "TEXT_AVAILABLE";
}
