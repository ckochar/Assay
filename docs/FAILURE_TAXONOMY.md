# Assay AI failure taxonomy

Assay evaluates AI system reliability by **where a failure occurs and whether the product fails safely**, not by one aggregate accuracy number.

The operating model is:

```text
PDF / image quality
    -> provider OCR/layout
    -> normalization / provider-shape adapter
    -> page classification
    -> field extraction
    -> evidence provenance
    -> policy/profile context
    -> deterministic QC
    -> human review / disposition
```

A failure at one layer should not silently become confidence at the next layer.

## Primary safety principle

> **A system that cannot establish sufficient evidence must route to review or stop; it must not manufacture a ready recommendation.**

The portfolio release gate remains zero false-ready packages in labeled evaluation sets.

## Failure classes

| ID | Layer | Failure | Expected safe behavior |
|---|---|---|---|
| `PROVIDER-THROTTLE` | Provider | Azure 429 / queue delay / provider unavailability | bounded retry; stop/defer if unresolved |
| `OCR-NO-TEXT` | Document intelligence | no usable recognized text | review / unable to process |
| `OCR-PARTIAL-COVERAGE` | Document intelligence | only some pages have usable OCR | review; package evidence is incomplete |
| `OCR-CONFIDENCE-COVERAGE-MISMATCH` | Document intelligence | average confidence appears acceptable but text coverage is poor | ignore confidence as a standalone automation signal; require coverage/evidence checks |
| `OCR-SHAPE-VARIATION` | Integration | provider returns words but not expected line structure | tested adapter; otherwise review |
| `CLASS-UNCERTAIN` | Classification | unknown or low-confidence document type | review; inventory cannot be treated as complete |
| `EXTRACT-MISSING` | Extraction | labeled field missing / unusable | review |
| `EVIDENCE-MISSING` | Evidence | value has no trustworthy page-linked provenance | do not award evidence completeness; review |
| `PROFILE-UNRESOLVED` | Policy context | jurisdiction/profile cannot be safely resolved | review; do not invent requirements |
| `REQUIRED-DOC-MISSING` | Deterministic QC | profile-configured required document confidently absent | exception; classification uncertainty downgrades to review |
| `CROSS-DOC-CONFLICT` | Deterministic QC | normalized evidence conflicts across documents | review or explicit deterministic exception according to rule |
| `IMPOSSIBLE-CHRONOLOGY` | Deterministic QC | complete date evidence violates chronology | exception |
| `HUMAN-JUDGMENT` | Human review | evidence exists but legal/visual judgment remains necessary | review; AI assists evidence location only |

## Raster learning v1

Two image-only eight-page raster packages were evaluated through Azure F0 after Assay added a word-to-line OCR fallback.

Measured post-fix result:

- **16 pages analyzed**
- **0 / 16 page classifications correct**
- **0 / 20 labeled fields correct**
- **0 / 18 expected evidence locations recovered**
- **2 / 2 final recommendations matched `Needs Review`**
- **0 false-ready packages**
- RASTER-001 average Azure word confidence: approximately **0.860**
- RASTER-002 average Azure word confidence: approximately **0.933**

The word fallback therefore **did not fix the real raster path**. This is retained as a product learning, not hidden as a failed experiment.

### What the result tells us

The current evidence does **not** support the claim that missing `page.lines` was the full root cause. The real provider response still produced medium average word confidence but insufficient usable text for Assay's document signals.

The key follow-up question is now:

> **How much text did Azure actually recognize on each page, and in what structure?**

Average confidence answers "how confident was Azure in the words it returned?" It does not answer "how much of the document did Azure successfully recognize?"

## Required diagnostics before another raster fix

For every document-intelligence evaluation run, capture at minimum:

- page count
- recognized word count
- recognized line count
- text-character count
- pages with words
- pages with lines
- pages with any text
- word-coverage-by-page ratio
- line-availability-by-page ratio
- text-availability-by-page ratio
- words per page
- average / min / max word confidence
- provider/model/API version
- latency and pages processed

These diagnostics are observability signals, not business decisions.

## Product-management rule for future fixes

Do not change thresholds, classifiers, or extraction heuristics merely because an aggregate benchmark failed.

Use this sequence:

1. Identify the failing layer.
2. Measure the provider/output evidence at that layer.
3. Determine whether the failure is model quality, coverage, response-shape integration, normalization, or rule logic.
4. Make the smallest targeted change.
5. Add a regression test.
6. Re-run only the minimum live cases needed to answer the question.
7. Preserve safe routing throughout.

This keeps Assay focused on **evaluated AI system behavior** rather than chasing headline accuracy.
