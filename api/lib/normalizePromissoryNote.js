const MONTHS = "(?:January|February|March|April|May|June|July|August|September|October|November|December)";

function average(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
}

function pageText(result, pageNumber) {
  const page = result?.analyzeResult?.pages?.find((item) =>