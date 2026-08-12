# Assay implementation status and roadmap

## Product goal

Assay is a working portfolio demonstration of an **AI-assisted post-execution mortgage document QC product**. The product is designed to show the full operating loop from a synthetic executed PDF through document understanding, deterministic QC, evidence-backed human review, and measured reliability.

The product is intentionally narrow. It is not an LOS, eClosing platform, notarization platform, legal rules engine, or production mortgage system.

## Current production baseline

**Production:** https://assay-navy.vercel.app  
**Package Intelligence:** https://assay-navy.vercel.app/package  
**Evaluation:** https://assay-navy.vercel.app/evaluation

As of the current production baseline, Assay includes:

- live Azure AI Document Intelligence integration
- combined-PDF analysis for the first 8 pages / 4 MB
- page classification and document segmentation
- package inventory and context extraction
- evidence-linked loan, borrower, jurisdiction, date, RTC, and notary signals
- deterministic package and document-specific QC controls
- source PDF review with PDF.js and Azure page geometry
- reviewer actions, funding blockers, overrides, final disposition, and audit history
- pinned extractor and sample rule-profile context
- a 10-case decision-layer golden set
- a zero-false-ready build gate
- 30 automated tests in the production build

## Primary users

### QC analyst

Reviews exceptions and uncertain evidence, inspects source pages, records corrections or overrides, returns packages for correction, and records the final disposition.

### QC manager

Would manage queues, service levels, defect trends, reviewer workload, and override patterns. The current prototype demonstrates the case-review model but does not yet implement durable multi-user operations.

### Policy administrator

Would author, test, approve, version, publish, and retire rule profiles and reusable deterministic evaluators. The prototype demonstrates pinned profile/version concepts but not a production authoring workflow.

### Governance or audit user

Reviews model/extractor context, rule/profile versions, evidence, human actions, exceptions, and evaluation results. The prototype includes a governance view and evaluation traceability but not enterprise governance storage.

## Workflow boundary

Assay sits **after document execution**. Representative intake channels are:

- Remote online notarization
- Mobile notary
- QC-only intake

The intake channel is workflow metadata. Assay's core responsibility remains the same: understand the received package, evaluate available evidence, route uncertainty, and support a human disposition.

## Representative package

The current sample package uses representative mortgage document types:

- Promissory Note
- Mortgage or Deed of Trust
- Closing Disclosure
- Notice of Right to Cancel
- Occupancy Affidavit
- Signature/Name Affidavit
- Notary Acknowledgment

All sample rules, jurisdictions, documents, and loan data are fictional portfolio content.

---

# Delivery status

## Sprint 0 — Product correctness

**Status: Completed for prototype baseline**

Delivered:

- clarified post-execution QC product boundary
- separated extraction confidence from business recommendation
- implemented Fail / Needs Review funding-blocking semantics
- implemented authorized-exception behavior without erasing the original finding
- added override permission, reason, evidence, and optional second-approval validation
- pinned rule-profile and extractor evaluation context
- moved core recommendation and safety logic into deterministic domain functions
- added automated tests for safety-critical decision behavior

Remaining production work:

- durable policy/profile registry
- enterprise permissions and approval workflow
- production legal/control content

## Sprint 1 — Live PDF path

**Status: Substantially completed for portfolio prototype**

Delivered:

- synthetic/sample PDF upload
- decoded-size and `%PDF` validation
- document hash support in the review context
- Azure AI Document Intelligence integration using `prebuilt-layout`
- asynchronous start/poll APIs on Vercel Functions
- first-two-page Promissory Note live flow
- combined-package live flow for pages 1–8
- page-level mortgage document classification
- consecutive-page document segmentation
- package inventory
- loan number, borrower, jurisdiction, OCR-quality, and evidence normalization
- candidate sample profile resolution for TX / CA / FL
- best-effort process-local analysis throttling

Remaining production work:

- encrypted/corrupt PDF handling beyond the current basic validation path
- production object storage / processing records
- durable distributed throttling
- custom mortgage document classifier or schema-based classification
- larger package support

## Sprint 2 — Evidence and review

**Status: Major prototype scope completed**

Delivered:

- PDF.js reviewer
- source page navigation
- Azure evidence polygon support
- source-document/page/excerpt provenance
- unified review experience for sample and live cases
- package-to-QC-case handoff
- Promissory Note execution-date extraction
- signature text/location indicators with mandatory human confirmation semantics
- Closing Disclosure closing-date extraction
- Note / Closing Disclosure date comparison
- Right-to-Cancel title/content and date signals
- RTC chronology control
- notary venue / acknowledgment / notary indicator / commission-expiration signals
- notary date-sequence control
- cross-document borrower-name comparison
- return-for-correction flow
- override workflow
- final disposition and audit history

Remaining production work:

- field-level correction UI connected back into re-evaluation
- document-classification correction
- alternate-evidence selection
- corrected-document resubmission and revision comparison
- durable audit/event persistence

## Sprint 3 — Evaluation and governance

**Status: Decision-layer evaluation completed; PDF-level evaluation next**

Delivered:

- labeled 10-case synthetic decision-layer golden set
- Ready / Needs Review / Exception coverage
- evaluation computed from the actual package case builder and recommendation engine
- visible `/evaluation` screen
- current result: 10/10 expected recommendation matches
- zero false-ready packages
- zero false exceptions
- zero missed deterministic exceptions
- automated release test that fails if the zero-false-ready gate regresses
- governance UI demonstrating version, override, and reliability concepts

Important limitation:

The current golden set starts from labeled structured evidence. It **does not measure Azure OCR, page classification, field extraction, or evidence localization accuracy**.

### Next: PDF-level evaluation

Build a labeled set of synthetic PDFs and run every case through the actual Azure path.

Measure separately:

- document/page classification accuracy
- field extraction precision, recall, and F1
- evidence-page accuracy
- evidence-region / polygon localization accuracy where meaningful
- OCR-related review-routing behavior
- end-to-end false-ready rate
- false-exception rate
- unable-to-process rate
- P50 / P95 processing latency
- Azure pages and estimated processing cost per package

See [`EVALUATION.md`](EVALUATION.md) for the evaluation methodology.

## Sprint 4 — Recruiter presentation

**Status: Partially completed**

Delivered:

- public production deployment
- recruiter-oriented Overview
- sample-case exploration
- live Package Intelligence entry point
- visible Evaluation tab
- architecture and prototype-scope explanation in product and README

Remaining:

- optional guided walkthrough / demo mode
- screenshots or short product GIF in README
- structured accessibility review
- mobile/responsive polish
- browser-level end-to-end test for the recruiter path
- final cleanup of shell/navigation technical debt

---

# Current technical design

```text
React / Vite client
  -> Vercel package-analyze API
  -> PDF validation and request guard
  -> Azure AI Document Intelligence (OCR/layout)
  -> package/page normalization
  -> mortgage document segmentation
  -> document-specific evidence extraction
  -> deterministic package QC case builder
  -> PDF.js evidence-backed reviewer
  -> human action / disposition / audit context
```

## Azure integration

The current provider is Azure AI Document Intelligence using the `prebuilt-layout` model and API version `2024-11-30`.

The current implementation preserves page geometry and source regions so the reviewer can connect a finding back to the analyzed document.

A future production architecture should keep document intelligence behind a provider contract so Azure can be compared with other OCR/document-AI systems without coupling the business rules to one vendor.

## Decision architecture

Assay intentionally separates three layers:

1. **Document intelligence** — OCR/layout, classification signals, extraction signals, page geometry.
2. **Normalization and deterministic controls** — translate evidence into transparent QC findings and recommendations.
3. **Human workflow** — inspect evidence, resolve uncertainty, return, override where authorized, and record disposition.

The system does not use a generic model confidence score as the final business decision.

## Rule/profile direction

The prototype uses deterministic evaluators and fictional versioned sample profiles.

The production direction is:

- reusable deterministic evaluator templates in code
- policy parameters and rule profiles as versioned data
- profile IDs, versions, effective dates, approval status, and test cases
- immutable historical evaluation context
- profile impact simulation before publish

---

# Evaluation release gate

The primary safety gate is:

> **Zero false-ready packages in the labeled evaluation set.**

A false exception increases manual work. A false-ready outcome can create materially greater operational, customer, or compliance risk.

The decision-layer golden set is already build-gated. The next milestone extends the same principle to **end-to-end PDF analysis**.

---

# Roadmap after PDF-level evaluation

## Operational depth

- durable cases and audit storage
- ownership / assignment / SLA
- correction requests and resubmission comparison
- batch intake and API output
- role-based permissions
- second-level approval workflows

## Policy operations

- rule-profile draft / test / approve / publish / retire
- version comparison
- impact simulation against historical synthetic cases
- rollback strategy

## Document intelligence depth

- stronger document-boundary classifier
- schema-based extraction by document type
- more robust borrower/name normalization
- missing-document controls driven by explicit profile configuration
- evidence-quality calibration by field and risk tier

## Reliability and observability

- PDF-level golden set expansion
- latency and cost telemetry
- extraction-error analysis
- model/provider comparison
- false-ready regression dashboard
- drift and threshold review process

---

# Explicit non-goals for the portfolio version

- building an OCR foundation model
- reproducing an entire LOS, eClosing, or notarization suite
- using real borrower/customer data
- encoding real legal interpretations of state notary or rescission law
- claiming regulatory compliance
- implementing full enterprise identity, tenancy, retention, or vendor management

These should remain clearly labeled as production requirements or future architecture rather than represented as completed capabilities.

## Recruiter demo sequence

1. Open the Overview and explain the downstream post-execution QC problem.
2. Show the sample QC Dashboard to establish the reviewer workflow.
3. Open Package Intelligence and generate or upload a synthetic package.
4. Run the package through Azure.
5. Show document inventory, extracted context, and profile resolution.
6. Create the QC case and open a finding against source evidence.
7. Explain why signature/notary execution remains human-reviewed.
8. Show deterministic chronology or consistency controls.
9. Show the Evaluation screen and the zero-false-ready release gate.
10. Close with the separation between current decision-layer evaluation and the upcoming PDF-level benchmark.
