# Assay implementation status and roadmap

## Product goal

Assay is a working portfolio demonstration of an **AI-assisted post-execution mortgage document QC product**. It shows the operating loop from a synthetic executed PDF through document understanding, deterministic QC, evidence-backed human review, and measured reliability.

**Production:** https://assay-navy.vercel.app  
**Package Intelligence:** https://assay-navy.vercel.app/package  
**Evaluation:** https://assay-navy.vercel.app/evaluation

Assay is intentionally narrow. It is not an LOS, eClosing platform, notarization platform, legal rules engine, or production mortgage system.

## Current production baseline

Delivered today:

- live Azure AI Document Intelligence integration
- combined-PDF analysis for the first 8 pages / 4 MB
- provider-aware Azure page batching and page-number recombination
- page classification and document segmentation
- package inventory and context extraction
- evidence-linked loan, borrower, jurisdiction, date, RTC, and notary signals
- deterministic package and document-specific QC controls
- PDF.js source review and Azure page geometry
- reviewer actions, blockers, overrides, disposition, and audit history
- pinned extractor and fictional sample rule-profile context
- 10-case decision-layer golden set
- 5-package / 40-page initial PDF-Azure baseline
- zero-false-ready safety gate at both evaluation layers

## Primary users

### QC analyst
Reviews exceptions and uncertainty, inspects source pages, records corrections/overrides, returns packages for correction, and records the final disposition.

### QC manager
Would manage queues, SLAs, defect trends, workload, and override patterns. Durable multi-user operations are not yet implemented.

### Policy administrator
Would author, test, approve, version, publish, and retire rule profiles. The prototype demonstrates versioned profile concepts but not a production authoring workflow.

### Governance / audit user
Examines extractor/model context, rule/profile versions, evidence, human actions, exceptions, and measured reliability.

---

# Delivery status

## Sprint 0 — Product correctness

**Status: Completed for prototype baseline**

Delivered:

- post-execution QC boundary and product language
- Fail / Needs Review funding-blocking semantics
- authorized exceptions without erasing original findings
- override permission, reason, evidence, and optional second approval
- pinned evaluation/profile/extractor context
- deterministic recommendation and safety domain functions
- safety-critical regression tests

Production-depth work remaining:

- durable policy/profile registry
- enterprise permissions / approvals
- production legal/control content

## Sprint 1 — Live PDF path

**Status: Completed for the current 8-page portfolio scope**

Delivered:

- synthetic/sample PDF upload
- decoded-size and `%PDF` validation
- Azure `prebuilt-layout` integration
- asynchronous Vercel start/poll APIs
- combined package analysis for the first 8 pages
- provider-aware PDF batching for Azure request limits
- configurable sequential provider throttling
- opaque Assay batch analysis IDs
- recombination of provider chunks with original package page numbers
- page-level document classification and consecutive segmentation
- package inventory
- loan number, borrower, jurisdiction, OCR-quality, and evidence normalization
- candidate fictional profile resolution for TX / CA / FL

Remaining production work:

- encrypted/corrupt PDF handling beyond basic validation
- production object storage / processing records
- distributed throttling and resilient provider retry/backoff
- custom or schema-based mortgage document classification/extraction
- larger package support

## Sprint 2 — Evidence and review

**Status: Major prototype scope completed**

Delivered:

- PDF.js reviewer
- page navigation and Azure evidence polygons
- source-document/page/excerpt provenance
- unified live and sample review experience
- package-to-QC-case handoff
- Note execution date and signature-location signals
- Closing Disclosure date extraction and cross-document date comparison
- Right-to-Cancel content/date signals and chronology control
- notary field/date signals and chronology control
- cross-document borrower comparison
- return-for-correction, override, disposition, and audit history
- provenance correction that prevents missing evidence from inheriting a manufactured page number

Remaining production work:

- field/classification correction connected to re-evaluation
- alternate-evidence selection
- corrected-document resubmission comparison
- durable audit/event persistence

## Sprint 3 — Evaluation and governance

**Status: Initial decision + PDF baselines completed**

### Decision-layer benchmark

Delivered:

- 10 labeled structured-evidence cases
- Ready / Needs Review / Exception coverage
- metrics computed from the production case builder and recommendation engine
- visible `/evaluation` screen
- **10/10** recommendation matches
- **0** false ready
- **0** false exceptions
- **0** missed deterministic exceptions
- build-gated zero-false-ready release test

### Initial PDF / Azure benchmark

Delivered:

- five reproducible, version-controlled synthetic digital eight-page PDFs
- 40 total pages through the live Azure → Assay pipeline
- page-classification scoring
- labeled field-extraction scoring
- evidence source-page and completeness scoring
- final recommendation safety scoring
- measured latency capture
- static baseline data committed to the repo

Measured initial baseline:

- **40/40** page classifications
- **50/50** labeled field values
- **44/44** evidence source pages with evidence present
- **5/5** recommendation matches
- **0** false ready
- **0** false exceptions
- **0** missed deterministic exceptions
- **P50 12.36 s**
- **P95 12.71 s**

Important boundary: these are clean generated digital-text PDFs. The result is an initial pipeline baseline, **not** a claim of 100% production accuracy or generalization.

See [`EVALUATION.md`](EVALUATION.md) for methodology and limitations.

### Next evaluation step — stress the document-intelligence layer

Prioritize:

- rasterized scans
- blur / lower resolution / poor contrast
- rotation and skew
- varied/unseen layouts
- ambiguous names and dates
- duplicated/missing pages
- broader jurisdiction/profile context
- repeated runs to characterize provider throttling
- processing-cost instrumentation

Only after this set is measured should representative classification/extraction thresholds or cost targets be established.

## Sprint 4 — Recruiter presentation

**Status: Strong baseline; polish remains**

Delivered:

- public production deployment
- recruiter-oriented Overview
- sample workspace
- live Package Intelligence
- visible decision + PDF Evaluation
- architecture and limitations in product and README

Remaining:

- optional guided walkthrough
- screenshots / short product GIF in README
- structured accessibility review
- mobile/responsive polish
- browser-level end-to-end test
- shell/navigation cleanup

---

# Current technical design

```text
React / Vite client
  -> Vercel package-analyze API
  -> PDF validation
  -> provider-aware PDF page batching
  -> Azure AI Document Intelligence OCR/layout
  -> provider-result recombination + page rebasing
  -> package normalization + document segmentation
  -> document-specific evidence extraction
  -> deterministic package QC case builder
  -> PDF.js evidence-backed reviewer
  -> human action / disposition / audit context
```

## Decision architecture

Assay intentionally separates:

1. **Document intelligence** — OCR/layout, classification/extraction signals, page geometry.
2. **Normalization + deterministic controls** — transparent QC findings and recommendations.
3. **Human workflow** — inspect evidence, resolve uncertainty, return, override where authorized, and record disposition.

A generic model confidence score is never used as the final business decision.

## Rule/profile direction

The prototype uses deterministic evaluators and fictional versioned sample profiles. The production direction remains reusable evaluator templates in code, policy/profile parameters as versioned data, immutable historical evaluation context, and impact simulation before profile publication.

---

# Evaluation release gate

The primary safety gate remains:

> **Zero false-ready packages in the labeled evaluation set.**

A false exception increases manual work. A false-ready outcome can create materially greater operational, customer, or compliance risk.

Both current evaluation layers pass this gate, but the PDF set is still too small and clean to support a production generalization claim.

---

# Roadmap after the initial PDF baseline

## Reliability / document intelligence

- degraded-PDF stress set
- layout diversity
- schema-based extraction
- precision/recall by document type and field
- evidence-region evaluation where labels are stable
- provider retry/backoff telemetry
- latency distribution over repeated runs
- cost telemetry and provider comparison

## Operational depth

- durable cases and audit storage
- assignment / SLA
- correction and resubmission comparison
- batch intake / API output
- role-based permissions
- second-level approvals

## Policy operations

- rule-profile draft / test / approve / publish / retire
- version comparison
- impact simulation
- rollback strategy

---

# Explicit non-goals for the portfolio version

- building an OCR foundation model
- reproducing an entire LOS, eClosing, or notarization suite
- using real borrower/customer data
- encoding real legal interpretations of state law
- claiming regulatory compliance
- implementing full enterprise identity, tenancy, retention, or vendor management

## Recruiter demo sequence

1. Explain the downstream post-execution QC problem on Overview.
2. Show sample QC cases and the reviewer model.
3. Open Package Intelligence and run a synthetic package.
4. Show package segmentation, extracted context, and profile resolution.
5. Open a finding against source PDF evidence.
6. Explain human-review boundaries for signature/notary execution.
7. Show deterministic chronology/consistency controls.
8. Open Evaluation and compare decision-layer vs PDF-level metrics.
9. Call out the zero-false-ready gate and the controlled-PDF limitation.
10. Close with the next stress-set plan and architecture tradeoffs.
