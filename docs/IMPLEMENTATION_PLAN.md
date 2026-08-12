# Assay implementation status and roadmap

## Product goal

Assay is a working portfolio demonstration of an **AI-assisted post-execution mortgage document QC product**. It shows the operating loop from a synthetic executed PDF through document understanding, deterministic QC, evidence-backed human review, and measured reliability.

**Production:** https://assay-navy.vercel.app  
**Package Intelligence:** https://assay-navy.vercel.app/package  
**Evaluation:** https://assay-navy.vercel.app/evaluation

Assay is intentionally narrow. It is not an LOS, eClosing platform, notarization platform, legal rules engine, or production mortgage system.

## Portfolio cost constraint

The portfolio is designed to stay within **free service tiers**. The current Azure document-intelligence path remains on F0 and Vercel remains on the free/Hobby plan. Reliability work should stop/defer when a free allowance or platform limit is reached rather than depend on a paid upgrade.

## Current production baseline

Delivered today:

- live Azure AI Document Intelligence integration
- combined-PDF analysis for the first 8 pages / 4 MB
- provider-aware Azure page batching and page-number recombination
- page classification and document segmentation
- package inventory and context extraction
- evidence-linked loan, borrower, jurisdiction, date, RTC, and notary signals
- deterministic package and document-specific QC controls
- fictional profile-configured required-document inventory for the QC-only sample flow
- PDF.js source review and Azure page geometry
- reviewer actions, blockers, overrides, disposition, and audit history
- pinned extractor and fictional sample rule-profile context
- 10-case decision-layer golden set
- 5-package / 40-page initial PDF-Azure baseline
- 3-package / 24-page controlled digital stress baseline
- zero-false-ready safety gate across the published evaluation slices
- **50 automated tests** in the current publication branch

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
- provider-aware PDF batching for Azure F0 request limits
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
- profile-driven `PKG-DOC-REQ-001` inventory control for fictional QC-only sample profiles
- fail-safe required-document routing: confident absence → Fail; classification uncertainty → Needs Review; unresolved profile → no invented requirement

Remaining production work:

- field/classification correction connected to re-evaluation
- alternate-evidence selection
- corrected-document resubmission comparison
- durable audit/event persistence
- configurable required-document policies for additional intake channels only when backed by explicit sample profile data

## Sprint 3 — Evaluation and governance

**Status: Decision baseline + clean PDF baseline + digital stress v1 completed**

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

### Digital PDF stress set v1

Delivered:

- three reproducible eight-page stress fixtures
- mixed 90°/270° PDF rotation metadata
- compact, lighter two-column digital typography
- duplicated Closing Disclosure / missing configured Notary package structure
- static measured stress baseline committed to the repo
- visible stress section on `/evaluation`

Final measured stress baseline:

- **24/24** page classifications
- **30/30** labeled field values
- **25/25** evidence source pages with evidence present
- **3/3** recommendation matches
- **0** false ready
- **0** false exceptions
- **0** missed deterministic exceptions
- **P50 12.36 s**
- **P95 12.52 s**

### Product learning from stress v1

The structural stress case correctly removed the Notary document upstream, but the first diagnostic run exposed that Assay did not yet have a profile-driven missing-document inventory rule. The benchmark therefore caused a product change rather than simply producing another score.

Delivered response:

- added `PKG-DOC-REQ-001`
- made required-document expectations profile/channel data rather than global mortgage assumptions
- versioned the fictional sample profiles forward: TX 2.2.0, CA 1.5.0, FL 3.1.0
- added regression coverage for confident absence, classification uncertainty, and unresolved profile behavior
- re-ran the structural case and obtained the expected `Exception Identified`

The initial pre-fix structural run is retained conceptually as a diagnostic learning, not counted as the final published benchmark row.

See [`EVALUATION.md`](EVALUATION.md) for methodology and limitations.

### Next evaluation step — true raster / scan stress

The next reliability set should move beyond digital-PDF manipulation. Prioritize a **small free-tier-safe** set covering:

- rasterized low-resolution pages
- controlled image blur/noise
- image-level skew and rotation
- scan compression / poor raster contrast
- varied/unseen layouts
- ambiguous names/dates
- missing/duplicated pages under classification uncertainty
- evidence excerpt/region quality beyond source-page correctness

Repeated Azure runs should be used only when they answer a specific reliability question. Cost telemetry should only be added if it can be done without introducing billable usage.

## Sprint 4 — Recruiter presentation

**Status: Strong baseline; polish remains**

Delivered:

- public production deployment
- recruiter-oriented Overview
- sample workspace
- live Package Intelligence
- visible decision + PDF + digital-stress Evaluation
- architecture and limitations in product and README
- benchmark-driven product-change story (`PKG-DOC-REQ-001`)

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
       -> versioned profile context
       -> profile-configured required-document inventory
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

The current required-document inventory is intentionally configured only for the fictional **QC-only** sample flow. It must not be interpreted as a universal mortgage/legal requirement or silently extended to RON/mobile-notary channels.

---

# Evaluation release gate

The primary safety gate remains:

> **Zero false-ready packages in the labeled evaluation set.**

A false exception increases manual work. A false-ready outcome can create materially greater operational, customer, or compliance risk.

The decision, controlled-PDF, and digital-stress published slices all pass this gate, but the document-intelligence sets remain too small and synthetic to support a production generalization claim.

---

# Roadmap after digital stress v1

## Reliability / document intelligence

- true raster/scanned-PDF stress set
- layout diversity
- schema-based extraction
- precision/recall by document type and field
- evidence-region/excerpt-quality evaluation where labels are stable
- provider retry/backoff telemetry
- repeated-run latency only when useful
- free-safe cost instrumentation if feasible

## Free-tier infrastructure hygiene

- keep Azure Document Intelligence on F0
- keep Vercel on the free/Hobby plan
- avoid adding serverless entrypoints that exceed the free project function limit
- consider moving shared server helpers out of `api/` if needed to create free function-count headroom
- stop/defer benchmark work before any paid upgrade is required

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
- requiring a paid cloud tier for the portfolio demo

## Recruiter demo sequence

1. Explain the downstream post-execution QC problem on Overview.
2. Show sample QC cases and the reviewer model.
3. Open Package Intelligence and run a synthetic package.
4. Show package segmentation, extracted context, and profile resolution.
5. Open a finding against source PDF evidence.
6. Explain human-review boundaries for signature/notary execution.
7. Show deterministic chronology/consistency controls.
8. Open Evaluation and compare decision-layer, clean PDF, and digital-stress metrics.
9. Show how STRESS-003 exposed the missing-document rule gap and led to a versioned profile/rule change.
10. Close with the zero-false-ready gate, synthetic-data boundaries, and next raster-scan stress step.
