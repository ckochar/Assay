# Assay evaluation methodology

Assay separates **decision-layer reliability** from **document-intelligence reliability** so failures can be diagnosed rather than hidden inside one blended accuracy score.

This document describes the current production evaluation and the next PDF-level benchmark.

## Why evaluation is split into layers

A mortgage-document QC result can be wrong for different reasons:

1. OCR may read the page incorrectly.
2. A page may be classified as the wrong document type.
3. A field may be extracted incorrectly.
4. The correct evidence may be extracted but linked to the wrong page/region.
5. The normalized evidence may be correct but the deterministic control may evaluate it incorrectly.
6. The rule result may be correct but the package recommendation may route incorrectly.

A single end-to-end accuracy number would make these failure modes difficult to understand. Assay therefore evaluates the **decision layer** independently and will evaluate the **PDF/Azure layer** separately.

---

# 1. Current production benchmark: decision layer

## Scope

The current golden set starts from **labeled structured package evidence** and passes that evidence through the same package-QC case builder and recommendation logic used by the application.

It measures whether Assay converts known evidence into the expected package recommendation safely.

It does **not** measure Azure OCR, page classification, field extraction, evidence localization, latency, or cost.

## Golden set

The current set contains **10 synthetic cases**:

- **1 Ready control**
- **6 Human review cases**
- **3 Deterministic exception cases**

The cases intentionally include different risk modes rather than only clean packages.

### Ready control

- foundation-only clean package

### Human-review cases

- clean execution evidence that still requires signature/notary confirmation
- missing signature text/location indicator
- cross-document borrower-name mismatch
- Note / Closing Disclosure date mismatch
- unknown package-page classification
- unresolved jurisdiction/profile context

These cases test whether Assay avoids converting ambiguity into an unsupported deterministic exception or ready recommendation.

### Deterministic exception cases

- conflicting loan numbers
- Right-to-Cancel deadline before transaction date
- notary commission expiration before acknowledgment date

These cases represent contradictions that the current prototype treats as internally deterministic rather than matters of visual/legal judgment.

## How predictions are generated

For each golden case, Assay:

1. creates a package QC review using `createPackageQcReview`
2. runs the generated rules through `computeRecommendation`
3. compares the predicted recommendation with the labeled expected recommendation
4. records safety-error categories

The evaluation UI consumes these computed results. The displayed reliability metrics are not hard-coded presentation values.

## Metric definitions

### Recommendation accuracy

The fraction of golden cases where:

```text
predicted recommendation == expected recommendation
```

### False ready

A **false ready** occurs when Assay predicts `Ready for Review` for a case whose expected recommendation is not ready.

```text
predicted = Ready for Review
expected != Ready for Review
```

This is the primary safety metric.

### False exception

A **false exception** occurs when Assay predicts `Exception Identified` but the labeled expected recommendation is not an exception.

```text
predicted = Exception Identified
expected != Exception Identified
```

False exceptions create unnecessary manual work or may incorrectly represent evidence as a deterministic defect.

### Missed deterministic exception

A **missed exception** occurs when a labeled deterministic exception does not produce `Exception Identified`.

```text
expected = Exception Identified
predicted != Exception Identified
```

### Automation rate

For the current evaluator, automation rate is the fraction of cases predicted `Ready for Review`.

This is a prototype operational metric, not a target to maximize independently. Increasing automation is only useful if the false-ready gate remains satisfied.

## Current production result

The production baseline currently reports:

- **10 / 10** recommendation matches
- **0** false-ready packages
- **0** false exceptions
- **0** missed deterministic exceptions

The automated test suite includes regression tests for these properties.

## Release gate

The primary decision-layer release gate is:

> **Zero false-ready packages in the labeled golden set.**

A false exception increases review work. A false-ready result can create materially greater operational, customer, or compliance risk.

The zero-false-ready gate is enforced in automated tests, so a regression prevents the normal build from succeeding.

## What this result does not prove

The 10/10 result should not be interpreted as:

- 100% OCR accuracy
- 100% mortgage document classification accuracy
- 100% field extraction accuracy
- production-grade legal/compliance accuracy
- generalization to unseen lenders, forms, jurisdictions, scans, or handwriting
- proof that ten cases are statistically sufficient for deployment

The benchmark is intentionally small and synthetic. Its purpose is to establish a **transparent safety contract for deterministic decision behavior** before introducing extraction variability.

---

# 2. Next benchmark: PDF-level / Azure evaluation

The next milestone will start from actual **synthetic PDF packages** and run them through the same live Azure path used by `/package`.

The goal is to measure document-intelligence quality without confusing it with decision-engine quality.

## Proposed labeled dataset

Start with a controlled set of synthetic packages covering:

- clean, high-quality PDFs
- multiple mortgage document types in one package
- borrower-name variation
- date variation
- deterministic chronology contradictions
- low-quality / degraded text
- unknown or unsupported pages
- unresolved jurisdiction context
- missing or conflicting package identity
- evidence that requires human confirmation

Each package should have labels at several levels:

### Package labels

- expected document inventory
- expected package status
- expected recommendation after normalized evidence

### Page/document labels

- document type per page
- expected document boundaries

### Field labels

- loan number
- borrower names
- jurisdiction
- execution/closing dates
- RTC dates
- notary acknowledgment date
- commission-expiration date

### Evidence labels

- expected source page
- expected text excerpt or semantic field source
- expected region/polygon when stable enough to label

### Rule labels

- expected rule status
- expected human-review trigger
- expected funding blocker behavior

## Metrics to report

### Document classification

- page-level accuracy
- precision / recall by document type
- document-boundary accuracy
- unknown-page routing rate

### Field extraction

For structured fields:

- exact-match accuracy where appropriate
- normalized-match accuracy for names/dates
- precision
- recall
- F1

### Evidence localization

- correct source-page rate
- correct document-segment rate
- region/polygon overlap or qualitative region match for fields where geometric labeling is stable

### Review routing

- correct human-review routing rate
- false-ready rate after extraction
- false-exception rate after extraction
- unable-to-process rate

### Performance

- P50 package latency
- P95 package latency
- Azure pages analyzed per package
- estimated Azure processing cost per package

## Error taxonomy

Every failed PDF-level case should be assigned to the earliest meaningful failure layer:

```text
OCR
 -> classification
 -> extraction
 -> normalization/evidence
 -> deterministic rule
 -> package recommendation
```

This prevents, for example, an OCR error from being mislabeled as a rule-engine defect.

## Release-gate direction

The decision-layer gate remains unchanged:

> zero false-ready cases in the decision golden set

For the PDF-level benchmark, the first release gate should also require:

> zero false-ready packages in the labeled end-to-end PDF set

Secondary thresholds for classification, extraction, localization, latency, and cost should be established only after the initial baseline is measured. They should not be invented before observing the actual system distribution.

---

# 3. Future evaluation maturity

After the first PDF-level benchmark, the evaluation system can expand toward:

- 20–30+ labeled packages
- multiple layout variants for each document type
- controlled OCR degradation
- provider/model comparison
- threshold calibration by field and document type
- regression slices by jurisdiction/profile
- latency and cost trends over time
- extraction drift monitoring
- profile-version comparison
- reviewer-override analysis

The goal is not to maximize one headline score. The goal is to make Assay's **failure modes visible, attributable, and safe to route**.

## Source files

Current decision-layer evaluation implementation:

- `src/data/goldenEvaluationCases.js`
- `src/domain/goldenEvaluation.js`
- `test/goldenEvaluation.test.js`
- `src/EvaluationScreen.jsx`

Core recommendation semantics:

- `src/domain/mortgageQc.js`
- `src/domain/packageQcCase.js`
