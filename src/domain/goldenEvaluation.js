import { computeRecommendation, RECOMMENDATION } from "./mortgageQc.js";
import { createPackageQcReview } from "./packageQcCase.js";

export function evaluateGoldenCases(cases = []) {
  const rows = cases.map((item, index) => {
    const review = createPackageQcReview({
      result: item.result,
      meta: { analysisId: `gold-${String(index + 1).padStart(4, "0")}` },
      now: new Date("2026-08-11T20:30:00-04:00"),
    });
    const predictedRecommendation = computeRecommendation(review.rules);
    const correct = predictedRecommendation === item.expectedRecommendation;
    const falseReady = predictedRecommendation === RECOMMENDATION.READY && item.expectedRecommendation !== RECOMMENDATION.READY;
    const falseException = predictedRecommendation === RECOMMENDATION.EXCEPTION && item.expectedRecommendation !== RECOMMENDATION.EXCEPTION;
    const missedException = predictedRecommendation !== RECOMMENDATION.EXCEPTION && item.expectedRecommendation === RECOMMENDATION.EXCEPTION;

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      rationale: item.rationale,
      expectedRecommendation: item.expectedRecommendation,
      predictedRecommendation,
      correct,
      falseReady,
      falseException,
      missedException,
      ruleCount: review.rules.length,
      blockers: review.rules.filter((rule) => rule.status === "Fail" || (rule.status === "Needs Review" && rule.fundingCritical)).map((rule) => rule.id),
    };
  });

  const total = rows.length;
  const count = (predicate) => rows.filter(predicate).length;
  const expectedReady = count((row) => row.expectedRecommendation === RECOMMENDATION.READY);
  const predictedReady = count((row) => row.predictedRecommendation === RECOMMENDATION.READY);
  const expectedExceptions = count((row) => row.expectedRecommendation === RECOMMENDATION.EXCEPTION);
  const predictedExceptions = count((row) => row.predictedRecommendation === RECOMMENDATION.EXCEPTION);
  const correct = count((row) => row.correct);
  const falseReady = count((row) => row.falseReady);
  const falseException = count((row) => row.falseException);
  const missedException = count((row) => row.missedException);

  return {
    rows,
    metrics: {
      totalCases: total,
      correctCases: correct,
      recommendationAccuracy: total ? correct / total : 0,
      falseReady,
      falseException,
      missedException,
      expectedReady,
      predictedReady,
      expectedExceptions,
      predictedExceptions,
      automationRate: total ? predictedReady / total : 0,
      releaseGatePassed: falseReady === 0,
    },
  };
}
