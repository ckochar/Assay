# Assay evaluation methodology

Assay evaluates **decision-layer reliability** separately from **document-intelligence reliability**. This makes failures attributable instead of hiding OCR, extraction, rules, and routing inside one blended score.

## Why evaluation is layered

An end-to-end mortgage QC result can fail because of OCR, page classification, field extraction, evidence linking, deterministic rule logic, or package recommendation behavior. Assay therefore reports those layers independently.

---

# 1. Decision-layer golden set

## Scope

The decision-layer benchmark starts from labeled structured package evidence and passes it through the same package-QC case builder and recommendation logic used by the application. It deliberately removes OCR variability so deterministic decision behavior can be tested in isolation.

The current set contains **10 synthetic cases**:

- 1 Ready control
- 6 human-review cases
- 3 deterministic exception cases

The human-review cases cover execution evidence requiring confirmation, missing signature text/location indicators, cross-document borrower mismatch, Note/Closing Disclosure date mismatch, unknown-page routing, and unresolved jurisdiction/profile context.

The deterministic exception cases cover conflicting loan numbers, a Right-to-Cancel deadline before the transaction date, and notary commission expiration before acknowledgment.

## Metric definitions

**Recommendation accuracy** is the fraction of cases where the Assay recommendation matches the independently labeled expected recommendation.

A **false ready** occurs when Assay predicts `Ready for Review` for a case whose expected recommendation is not ready. This is the primary safety metric.

A **false exception** occurs when Assay predicts `Exception Identified` for a case whose expected recommendation is not an exception.

A **missed deterministic exception** occurs when a labeled exception does not produce `Exception Identified`.

For the current evaluator, **automation rate** is the fraction of cases predicted `Ready for Review`. It is an operational metric, not a target to maximize independently of safety.

## Current result

- **10 / 10** recommendation matches
- **0** false-ready packages
- **0** false exceptions
- **0** missed deterministic exceptions

The build includes regression coverage for the zero-false-ready gate.

## Boundary

The 10/10 result does **not** measure OCR, page classification, field extraction, evidence localization, latency, or cost. It is a safety contract for deterministic decision behavior over known evidence, not a production accuracy claim.

---

# 2. Initial PDF / Azure baseline

## Scope

The first end-to-end document-intelligence baseline was captured on **five controlled synthetic digital mortgage packages**, each eight pages long. Every package was generated from version-controlled Assay fixtures and passed through:

```text
PDF
 -> Azure AI Document Intelligence OCR/layout
 -> Assay page classification and segmentation
 -> package/context extraction
 -> document-specific extraction
 -> evidence provenance
 -> deterministic QC
 -> package recommendation
```

The run covered **40 PDF pages** in total.

### Provider configuration

- Provider: Azure AI Document Intelligence
- Model: `prebuilt-layout`
- API version: `2024-11-30`
- Configured tier during the run: F0
- Assay package scope: first 8 pages
- Provider batching: 2 pages per Azure request
- Four sequential Azure chunks per 8-page package

Assay recombines the chunk results and restores original package page numbers before classification, extraction, evidence linking, and QC.

## Scenarios

| Case | Scenario | Expected recommendation | Measured recommendation | Latency |
|---|---|---|---|---:|
| PDF-001 | Clean machine-readable package | Needs Review | Needs Review | 9.81 s |
| PDF-002 | Unknown page in package | Needs Review | Needs Review | 12.36 s |
| PDF-003 | Unresolved jurisdiction/profile | Needs Review | Needs Review | 12.41 s |
| PDF-004 | Conflicting loan identifiers | Exception Identified | Exception Identified | 12.27 s |
| PDF-005 | Impossible date chronology | Exception Identified | Exception Identified | 12.71 s |

PDF-003 intentionally uses an unsupported notary venue while retaining a complete notary field, so it isolates unresolved profile context rather than creating a separate missing-notary-field defect.

## Measured results

### Page classification

- **40 / 40** labeled pages classified as expected
- **100%** page-level accuracy on this controlled set
- the unsupported page in PDF-002 remained explicitly `Unknown document`

### Labeled field extraction

- **50 / 50** labeled fields matched the expected normalized value
- **100%** exact/normalized accuracy on the fields included in this controlled set

The fields include loan number/candidates, borrower names, supported jurisdiction context, Note/Closing dates, Right-to-Cancel dates, and notary dates.

### Evidence provenance

- **44 / 44** expected evidence sources linked to the correct package page
- **44 / 44** expected evidence items were actually present
- **100%** source-page accuracy and evidence completeness on this controlled set

The evaluator does not award credit merely because an evidence object contains the expected page number; meaningful source evidence must be present. This constraint was added after the first live PDF run exposed an optimistic fallback-evidence behavior.

### Recommendation safety

- **5 / 5** package recommendation matches
- **0** false-ready packages
- **0** false exceptions
- **0** missed deterministic exceptions

The same zero-false-ready safety principle used by the decision-layer benchmark therefore also passed on this initial PDF set.

### Latency

- **P50: 12.36 s**
- **P95: 12.71 s**

These are observed end-to-end benchmark-run latencies for the five controlled packages under the configured F0 batching approach. They are not an SLA.

### Cost

Processing cost was **not instrumented** for this run. No cost-per-package number is published rather than fabricating a value from incomplete billing telemetry.

## What the 100% scores do not prove

The initial PDF baseline is deliberately controlled. It uses digital-text synthetic PDFs generated by Assay. It does **not** establish performance on:

- scanned-image documents
- handwriting
- skewed or rotated pages
- blur, low resolution, compression artifacts, or poor contrast
- broad unseen lender/form layouts
- production traffic distributions
- real borrower/customer data
- legal or regulatory validity

The 100% results should be read as: **the current pipeline preserved the expected evidence and routing on five controlled reproducible fixtures**. They should not be generalized beyond that scope.

---

# 3. Provider-limit discovery and architecture response

The first end-to-end PDF run revealed that the configured Azure F0 resource processes at most two PDF pages per analysis request. Assay therefore added a provider-aware batching layer instead of silently analyzing only the first two pages or requiring a paid tier for the portfolio demo.

The batching layer:

1. splits the first eight package pages into provider-sized chunks
2. starts requests sequentially with configurable throttling
3. returns one opaque Assay batch analysis ID to the UI
4. polls each provider operation
5. recombines successful results
6. restores original package page numbers
7. sends the combined result through the existing normalization and QC path

Server-only configuration is documented in `.env.example`.

---

# 4. Next evaluation maturity

The next stress set should intentionally make the document-intelligence problem harder rather than adding more clean digital fixtures. Priorities are:

- controlled blur and lower resolution
- rotated/skewed pages
- rasterized scans
- varied/unseen layouts for each target document type
- OCR spacing and punctuation variation
- ambiguous borrower/name/date evidence
- missing pages and duplicated pages
- broader jurisdiction/profile context
- repeated runs to separate provider throttling from normal latency
- cost telemetry before publishing cost-per-package

As the set expands, report precision/recall by document type and field, evidence-region quality where reliable labels exist, unable-to-process rate, and performance slices by degradation type.

The goal is not one impressive headline percentage. The goal is to make Assay’s **failure modes visible, attributable, and safe to route**.

## Source files

Decision-layer evaluation:

- `src/data/goldenEvaluationCases.js`
- `src/domain/goldenEvaluation.js`
- `test/goldenEvaluation.test.js`

PDF-level evaluation:

- `api/lib/pdfEvaluationFixtures.js`
- `src/domain/pdfEvaluation.js`
- `src/data/pdfEvaluationBaseline.js`
- `test/pdfEvaluation.test.js`
- `test/pdfEvaluationBaseline.test.js`

Provider batching:

- `api/lib/pdfBatchAnalysis.js`
- `test/pdfBatchAnalysis.test.js`

Core recommendation semantics:

- `src/domain/mortgageQc.js`
- `src/domain/packageQcCase.js`
